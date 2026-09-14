# backend/app/routers/friends.py
# Purpose: Friend list, request, accept, delete, friend chat history
# Iteration: 5

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import RATE_LIMITS, limiter
from app.middleware.sanitize import sanitize_text
from app.services.moderation import filter_message
from app.models.models import Block, Friend, FriendMessage, User
from app.schemas.schemas import (
    FriendChatPage,
    FriendMessageOut,
    FriendRequestCreate,
    FriendResponse,
    MessageResponse,
    UserPublic,
)
from fastapi import Request

router = APIRouter()


@router.get("", response_model=list[FriendResponse])
async def list_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Friend).where(
            or_(
                Friend.requester_id == current_user.id,
                Friend.receiver_id == current_user.id,
            ),
            Friend.status.in_(["pending", "accepted"]),
        )
    )
    friends = result.scalars().all()
    out = []
    for f in friends:
        other_id = (
            f.receiver_id if f.requester_id == current_user.id else f.requester_id
        )
        u = await db.get(User, other_id)
        other = UserPublic.model_validate(u) if u else None
        out.append(
            FriendResponse(
                id=f.id,
                requester_id=f.requester_id,
                receiver_id=f.receiver_id,
                status=f.status,
                created_at=f.created_at,
                other_user=other,
            )
        )
    return out


