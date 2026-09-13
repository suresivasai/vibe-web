# backend/app/services/match_engine.py
# Purpose: Simple FIFO matching — no gender, no interests. First in queue wins.
# Respects blocks and bans only.

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Block, Session, User, WaitingQueue


async def find_match(db: AsyncSession, user: User) -> Optional[tuple[Session, User]]:
    """
    Pure FIFO match for `user`.

    Rules:
    - Oldest person in the queue first (joined_at ASC)
    - Never match yourself
    - Never match banned users
    - Never match blocked users (either direction)
    - No gender filter, no interest scoring
    """
    # Users this person blocked or who blocked them
    blocked_q = await db.execute(
        select(Block.blocked_id).where(Block.blocker_id == user.id)
    )
    blocked_ids = {row[0] for row in blocked_q.all()}
    blocked_by_q = await db.execute(
        select(Block.blocker_id).where(Block.blocked_id == user.id)
    )
    blocked_ids |= {row[0] for row in blocked_by_q.all()}

    # Oldest candidates first, lock to reduce race conditions
    q = (
        select(WaitingQueue, User)
        .join(User, WaitingQueue.user_id == User.id)
        .where(
            WaitingQueue.user_id != user.id,
            User.is_banned == False,  # noqa: E712
        )
        .order_by(WaitingQueue.joined_at.asc())
        .with_for_update(skip_locked=True)
    )
    result = await db.execute(q)
    rows = result.all()

    partner = None
    for wq, candidate in rows:
        if candidate.id in blocked_ids:
            continue
        partner = candidate
        break

    if partner is None:
        return None

    # Remove both from queue
    del_result = await db.execute(
        delete(WaitingQueue).where(
            WaitingQueue.user_id.in_([user.id, partner.id])
        )
    )
    if del_result.rowcount < 1:
        await db.rollback()
        return None

    # Create session
    session = Session(
        user1_id=user.id,
        user2_id=partner.id,
        status="active",
        started_at=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)

    return session, partner


async def add_to_queue(db: AsyncSession, user: User) -> WaitingQueue:
    """Add or update user in the waiting queue. Gender/interests ignored for matching."""
    await db.execute(delete(WaitingQueue).where(WaitingQueue.user_id == user.id))
    entry = WaitingQueue(
        user_id=user.id,
        gender=user.gender or "other",
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return entry


async def remove_from_queue(db: AsyncSession, user_id: UUID) -> None:
    await db.execute(delete(WaitingQueue).where(WaitingQueue.user_id == user_id))
    await db.flush()


async def end_session(db: AsyncSession, session_id: UUID) -> Optional[Session]:
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session and session.status == "active":
        session.status = "ended"
        session.ended_at = datetime.now(timezone.utc)
        await db.flush()
    return session
