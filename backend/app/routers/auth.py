# backend/app/routers/auth.py
# Purpose: Auth endpoints — thin layer over AuthService
# Iteration: 3 (service extraction + robust Google)

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import RATE_LIMITS, limiter
from app.models.models import User
from app.schemas.schemas import (
    GoogleAuthRequest,
    LocalLoginRequest,
    LocalRegisterRequest,
    MessageResponse,
    RefreshRequest,
    TokenResponse,
)
from app.services import auth_service
from app.services.captcha import verify_turnstile

router = APIRouter()


@router.post("/google", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["login"])
async def google_login(
    request: Request,
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange Google ID / access token for Vibe JWTs. Creates profile on first login."""
    await verify_turnstile(request, body.captcha_token)
    return await auth_service.login_with_google(db, body.id_token)


@router.post("/register", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["login"])
async def local_register(
    request: Request,
    body: LocalRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    await verify_turnstile(request, body.captcha_token)
    return await auth_service.register_local(
        db, body.email, body.password, body.display_name
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit(RATE_LIMITS["login"])
async def local_login(
    request: Request,
    body: LocalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    await verify_turnstile(request, body.captcha_token)
    return await auth_service.login_local(db, body.email, body.password)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    return await auth_service.refresh_tokens(db, body.refresh_token)


@router.delete("/logout", response_model=MessageResponse)
async def logout(
    body: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await auth_service.logout(db, current_user.id, body.refresh_token)
    return MessageResponse(message="Logged out successfully")
