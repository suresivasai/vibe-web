from __future__ import annotations

import os
from typing import Optional

import httpx
from fastapi import HTTPException, Request, status

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def _enabled() -> bool:
    return os.getenv("TURNSTILE_ENABLED", "false").lower() == "true"


async def verify_turnstile(request: Request, token: Optional[str]) -> None:
    """Fail closed when Turnstile is explicitly enabled; no-op otherwise."""
    if not _enabled():
        return

    secret = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Security verification is not configured.",
        )
    if not token or len(token) > 2048:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete the security verification.",
        )

    remote_ip = request.client.host if request.client else None
    payload = {"secret": secret, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(SITEVERIFY_URL, json=payload)
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Security verification is temporarily unavailable. Please try again.",
        )

    expected_action = os.getenv("TURNSTILE_ACTION", "login").strip()
    expected_hostname = os.getenv("TURNSTILE_HOSTNAME", "").strip()
    if expected_action and result.get("action") and result.get("action") != expected_action:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security verification failed. Please try again.",
        )
    if expected_hostname and result.get("hostname") and result.get("hostname") != expected_hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security verification failed. Please try again.",
        )

    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security verification failed. Please try again.",
        )
