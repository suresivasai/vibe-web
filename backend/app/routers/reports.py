# backend/app/routers/reports.py
# Purpose: Submit user reports for moderation
# Iteration: 4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import RATE_LIMITS, limiter
from app.models.models import Report, Session, User
from app.schemas.schemas import MessageResponse, ReportCreate, ReportResponse
from app.services.moderation import check_and_ban

router = APIRouter()


@router.post("", response_model=ReportResponse)
@limiter.limit(RATE_LIMITS["report"])
async def submit_report(
    request: Request,
    body: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.reported_id == current_user.id:
        raise HTTPException(status_code=400, detail='Cannot report yourself')

    target = await db.get(User, body.reported_id)
    if target is None:
        raise HTTPException(status_code=404, detail='User not found')

    if body.session_id is not None:
        result = await db.execute(select(Session).where(Session.id == body.session_id))
        session = result.scalar_one_or_none()
        if session is None or current_user.id not in (session.user1_id, session.user2_id) or session.user1_id != body.reported_id and session.user2_id != body.reported_id:
            raise HTTPException(status_code=403, detail='Invalid report session')

    report = Report(
        reporter_id=current_user.id,
        reported_id=body.reported_id,
        session_id=body.session_id,
        reason=body.reason,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    await check_and_ban(db, body.reported_id)

    return ReportResponse.model_validate(report)
