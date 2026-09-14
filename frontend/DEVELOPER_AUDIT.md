# Developer hardening pass

## Fixed
- Socket users now support multiple active tabs/devices without stale disconnects removing them from the match queue.
- Socket message/friend-message/call event abuse is rate limited.
- Session and friend membership is checked before typing, name-change broadcasts, message sends, and call signaling.
- Malformed UUIDs no longer cause avoidable socket 500s.
- Friend chat delivery uses Socket.io for immediate real-time delivery; REST remains as history/fallback.
- Friend-chat clear notifications are server-authoritative.
- WebRTC calls now have a server-side call lifecycle guard so duplicate-tab accepts and signaling for unknown/ended calls are rejected.
- Large SDP/ICE signaling payloads are rejected.
- Report endpoints validate the referenced user and, when supplied, ensure the report session actually contains both reporter and reported user.
- Display-name/avatar input validation is tightened.
- Multilingual/Unicode/obfuscation-aware message masking is retained as a local safety layer.

## Important deployment notes
1. Run `npm ci` and `npm run build` in the frontend before deploying Firebase Hosting. The existing `dist/` in this archive is a previous build and was not regenerated in this environment because dependencies could not be installed successfully here.
2. Run the backend with a single worker unless a shared Socket.io manager (for example Redis) is added. The current matching/socket maps are process-local.
3. Keep real `.env` files out of source control. Rotate any credentials that were previously exposed.
4. WebRTC media is encrypted by WebRTC/DTLS-SRTP, but application chat is transport-encrypted with HTTPS/WSS rather than end-to-end encrypted.
5. A local profanity dictionary cannot guarantee coverage of every language or slang variant. For production-grade global moderation, add a dedicated moderation model/service.
