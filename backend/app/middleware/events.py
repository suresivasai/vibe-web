# backend/app/socket/events.py
# Purpose: All Socket.io server handlers (auth, queue, chat, friends)
# Iteration: 3–5

import asyncio
from datetime import datetime, timezone
from uuid import UUID

import socketio
from sqlalchemy import select

from app.database import AsyncSessionLocal, settings
from app.middleware.auth import authenticate_socket
from app.middleware.sanitize import sanitize_text
from app.models.models import Friend, Message, Session, User
from app.services import match_engine
from app.services.moderation import filter_message

# Async Socket.io server — CORS mirrors ALLOWED_ORIGINS
_origins = settings.allowed_origins_list or ["http://localhost:5173", "http://127.0.0.1:5173"]
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=_origins if _origins else "*",
    logger=False,
    engineio_logger=False,
)

# sid → user_id mapping
connected_users: dict[str, str] = {}
# user_id → sid
user_sids: dict[str, str] = {}


async def _get_user(sid: str) -> User | None:
    uid = connected_users.get(sid)
    if not uid:
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == UUID(uid)))
        return result.scalar_one_or_none()


@sio.event
async def connect(sid, environ, auth):
    """Require JWT in auth.token on handshake."""
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        await sio.emit("auth_error", {"message": "Missing token"}, to=sid)
        return False

    async with AsyncSessionLocal() as db:
        user = await authenticate_socket(token, db)
        await db.commit()
        if not user:
            await sio.emit("auth_error", {"message": "Invalid token"}, to=sid)
            return False
        connected_users[sid] = str(user.id)
        user_sids[str(user.id)] = sid
        await sio.emit("authenticated", {"user_id": str(user.id)}, to=sid)
        print(f"[Socket] {user.display_name} connected ({sid})")
    return True


@sio.event
async def disconnect(sid):
    uid = connected_users.pop(sid, None)
    if uid:
        # Only remove mapping if it still points to this sid
        if user_sids.get(uid) == sid:
            user_sids.pop(uid, None)
        try:
            async with AsyncSessionLocal() as db:
                await match_engine.remove_from_queue(db, UUID(uid))
                await db.commit()
        except Exception as e:
            print(f"[Socket] disconnect cleanup error: {e}")
        print(f"[Socket] disconnected {sid} user={uid}")
    else:
        print(f"[Socket] disconnected {sid} (no user)")


@sio.event
async def authenticate(sid, data):
    """Optional re-auth after connect."""
    token = (data or {}).get("token")
    async with AsyncSessionLocal() as db:
        user = await authenticate_socket(token or "", db)
        await db.commit()
        if user:
            connected_users[sid] = str(user.id)
            user_sids[str(user.id)] = sid
            await sio.emit("authenticated", {"user_id": str(user.id)}, to=sid)
        else:
            await sio.emit("auth_error", {"message": "Invalid token"}, to=sid)


@sio.event
async def join_queue(sid, data):
    user = await _get_user(sid)
    if not user:
        await sio.emit("error", {"code": "unauth", "message": "Not authenticated"}, to=sid)
        return

    if user.is_banned:
        until = user.ban_until.isoformat() if user.ban_until else None
        await sio.emit("banned", {"reason": "Account banned", "until": until}, to=sid)
        return

    gender = (data or {}).get("gender") or user.gender

    async with AsyncSessionLocal() as db:
        await match_engine.add_to_queue(db, user)
        await db.commit()

        # Try immediate match
        result = await match_engine.find_match(db, user)
        if result:
            session, partner = result
            await db.commit()
            # Notify both
            payload_for_user = {
                "session_id": str(session.id),
                "stranger": {
                    "display_name": partner.display_name,
                    "id": str(partner.id),
                    "avatar_url": partner.avatar_url,
                },
            }
            payload_for_partner = {
                "session_id": str(session.id),
                "stranger": {
                    "display_name": user.display_name,
                    "id": str(user.id),
                    "avatar_url": user.avatar_url,
                },
            }
            await sio.emit("matched", payload_for_user, to=sid)
            partner_sid = user_sids.get(str(partner.id))
            if partner_sid:
                try:
                    await sio.emit("matched", payload_for_partner, to=partner_sid)
                except Exception as e:
                    print(f"[Socket] emit to partner failed: {e}")

            # Join rooms only if sid is still connected (avoid KeyError)
            async def _safe_enter(target_sid, room):
                if not target_sid:
                    return
                try:
                    await sio.enter_room(target_sid, room)
                except KeyError:
                    print(f"[Socket] enter_room skipped — sid gone: {target_sid}")
                except Exception as e:
                    print(f"[Socket] enter_room error: {e}")

            await _safe_enter(sid, str(session.id))
            await _safe_enter(partner_sid, str(session.id))
        else:
            await sio.emit("no_match", {}, to=sid)


