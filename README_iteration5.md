# Spark — Iteration 5: Friends system

## What was built
Friend requests over HTTP + Socket.io notifications, accept/remove, persistent friend chat with history pagination, Friends tab UI, Add friend from stranger chat.

## Files created / modified
| File | Action | Description |
|------|--------|-------------|
| backend/app/routers/friends.py | Created | list, request, accept, delete, chat history, send message |
| backend/app/socket/events.py | Modified | friend_request event |
| frontend/src/store/friendStore.js | Created | friends + pending |
| frontend/src/api/friends.js | Created | All friend API helpers |
| frontend/src/components/friends/FriendsTab.jsx | Created | List + requests |
| frontend/src/components/friends/FriendChat.jsx | Created | Persistent chat |

## Stranger vs friend chat
| | Stranger | Friend |
|--|----------|--------|
| Persistence | Auto-deleted 24h after session ends | Permanent |
| Skip | Yes | No |
| Report | Yes | Block instead |

## Friend request flow
1. In chat → Add friend → POST /friends/request + socket `friend_request`
2. Target receives `friend_request_received` → banner / Friends tab
3. Accept → PATCH /friends/{id}/accept → status accepted

## What is NOT built yet
Profile, settings, PWA, responsive layouts
