# backend/app/routers/match.py
# Purpose: HTTP endpoints for join/leave queue and skip
# Simplified: pure FIFO matching

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import RATE_LIMITS, limiter
from app.models.models import User
from app.schemas.schemas import MessageResponse
from app.services import match_engine

router = APIRouter()


@router.post("/join", response_model=MessageResponse)
@limiter.limit(RATE_LIMITS["match_join"])
async def join_queue(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add current user to the waiting queue (FIFO)."""
    if current_user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Banned")
    await match_engine.add_to_queue(db, current_user)
    return MessageResponse(message="Joined queue")


@router.delete("/leave", response_model=MessageResponse)
async def leave_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await match_engine.remove_from_queue(db, current_user.id)
    return MessageResponse(message="Left queue")


@router.post("/skip", response_model=MessageResponse)
async def skip_session(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End current session (skip). session_id expected in body."""
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=422, detail="session_id required")
    session = await match_engine.end_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return MessageResponse(message="Session ended")
