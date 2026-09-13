# backend/app/services/cleanup.py
# Purpose: APScheduler cron — delete stranger messages older than 24h after session end
# Iteration: 4

from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import and_, delete, select

from app.database import AsyncSessionLocal
from app.models.models import Message, Session

scheduler = AsyncIOScheduler()


async def cleanup_old_messages():
    """
    Delete messages belonging to ended stranger sessions where
    the message was sent more than 24 hours ago.
    Friend messages are never touched (different table).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    async with AsyncSessionLocal() as db:
        # Find ended sessions older than 24h
        result = await db.execute(
            select(Session.id).where(
                Session.status.in_(["ended", "reported"]),
                Session.ended_at != None,  # noqa: E711
                Session.ended_at < cutoff,
            )
        )
        session_ids = [row[0] for row in result.all()]
        if not session_ids:
            return

        await db.execute(
            delete(Message).where(
                and_(
                    Message.session_id.in_(session_ids),
                    Message.sent_at < cutoff,
                )
            )
        )
        await db.commit()
        print(f"[Cleanup] Removed old messages from {len(session_ids)} sessions")


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            cleanup_old_messages,
            trigger="interval",
            hours=1,
            id="cleanup_messages",
            replace_existing=True,
        )
        scheduler.start()
        print("[Cleanup] Scheduler started (hourly)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Cleanup] Scheduler stopped")
