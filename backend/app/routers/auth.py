# backend/app/routers/auth.py
# Purpose: Google OAuth login (via Supabase or raw Google token), token refresh, logout
# Iteration: 2 (fixed for Supabase provider_token + Google userinfo)

import hashlib
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from passlib.context import CryptContext

from app.database import get_db, settings
from app.middleware.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.middleware.rate_limit import RATE_LIMITS, limiter
from app.models.models import RefreshToken, User
from app.schemas.schemas import (
    GoogleAuthRequest,
    LocalRegisterRequest,
    LocalLoginRequest,
    MessageResponse,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()


async def resolve_google_identity(token: str) -> dict:
    """
    Resolve email/name/picture from either:
    - Google ID token (tokeninfo)
    - Google access token / Supabase provider_token (userinfo)
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1) Try as Google ID token
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": token},
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email"):
                return {
                    "email": data["email"].lower().strip(),
                    "name": data.get("name") or data.get("email", "").split("@")[0],
                    "picture": data.get("picture"),
                    "sub": data.get("sub"),
                }

        # 2) Try as Google OAuth access token (Supabase session.provider_token)
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email"):
                return {
                    "email": data["email"].lower().strip(),
                    "name": data.get("name") or data.get("email", "").split("@")[0],
                    "picture": data.get("picture"),
                    "sub": data.get("sub"),
                }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Google token — could not verify identity",
    )


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/google", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["login"])
async def google_login(
    request: Request,
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a Google ID token OR Google access token (Supabase provider_token)
    for Spark access + refresh tokens. Creates profile on first login.
    Rate limited: 5/min per IP.
    """
    claims = await resolve_google_identity(body.id_token)
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
            gender="other",  # onboarding will set real gender
        )
        db.add(user)
        await db.flush()
    else:
        if avatar_url:
            user.avatar_url = avatar_url
        user.last_seen = datetime.now(timezone.utc)
        if user.is_banned:
            until = user.ban_until.isoformat() if user.ban_until else None
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "banned", "reason": "Account banned", "until": until},
            )

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    token_row = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        used=False,
    )
    db.add(token_row)
    await db.flush()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["login"])
async def local_register(
    request: Request,
    body: LocalRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    email = body.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_password = pwd_context.hash(body.password)
    user = User(
        email=email,
        password_hash=hashed_password,
        display_name=body.display_name,
        gender="other",
    )
    db.add(user)
    await db.flush()

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    token_row = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        used=False,
    )
    db.add(token_row)
    await db.flush()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["login"])
async def local_login(
    request: Request,
    body: LocalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    email = body.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.last_seen = datetime.now(timezone.utc)
    if user.is_banned:
        until = user.ban_until.isoformat() if user.ban_until else None
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "banned", "reason": "Account banned", "until": until},
        )

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    token_row = RefreshToken(
        user_id=user.id,
        token_hash=_hash_token(refresh),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        used=False,
    )
    db.add(token_row)
    await db.flush()

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Rotate refresh token: old invalidated, new pair issued."""
    try:
        payload = decode_token(body.refresh_token)
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
    token_hash = _hash_token(body.refresh_token)

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

    if stored.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
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

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(new_refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            used=False,
        )
    )
    await db.flush()

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.delete("/logout", response_model=MessageResponse)
async def logout(
    body: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token_hash = _hash_token(body.refresh_token)
    await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == current_user.id,
        )
        .values(used=True)
    )
    await db.flush()
    return MessageResponse(message="Logged out successfully")
