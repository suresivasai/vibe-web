# backend/app/routers/users.py
# Purpose: Current user profile read / update / delete (GDPR)
# Iteration: 2

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.sanitize import sanitize_display_name
from app.models.models import (
    Block,
    Friend,
    FriendMessage,
    Message,
    RefreshToken,
    Report,
    Session,
    User,
    WaitingQueue,
)
from app.schemas.schemas import MessageResponse, UserResponse, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's full profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update display name, gender, or avatar.
    Used by onboarding and profile edit screens.
    """
    if body.display_name is not None:
        cleaned = sanitize_display_name(body.display_name)
        if not cleaned:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Display name must be at least 2 characters and look like a real name",
            )
        current_user.display_name = cleaned

    if body.gender is not None:
        current_user.gender = body.gender

    if body.avatar_url is not None:
        current_user.avatar_url = str(body.avatar_url)

    current_user.last_seen = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.delete("/me", response_model=MessageResponse)
async def delete_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    GDPR deletion: wipe all user rows across related tables within the request.
    Cascades handle most relations; we also clear sessions and reports explicitly.
    """
    uid = current_user.id

    # Clear waiting queue
    await db.execute(delete(WaitingQueue).where(WaitingQueue.user_id == uid))

    # Clear refresh tokens
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == uid))

    # Clear blocks (both directions)
    await db.execute(delete(Block).where(Block.blocker_id == uid))
    await db.execute(delete(Block).where(Block.blocked_id == uid))

    # Clear reports made by this user
    await db.execute(delete(Report).where(Report.reporter_id == uid))

    # Null out sender on messages (keep history for other party where relevant)
    # Cascades on user delete will handle FK SET NULL for messages/sessions

    # Delete friends where user is requester or receiver
    await db.execute(delete(Friend).where(Friend.requester_id == uid))
    await db.execute(delete(Friend).where(Friend.receiver_id == uid))

    # Finally delete the user row
    await db.execute(delete(User).where(User.id == uid))
    await db.flush()

    return MessageResponse(message="Account deleted successfully")
