# Spark — Iteration 3: Match engine + WebSocket pairing

## What was built
Socket.io server with JWT handshake, waiting queue, opposite-gender match with interest boost, real-time `matched` events, Home + Waiting screens, chat/friend stores and hooks.

## Files created / modified
| File | Action | Description |
|------|--------|-------------|
| backend/app/services/match_engine.py | Created | find_match, add/remove queue, end_session |
| backend/app/socket/events.py | Created | connect, join_queue, leave_queue, skip, typing |
| backend/app/routers/match.py | Created | HTTP join/leave/skip |
| backend/app/main.py | Modified | Mount socketio.ASGIApp |
| frontend/src/hooks/useSocket.js | Created | Connect + all event handlers |
| frontend/src/hooks/useMatch.js | Created | start/cancel/skip + confetti |
| frontend/src/store/chatStore.js | Created | session, messages, typing |
| frontend/src/components/match/HomeScreen.jsx | Created | Start matching UI |
| frontend/src/components/match/WaitingScreen.jsx | Created | Pulse + timer |

## Match algorithm
1. User joins queue with gender + interests.
2. Server looks for opposite gender (male↔female; other→anyone different).
3. Excludes blocked users either direction.
4. Scores candidates by shared interest count; picks highest (FIFO tie-break).
5. Removes both from queue, creates session, emits `matched` to both, joins Socket.io room.

## How to test with two tabs
1. Log in as two opposite-gender users (or seed sample users).
2. Open two browsers/profiles, start matching on both.
3. Expect confetti + navigate to `/chat/:sessionId` within seconds.

## Edge cases
- Disconnect while in queue → removed from queue on socket disconnect.
- No partner → client stays on Waiting until cancel or match.

## What is NOT built yet
Message send/receive UI polish, moderation, friends, profile (4–7)
