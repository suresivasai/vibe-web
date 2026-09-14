# backend/app/socket/events.py
# Purpose: All Socket.io server handlers (auth, queue, chat, friends)
# Iteration: 3–5

import asyncio
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from uuid import UUID

import socketio
from sqlalchemy import select

from app.database import AsyncSessionLocal, settings
from app.middleware.auth import authenticate_socket
from app.middleware.sanitize import sanitize_text
from app.models.models import Block, Friend, FriendMessage, Message, Session, User
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
# user_id → all active socket IDs (a user can have multiple tabs/devices)
user_sids: dict[str, set[str]] = {}
# call_id -> call state. This prevents duplicate accepts from multiple tabs and
# rejects signaling for calls that were never invited/are already ended.
active_calls: dict[str, dict] = {}

# Lightweight per-socket abuse protection. This complements HTTP rate limiting;
# Socket.io events do not pass through SlowAPI middleware.
_event_times: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_EVENT_WINDOWS = {
    'join_queue': (10, 60),
    'send_message': (45, 60),
    'send_friend_message': (45, 60),
    'call_invite': (6, 60),
    'call_accept': (10, 30),
    'call_decline': (10, 30),
    'call_end': (10, 30),
    'call_offer': (20, 30),
    'call_answer': (20, 30),
    'call_ice_candidate': (120, 30),
    'typing': (90, 30),
    'stop_typing': (90, 30),
    'name_changed': (15, 60),
    'friend_request': (10, 60),
}


def _allow_event(sid: str, event: str) -> bool:
    limit, window = _EVENT_WINDOWS.get(event, (120, 60))
    now = time.monotonic()
    q = _event_times[(sid, event)]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return False
    q.append(now)
    return True


def _parse_uuid(value):
    try:
        return UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return None


def _drop_calls_for_user(user_id: str) -> None:
    for call_id, call in list(active_calls.items()):
        if call.get('caller_id') == user_id or call.get('peer_id') == user_id:
            active_calls.pop(call_id, None)


def _drop_calls_for_scope(scope_type: str, scope_id: str) -> None:
    for call_id, call in list(active_calls.items()):
        if call.get('scope_type') == scope_type and call.get('scope_id') == scope_id:
            active_calls.pop(call_id, None)


async def _get_user(sid: str) -> User | None:
    uid = connected_users.get(sid)
    if not uid:
        return None
    try:
        parsed_user_id = UUID(uid)
    except (TypeError, ValueError):
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == parsed_user_id))
        return result.scalar_one_or_none()


async def _get_call_peer(sid: str, session_id: str | None = None, friend_id: str | None = None):
    """Return an authorized conversation scope and its other connected participant."""
    user = await _get_user(sid)
    if not user:
        return None, None, None
    async with AsyncSessionLocal() as db:
        if session_id:
            try:
                parsed_session_id = UUID(session_id)
            except (TypeError, ValueError):
                return None, None, None
            result = await db.execute(select(Session).where(Session.id == parsed_session_id, Session.status == "active"))
            scope = result.scalar_one_or_none()
            if not scope or user.id not in (scope.user1_id, scope.user2_id):
                return None, None, None
            other_id = scope.user2_id if scope.user1_id == user.id else scope.user1_id
        elif friend_id:
            try:
                parsed_friend_id = UUID(friend_id)
            except (TypeError, ValueError):
                return None, None, None
            result = await db.execute(select(Friend).where(Friend.id == parsed_friend_id, Friend.status == "accepted"))
            scope = result.scalar_one_or_none()
            if not scope or user.id not in (scope.requester_id, scope.receiver_id):
                return None, None, None
            other_id = scope.receiver_id if scope.requester_id == user.id else scope.requester_id
        else:
            return None, None, None
    peer_sids = list(user_sids.get(str(other_id), set())) if other_id else []
    return scope, user, peer_sids


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
        user_sids.setdefault(str(user.id), set()).add(sid)
        await sio.emit("authenticated", {"user_id": str(user.id)}, to=sid)
        print(f"[Socket] {user.display_name} connected ({sid})")
    return True


