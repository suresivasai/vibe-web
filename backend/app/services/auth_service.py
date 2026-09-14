# backend/app/services/auth_service.py
# Purpose: Centralized auth business logic (Google, local, tokens)
# Production-level: single place for identity resolution, user upsert, token issuance

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.models import RefreshToken, User
from app.schemas.schemas import TokenResponse, UserResponse

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def resolve_google_identity(token: str) -> dict:
    """Resolve email/name/picture from Google ID token or access token."""
    if not token or not isinstance(token, str) or len(token) < 20:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Google token",
        )

    async with httpx.AsyncClient(timeout=12.0) as client:
        # 1) Google ID token
        try:
            resp = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": token},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("email"):
                    return {
                        "email": data["email"].lower().strip(),
                        "name": data.get("name") or data["email"].split("@")[0],
                        "picture": data.get("picture"),
                        "sub": data.get("sub"),
                    }
        except Exception:
            pass

        # 2) Google access token (Supabase provider_token)
        try:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("email"):
                    return {
                        "email": data["email"].lower().strip(),
                        "name": data.get("name") or data["email"].split("@")[0],
                        "picture": data.get("picture"),
                        "sub": data.get("sub"),
                    }
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Google token — could not verify identity. Try signing in again.",
    )


async def _issue_tokens(db: AsyncSession, user: User) -> TokenResponse:
    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            used=False,
        )
    )
    await db.flush()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


def _assert_not_banned(user: User) -> None:
    if user.is_banned:
        until = user.ban_until.isoformat() if user.ban_until else None
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "banned", "reason": "Account banned", "until": until},
        )


async def login_with_google(db: AsyncSession, id_token: str) -> TokenResponse:
    claims = await resolve_google_identity(id_token)
    email = claims["email"]
    display_name = (claims.get("name") or email.split("@")[0])[:30]
    avatar_url = claims.get("picture")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
            gender="other",
        )
        db.add(user)
        await db.flush()
    else:
        if avatar_url:
            user.avatar_url = avatar_url
        user.last_seen = datetime.now(timezone.utc)
        _assert_not_banned(user)

    return await _issue_tokens(db, user)


async def register_local(
    db: AsyncSession,
    email: str,
    password: str,
    display_name: str,
) -> TokenResponse:
    email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=email,
        password_hash=pwd_context.hash(password),
        display_name=display_name.strip()[:30],
        gender="other",
    )
    db.add(user)
    await db.flush()
    return await _issue_tokens(db, user)


async def login_local(db: AsyncSession, email: str, password: str) -> TokenResponse:
    email = email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not pwd_context.verify(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_seen = datetime.now(timezone.utc)
    _assert_not_banned(user)
    return await _issue_tokens(db, user)


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    try:
        payload = decode_token(refresh_token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user_id = payload.get("sub")
    token_hash = _hash_token(refresh_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.used == False,  # noqa: E712
        )
    )
    stored = result.scalar_one_or_none()
    if stored is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token already used or revoked",
        )

    expires = stored.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    stored.used = True
    await db.flush()

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or banned",
        )

    return await _issue_tokens(db, user)


async def logout(db: AsyncSession, user_id: UUID, refresh_token: str) -> None:
    token_hash = _hash_token(refresh_token)
    await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
        )
        .values(used=True)
    )
    await db.flush()