@router.post("/request", response_model=FriendResponse)
@limiter.limit(RATE_LIMITS["friend_request"])
async def send_friend_request(
    request: Request,
    body: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")

    target = await db.get(User, body.target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    blocked = await db.execute(
        select(Block).where(
            ((Block.blocker_id == current_user.id) & (Block.blocked_id == body.target_user_id))
            | ((Block.blocker_id == body.target_user_id) & (Block.blocked_id == current_user.id))
        )
    )
    if blocked.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Friend request unavailable")

    existing = await db.execute(
        select(Friend).where(
            or_(
                and_(
                    Friend.requester_id == current_user.id,
                    Friend.receiver_id == body.target_user_id,
                ),
                and_(
                    Friend.requester_id == body.target_user_id,
                    Friend.receiver_id == current_user.id,
                ),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Friend request already exists")

    friend = Friend(
        requester_id=current_user.id,
        receiver_id=body.target_user_id,
        status="pending",
    )
    db.add(friend)
    await db.flush()
    await db.refresh(friend)

    # Notify target via Socket.io if online
    try:
        from app.socket.events import sio, user_sids
        target_sids = list(user_sids.get(str(body.target_user_id), set()))
        for target_sid in target_sids:
            await sio.emit(
                "friend_request_received",
                {
                    "from": {
                        "id": str(current_user.id),
                        "display_name": current_user.display_name,
                        "avatar_url": current_user.avatar_url,
                    },
                    "friend_id": str(friend.id),
                },
                to=target_sid,
            )
    except Exception:
        pass

    return FriendResponse(
        id=friend.id,
        requester_id=friend.requester_id,
        receiver_id=friend.receiver_id,
        status=friend.status,
        created_at=friend.created_at,
        other_user=UserPublic.model_validate(target) if target else None,
    )


@router.patch("/{friend_id}/accept", response_model=FriendResponse)
async def accept_friend(
    friend_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friend = await db.get(Friend, friend_id)
    if not friend or friend.receiver_id != current_user.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if friend.status != "pending":
        raise HTTPException(status_code=400, detail="Not pending")
    friend.status = "accepted"
    await db.flush()
    other = await db.get(User, friend.requester_id)

    # Notify requester in real time if online
    try:
        from app.socket.events import sio, user_sids

        requester_sids = list(user_sids.get(str(friend.requester_id), set()))
        for requester_sid in requester_sids:
            await sio.emit(
                "friend_accepted",
                {
                    "friend": {
                        "id": str(friend.id),
                        "requester_id": str(friend.requester_id),
                        "receiver_id": str(friend.receiver_id),
                        "status": friend.status,
                        "created_at": friend.created_at.isoformat() if friend.created_at else None,
                        "other_user": UserPublic.model_validate(current_user).model_dump(mode="json"),
                    }
                },
                to=requester_sid,
            )
    except Exception:
        pass

    return FriendResponse(
        id=friend.id,
        requester_id=friend.requester_id,
        receiver_id=friend.receiver_id,
        status=friend.status,
        created_at=friend.created_at,
        other_user=UserPublic.model_validate(other) if other else None,
    )


@router.delete("/{friend_id}", response_model=MessageResponse)
async def remove_friend(
    friend_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friend = await db.get(Friend, friend_id)
    if not friend or (
        friend.requester_id != current_user.id
        and friend.receiver_id != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(friend)
    await db.flush()
    return MessageResponse(message="Friend removed")


@router.get("/chats/{friend_id}", response_model=FriendChatPage)
async def get_friend_chat(
    friend_id: UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friend = await db.get(Friend, friend_id)
    if not friend or friend.status != "accepted":
        raise HTTPException(status_code=404, detail="Chat not found")
    if current_user.id not in (friend.requester_id, friend.receiver_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    offset = (page - 1) * limit
    result = await db.execute(
        select(FriendMessage)
        .where(FriendMessage.friend_id == friend_id)
        .order_by(FriendMessage.sent_at.desc())
        .offset(offset)
        .limit(limit + 1)
    )
    rows = result.scalars().all()
    has_more = len(rows) > limit
    messages = list(reversed(rows[:limit]))
    return FriendChatPage(
        messages=[FriendMessageOut.model_validate(m) for m in messages],
        page=page,
        limit=limit,
        has_more=has_more,
    )


@router.post("/chats/{friend_id}/messages", response_model=FriendMessageOut)
@limiter.limit(RATE_LIMITS["send_message"])
async def send_friend_message(
    friend_id: UUID,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    friend = await db.get(Friend, friend_id)
    if not friend or friend.status != "accepted":
        raise HTTPException(status_code=404, detail="Chat not found")
    if current_user.id not in (friend.requester_id, friend.receiver_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    content = sanitize_text(body.get("content", ""), max_length=500)
    if not content:
        raise HTTPException(status_code=422, detail="Empty message")
    content, is_flagged = filter_message(content)

    msg = FriendMessage(
        friend_id=friend_id,
        sender_id=current_user.id,
        content=content,
        is_read=False,
    )
    db.add(msg)
    await db.flush()
    await db.refresh(msg)

    # REST fallback also broadcasts immediately for clients whose socket is reconnecting.
    try:
        from app.socket.events import sio, user_sids
        other_id = friend.receiver_id if friend.requester_id == current_user.id else friend.requester_id
        payload = {
            'message_id': str(msg.id),
            'friend_id': str(friend.id),
            'content': msg.content,
            'sender_id': str(current_user.id),
            'sent_at': msg.sent_at.isoformat(),
            'is_flagged': bool(is_flagged),
        }
        for target_sid in list(user_sids.get(str(other_id), set())):
            await sio.emit('new_friend_message', payload, to=target_sid)
    except Exception:
        pass
    return FriendMessageOut.model_validate(msg)


@router.delete("/chats/{friend_id}/messages", response_model=MessageResponse)
async def clear_friend_chat(
    friend_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear a friend's conversation after validating accepted membership."""
    friend = await db.get(Friend, friend_id)
    if not friend or friend.status != "accepted":
        raise HTTPException(status_code=404, detail="Chat not found")
    if current_user.id not in (friend.requester_id, friend.receiver_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.execute(delete(FriendMessage).where(FriendMessage.friend_id == friend_id))
    await db.flush()
    try:
        from app.socket.events import sio, user_sids
        other_id = friend.receiver_id if friend.requester_id == current_user.id else friend.requester_id
        for target_sid in list(user_sids.get(str(other_id), set())):
            await sio.emit('friend_chat_cleared', {'friend_id': str(friend_id)}, to=target_sid)
    except Exception:
        pass
    return MessageResponse(message="Chat cleared")