@sio.event
async def disconnect(sid):
    for key in [key for key in _event_times if key[0] == sid]:
        _event_times.pop(key, None)
    uid = connected_users.pop(sid, None)
    if not uid:
        print(f"[Socket] disconnected {sid} (no user)")
        return

    sockets = user_sids.get(uid, set())
    sockets.discard(sid)
    if sockets:
        user_sids[uid] = sockets
        # Another tab/device is still connected, so do NOT remove the user from
        # the matching queue. The user is still online.
        print(f"[Socket] disconnected {sid} user={uid}; {len(sockets)} socket(s) remain")
        return

    user_sids.pop(uid, None)
    _drop_calls_for_user(uid)
    try:
        async with AsyncSessionLocal() as db:
            await match_engine.remove_from_queue(db, UUID(uid))
            await db.commit()
    except Exception as e:
        print(f"[Socket] disconnect cleanup error: {e}")
    print(f"[Socket] disconnected {sid} user={uid}")


@sio.event
async def authenticate(sid, data):
    """Optional re-auth after connect."""
    token = (data or {}).get("token")
    async with AsyncSessionLocal() as db:
        user = await authenticate_socket(token or '', db)
        await db.commit()
        if user:
            old_uid = connected_users.get(sid)
            new_uid = str(user.id)
            if old_uid and old_uid != new_uid:
                old_sockets = user_sids.get(old_uid, set())
                old_sockets.discard(sid)
                if old_sockets:
                    user_sids[old_uid] = old_sockets
                else:
                    user_sids.pop(old_uid, None)
            connected_users[sid] = new_uid
            user_sids.setdefault(new_uid, set()).add(sid)
            await sio.emit('authenticated', {'user_id': new_uid}, to=sid)
        else:
            await sio.emit('auth_error', {'message': 'Invalid token'}, to=sid)
            try:
                await sio.disconnect(sid)
            except Exception:
                pass


