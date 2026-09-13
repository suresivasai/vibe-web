# backend/app/services/moderation.py
# Purpose: Profanity filter + auto-ban logic based on reports
# Iteration: 4

from datetime import datetime, timedelta, timezone
from uuid import UUID

from better_profanity import profanity
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Report, User

# Load default English word list once
profanity.load_censor_words()


def filter_message(content: str) -> tuple[str, bool]:
    """
    Run better-profanity on content.
    Returns (clean_content, is_flagged).
    Flagged messages are replaced with [message removed] for storage/broadcast.
    """
    if not content:
        return "", False
    if profanity.contains_profanity(content):
        return "[message removed]", True
    return content, False


async def check_and_ban(db: AsyncSession, reported_user_id: UUID) -> dict:
    """
    After a new report is saved:
    - 3 reports against same user within 24h → temp-ban 24 hours
    - 10 lifetime reports → permanent ban (is_banned = true)
    Returns status dict for the caller.
    """
    result = await db.execute(select(User).where(User.id == reported_user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return {"action": "none"}

    # Lifetime count
    user.report_count = (user.report_count or 0) + 1

    # Reports in last 24h
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    count_result = await db.execute(
        select(func.count(Report.id)).where(
            Report.reported_id == reported_user_id,
            Report.created_at >= since,
        )
    )
    recent_count = count_result.scalar() or 0

    action = "none"
    if user.report_count >= 10:
        user.is_banned = True
        user.ban_until = None
        action = "permanent_ban"
    elif recent_count >= 3:
        user.is_banned = True
        user.ban_until = datetime.now(timezone.utc) + timedelta(hours=24)
        action = "temp_ban_24h"

    await db.flush()
    return {
        "action": action,
        "report_count": user.report_count,
        "recent_count": recent_count,
        "ban_until": user.ban_until.isoformat() if user.ban_until else None,
    }