@sio.event
async def leave_queue(sid, data):
    user = await _get_user(sid)
    if not user:
        return
    async with AsyncSessionLocal() as db:
        await match_engine.remove_from_queue(db, user.id)
        await db.commit()


@sio.event
async def send_message(sid, data):
    user = await _get_user(sid)
    if not user:
        await sio.emit("error", {"code": "unauth", "message": "Not authenticated"}, to=sid)
        return

    session_id = (data or {}).get("session_id")
    raw_content = (data or {}).get("content", "")
    if not session_id or not raw_content:
        await sio.emit("error", {"code": "invalid", "message": "Missing fields"}, to=sid)
        return

    content = sanitize_text(raw_content, max_length=500)
    if not content:
        return

    clean, is_flagged = filter_message(content)

    async with AsyncSessionLocal() as db:
        # Verify session membership
        result = await db.execute(select(Session).where(Session.id == UUID(session_id)))
        session = result.scalar_one_or_none()
        if not session or session.status != "active":
            await sio.emit("error", {"code": "no_session", "message": "Session ended"}, to=sid)
            return
        if user.id not in (session.user1_id, session.user2_id):
            await sio.emit("error", {"code": "forbidden", "message": "Not in session"}, to=sid)
            return

        msg = Message(
            session_id=UUID(session_id),
            sender_id=user.id,
            content=clean,
            is_flagged=is_flagged,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)

        # Ensure both parties are in the session room (handles reconnect)
        try:
            await sio.enter_room(sid, str(session_id))
        except KeyError:
            pass
        other_id = session.user2_id if session.user1_id == user.id else session.user1_id
        if other_id:
            other_sid = user_sids.get(str(other_id))
            if other_sid:
                try:
                    await sio.enter_room(other_sid, str(session_id))
                except KeyError:
                    pass

        payload = {
            "message_id": str(msg.id),
            "content": msg.content,
            "sender_id": str(user.id),
            "sent_at": msg.sent_at.isoformat(),
            "is_flagged": msg.is_flagged,
        }
        await sio.emit("new_message", payload, room=str(session_id))


@sio.event
async def typing(sid, data):
    session_id = (data or {}).get("session_id")
    if session_id:
        await sio.emit("stranger_typing", {}, room=str(session_id), skip_sid=sid)


@sio.event
async def stop_typing(sid, data):
    session_id = (data or {}).get("session_id")
    if session_id:
        await sio.emit("stranger_typing", {"stopped": True}, room=str(session_id), skip_sid=sid)


@sio.event
async def skip(sid, data):
    user = await _get_user(sid)
    if not user:
        return
    session_id = (data or {}).get("session_id")
    if not session_id:
        return

    async with AsyncSessionLocal() as db:
        session = await match_engine.end_session(db, UUID(session_id))
        await db.commit()
        if session:
            await sio.emit("stranger_left", {}, room=str(session_id), skip_sid=sid)
            await sio.leave_room(sid, str(session_id))


@sio.event
async def friend_request(sid, data):
    """Optional socket path — prefer POST /friends/request which also emits.
    Kept for clients that only use sockets; creates DB row if missing.
    """
    user = await _get_user(sid)
    if not user:
        return
    target_id = (data or {}).get("target_user_id")
    if not target_id:
        return

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(Friend).where(
                (
                    (Friend.requester_id == user.id)
                    & (Friend.receiver_id == UUID(target_id))
                )
                | (
                    (Friend.requester_id == UUID(target_id))
                    & (Friend.receiver_id == user.id)
                )
            )
        )
        if existing.scalar_one_or_none():
            return

        friend = Friend(
            requester_id=user.id,
            receiver_id=UUID(target_id),
            status="pending",
        )
        db.add(friend)
        await db.commit()

        target_sid = user_sids.get(str(target_id))
        if target_sid:
            await sio.emit(
                "friend_request_received",
                {
                    "from": {
                        "id": str(user.id),
                        "display_name": user.display_name,
                        "avatar_url": user.avatar_url,
                    },
                    "friend_id": str(friend.id),
                },
                to=target_sid,
            )