@sio.event
async def join_queue(sid, data):
    if not _allow_event(sid, 'join_queue'):
        await sio.emit('error', {'code': 'rate_limited', 'message': 'Please wait a moment.'}, to=sid)
        return
    user = await _get_user(sid)
    if not user:
        await sio.emit("error", {"code": "unauth", "message": "Not authenticated"}, to=sid)
        return

    if user.is_banned and user.ban_until is not None and user.ban_until <= datetime.now(timezone.utc):
        user.is_banned = False
        user.ban_until = None
    if user.is_banned:
        until = user.ban_until.isoformat() if user.ban_until else None
        await sio.emit("banned", {"reason": "Account banned", "until": until}, to=sid)
        return

    async with AsyncSessionLocal() as db:
        await match_engine.add_to_queue(db, user)
        await db.commit()

        # Try immediate FIFO match
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
            partner_sids = user_sids.get(str(partner.id), set())
            if partner_sids:
                for partner_sid in partner_sids:
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
            for partner_sid in partner_sids:
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
    if not _allow_event(sid, 'send_message'):
        await sio.emit('error', {'code': 'rate_limited', 'message': 'Too many messages. Please slow down.'}, to=sid)
        return
    user = await _get_user(sid)
    if not user:
        await sio.emit("error", {"code": "unauth", "message": "Not authenticated"}, to=sid)
        return

    session_id = (data or {}).get("session_id")
    raw_content = (data or {}).get('content', '')
    if not isinstance(raw_content, str) or len(raw_content) > 2000:
        await sio.emit('error', {'code': 'invalid', 'message': 'Message too long'}, to=sid)
        return
    if not session_id or not raw_content:
        await sio.emit("error", {"code": "invalid", "message": "Missing fields"}, to=sid)
        return

    content = sanitize_text(raw_content, max_length=500)
    if not content:
        return

    clean, is_flagged = filter_message(content)

    parsed_session_id = _parse_uuid(session_id)
    if not parsed_session_id:
        await sio.emit('error', {'code': 'invalid', 'message': 'Invalid session'}, to=sid)
        return

    async with AsyncSessionLocal() as db:
        # Verify session membership
        result = await db.execute(select(Session).where(Session.id == parsed_session_id))
        session = result.scalar_one_or_none()
        if not session or session.status != "active":
            await sio.emit("error", {"code": "no_session", "message": "Session ended"}, to=sid)
            return
        if user.id not in (session.user1_id, session.user2_id):
            await sio.emit("error", {"code": "forbidden", "message": "Not in session"}, to=sid)
            return

        msg = Message(
            session_id=parsed_session_id,
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
            await sio.enter_room(sid, str(parsed_session_id))
        except KeyError:
            pass
        other_id = session.user2_id if session.user1_id == user.id else session.user1_id
        if other_id:
            for other_sid in list(user_sids.get(str(other_id), set())):
                try:
                    await sio.enter_room(other_sid, str(parsed_session_id))
                except KeyError:
                    pass

        payload = {
            "message_id": str(msg.id),
            "content": msg.content,
            "sender_id": str(user.id),
            "sent_at": msg.sent_at.isoformat(),
            "is_flagged": msg.is_flagged,
        }
        await sio.emit("new_message", payload, room=str(parsed_session_id))


@sio.event
async def send_friend_message(sid, data):
    if not _allow_event(sid, 'send_friend_message'):
        await sio.emit('error', {'code': 'rate_limited', 'message': 'Too many messages. Please slow down.'}, to=sid)
        return
    user = await _get_user(sid)
    if not user:
        await sio.emit("error", {"code": "unauth", "message": "Not authenticated"}, to=sid)
        return

    friend_id = (data or {}).get("friend_id")
    raw_content = (data or {}).get('content', '')
    if not isinstance(raw_content, str) or len(raw_content) > 2000:
        await sio.emit('error', {'code': 'invalid', 'message': 'Message too long'}, to=sid)
        return
    if not friend_id or not raw_content:
        await sio.emit("error", {"code": "invalid", "message": "Missing fields"}, to=sid)
        return

    try:
        parsed_friend_id = UUID(friend_id)
    except (TypeError, ValueError):
        await sio.emit("error", {"code": "invalid", "message": "Invalid friend"}, to=sid)
        return

    content = sanitize_text(raw_content, max_length=500)
    if not content:
        return
    clean, is_flagged = filter_message(content)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Friend).where(Friend.id == parsed_friend_id, Friend.status == "accepted"))
        friend = result.scalar_one_or_none()
        if not friend or user.id not in (friend.requester_id, friend.receiver_id):
            await sio.emit("error", {"code": "forbidden", "message": "Not in friend chat"}, to=sid)
            return

        row = FriendMessage(
            friend_id=parsed_friend_id,
            sender_id=user.id,
            content=clean,
            is_read=False,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)

        other_id = friend.receiver_id if friend.requester_id == user.id else friend.requester_id
        payload = {
            "message_id": str(row.id),
            "friend_id": str(friend.id),
            "content": row.content,
            "sender_id": str(user.id),
            "sent_at": row.sent_at.isoformat(),
            "is_flagged": bool(is_flagged),
        }
        for target_sid in list(user_sids.get(str(other_id), set())):
            await sio.emit("new_friend_message", payload, to=target_sid)
        # Echo canonical payload to sender too; frontend dedupes optimistic copy.
        await sio.emit("new_friend_message", payload, to=sid)


async def _emit_typing(sid, data, stopped=False):
    user = await _get_user(sid)
    session_id = _parse_uuid((data or {}).get('session_id'))
    if not user or not session_id:
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(
            Session.id == session_id,
            Session.status == 'active',
            ((Session.user1_id == user.id) | (Session.user2_id == user.id)),
        ))
        if not result.scalar_one_or_none():
            return
    await sio.emit('stranger_typing', {'stopped': True} if stopped else {}, room=str(session_id), skip_sid=sid)


@sio.event
async def typing(sid, data):
    if not _allow_event(sid, 'typing'):
        return
    await _emit_typing(sid, data, False)


@sio.event
async def stop_typing(sid, data):
    if not _allow_event(sid, 'stop_typing'):
        return
    await _emit_typing(sid, data, True)


