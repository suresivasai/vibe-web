# backend/app/routers/blocks.py
# Purpose: Block / unblock users (blocked users never match)
# Iteration: 5–7 (gap fill)

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.models import Block, User
from app.schemas.schemas import BlockCreate, BlockResponse, MessageResponse, UserPublic

router = APIRouter()


@router.get("", response_model=list[UserPublic])
async def list_blocked(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .join(Block, Block.blocked_id == User.id)
        .where(Block.blocker_id == current_user.id)
    )
    users = result.scalars().all()
    return [UserPublic.model_validate(u) for u in users]


@router.post("", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
async def block_user(
    body: BlockCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.blocked_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    existing = await db.execute(
        select(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == body.blocked_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already blocked")

    row = Block(blocker_id=current_user.id, blocked_id=body.blocked_id)
    db.add(row)
    await db.flush()
    await db.refresh(row)
    return BlockResponse.model_validate(row)


@router.delete("/{blocked_id}", response_model=MessageResponse)
async def unblock_user(
    blocked_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        delete(Block).where(
            Block.blocker_id == current_user.id,
            Block.blocked_id == blocked_id,
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    await db.flush()
    return MessageResponse(message="User unblocked")
