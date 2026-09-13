# Spark — Iteration 4: Chat screen + moderation

## What was built
Real-time messaging over Socket.io, profanity filter (better-profanity), auto-ban on reports, APScheduler cleanup of stranger messages 24h after session end, Chat UI with emoji picker, typing indicator, report bottom sheet.

## Files created / modified
| File | Action | Description |
|------|--------|-------------|
| backend/app/services/moderation.py | Created | filter_message, check_and_ban |
| backend/app/services/cleanup.py | Created | Hourly delete of old stranger messages |
| backend/app/routers/reports.py | Created | POST /reports |
| backend/app/socket/events.py | Modified | send_message handler |
| frontend/src/components/chat/* | Created | ChatScreen, MessageBubble, TypingIndicator, EmojiPicker |
| frontend/src/api/reports.js | Created | submitReport |

## Moderation pipeline
message → sanitize_text → filter_message (profanity) → save (flagged content = "[message removed]") → broadcast to session room

## Auto-delete cron
Runs every hour. Deletes messages in ended/reported sessions where sent_at < now−24h. Friend messages are never deleted.

## How to test profanity
Send a known swear word → both sides see `[message removed]`, `is_flagged=true` in DB.

## Report flow
POST /reports → increments report_count → if ≥3 in 24h temp-ban 24h; if ≥10 lifetime permanent ban.

## What is NOT built yet
Friends system, profile/settings/PWA, responsive desktop