@sio.event
async def call_invite(sid, data):
    if not _allow_event(sid, 'call_invite'):
        await sio.emit('call_error', {'message': 'Too many call attempts. Please wait.'}, to=sid)
        return
    payload = data or {}
    session_id = payload.get('session_id')
    friend_id = payload.get('friend_id')
    call_id = str(payload.get('call_id') or '')
    mode = payload.get('mode')
    if (not (session_id or friend_id) or (session_id and friend_id) or not call_id or len(call_id) > 100 or mode not in {'voice', 'video'}):
        await sio.emit('call_error', {'message': 'Invalid call invitation'}, to=sid)
        return

    scope, user, peer_sids = await _get_call_peer(sid, session_id, friend_id)
    if not scope or not user or not peer_sids:
        await sio.emit('call_error', {'message': 'The other person is unavailable'}, to=sid)
        return
    if call_id in active_calls:
        await sio.emit('call_error', {'message': 'Call is already active.'}, to=sid)
        return

    active_calls[call_id] = {
        'caller_id': str(user.id),
        'peer_id': str(scope.user2_id if scope.user1_id == user.id else scope.user1_id) if session_id else str(scope.receiver_id if scope.requester_id == user.id else scope.requester_id),
        'scope_type': 'session' if session_id else 'friend',
        'scope_id': str(scope.id),
        'mode': mode,
        'state': 'ringing',
    }
    payload_out = {
        'session_id': str(scope.id) if session_id else None,
        'friend_id': str(scope.id) if friend_id else None,
        'call_id': call_id,
        'mode': mode,
        'from': {'id': str(user.id), 'display_name': user.display_name},
    }
    for peer_sid in peer_sids:
        await sio.emit('call_incoming', payload_out, to=peer_sid)


async def _relay_call_event(event_name: str, sid: str, data: dict, fields: tuple[str, ...]):
    event_key = {
        'call_accepted': 'call_accept',
        'call_declined': 'call_decline',
        'call_offer': 'call_offer',
        'call_answer': 'call_answer',
        'call_ice_candidate': 'call_ice_candidate',
        'call_ended': 'call_end',
    }.get(event_name, event_name)
    if not _allow_event(sid, event_key):
        return
    user = await _get_user(sid)
    payload = data or {}
    call_id = str(payload.get('call_id') or '')
    session_id = payload.get('session_id')
    friend_id = payload.get('friend_id')
    if not user or not call_id or len(call_id) > 100 or not (session_id or friend_id) or (session_id and friend_id):
        return
    if session_id and not _parse_uuid(session_id):
        return
    if friend_id and not _parse_uuid(friend_id):
        return
    for field in fields:
        if not payload.get(field):
            return
        value = payload[field]
        # SDP can be tens of KB, but should never be arbitrarily large; ICE candidates are small.
        max_size = 100_000 if field in {'offer', 'answer'} else 20_000 if field == 'candidate' else 200
        if isinstance(value, str) and len(value) > max_size:
            return

    call = active_calls.get(call_id)
    if not call:
        return
    scope, _, peer_sids = await _get_call_peer(sid, session_id, friend_id)
    if not scope or not peer_sids:
        return
    expected_scope_id = str(scope.id)
    expected_scope_type = 'session' if session_id else 'friend'
    if call['scope_id'] != expected_scope_id or call['scope_type'] != expected_scope_type:
        return
    uid = str(user.id)
    caller_id = call['caller_id']
    peer_id = call['peer_id']

    # Only the invited peer may accept/decline; only the caller may send the offer;
    # only the callee may answer; either participant may end a live call.
    if event_name == 'call_accepted':
        if uid != peer_id or call['state'] != 'ringing':
            return
        call['state'] = 'accepted'
    elif event_name == 'call_declined':
        if uid not in {caller_id, peer_id} or call['state'] != 'ringing':
            return
        call['state'] = 'ended'
    elif event_name == 'call_offer':
        if uid != caller_id or call['state'] != 'accepted':
            return
    elif event_name == 'call_answer':
        if uid != peer_id or call['state'] != 'accepted':
            return
    elif event_name == 'call_ice_candidate':
        if uid not in {caller_id, peer_id} or call['state'] != 'accepted':
            return
    elif event_name == 'call_ended':
        if uid not in {caller_id, peer_id} or call['state'] not in {'ringing', 'accepted'}:
            return
        call['state'] = 'ended'
    else:
        return

    relay = {field: payload[field] for field in fields}
    relay['session_id'] = expected_scope_id if session_id else None
    relay['friend_id'] = expected_scope_id if friend_id else None
    for peer_sid in peer_sids:
        if peer_sid != sid:
            await sio.emit(event_name, relay, to=peer_sid)

    if event_name in {'call_declined', 'call_ended'}:
        active_calls.pop(call_id, None)


@sio.event
async def call_accept(sid, data):
    await _relay_call_event('call_accepted', sid, data or {}, ('call_id',))


@sio.event
async def call_decline(sid, data):
    await _relay_call_event('call_declined', sid, data or {}, ('call_id',))


@sio.event
async def call_offer(sid, data):
    await _relay_call_event('call_offer', sid, data or {}, ('call_id', 'offer'))


@sio.event
async def call_answer(sid, data):
    await _relay_call_event('call_answer', sid, data or {}, ('call_id', 'answer'))


@sio.event
async def call_ice_candidate(sid, data):
    await _relay_call_event('call_ice_candidate', sid, data or {}, ('call_id', 'candidate'))


@sio.event
async def call_end(sid, data):
    await _relay_call_event('call_ended', sid, data or {}, ('call_id',))


@sio.event
async def name_changed(sid, data):
    if not _allow_event(sid, 'name_changed'):
        return
    user = await _get_user(sid)
    session_id = (data or {}).get('session_id')
    display_name = (data or {}).get('display_name')
    parsed_session_id = _parse_uuid(session_id)
    if not user or not parsed_session_id or not display_name:
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Session).where(
            Session.id == parsed_session_id,
            Session.status == 'active',
            ((Session.user1_id == user.id) | (Session.user2_id == user.id)),
        ))
        if not result.scalar_one_or_none():
            return
    safe_name = str(display_name).strip()[:24]
    await sio.emit('stranger_name_changed', {'user_id': str(user.id), 'display_name': safe_name}, room=str(parsed_session_id), skip_sid=sid)


@sio.event
async def skip(sid, data):
    user = await _get_user(sid)
    if not user:
        return
    session_id = (data or {}).get("session_id")
    if not session_id:
        return

    try:
        parsed_session_id = UUID(session_id)
    except (TypeError, ValueError):
        await sio.emit("error", {"code": "invalid", "message": "Invalid session"}, to=sid)
        return

    async with AsyncSessionLocal() as db:
        session = await match_engine.end_session(db, parsed_session_id, user.id)
        await db.commit()
        if session:
            _drop_calls_for_scope('session', str(parsed_session_id))
            await sio.emit("stranger_left", {}, room=str(parsed_session_id), skip_sid=sid)
            await sio.leave_room(sid, str(parsed_session_id))


@sio.event
async def friend_request(sid, data):
    if not _allow_event(sid, 'friend_request'):
        return
    """Optional socket path — prefer POST /friends/request which also emits.
    Kept for clients that only use sockets; creates DB row if missing.
    """
    user = await _get_user(sid)
    if not user:
        return
    target_id = _parse_uuid((data or {}).get('target_user_id'))
    if not target_id or target_id == UUID(str(user.id)):
        return

    async with AsyncSessionLocal() as db:
        target = await db.get(User, target_id)
        if target is None or target.is_banned:
            return
        blocked = await db.execute(select(Block).where(
            ((Block.blocker_id == user.id) & (Block.blocked_id == target_id)) |
            ((Block.blocker_id == target_id) & (Block.blocked_id == user.id))
        ))
        if blocked.scalar_one_or_none():
            return
        existing = await db.execute(
            select(Friend).where(
                (
                    (Friend.requester_id == user.id)
                    & (Friend.receiver_id == target_id)
                )
                | (
                    (Friend.requester_id == target_id)
                    & (Friend.receiver_id == user.id)
                )
            )
        )
        if existing.scalar_one_or_none():
            return

        friend = Friend(
            requester_id=user.id,
            receiver_id=target_id,
            status="pending",
        )
        db.add(friend)
        await db.commit()

        target_sids = list(user_sids.get(str(target_id), set()))
        for target_sid in target_sids:
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
