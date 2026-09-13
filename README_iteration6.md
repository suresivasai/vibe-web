# Spark — Iteration 6: Profile, settings, PWA

## What was built
Profile tab with inline edit, Settings (dark mode, delete account, privacy), BottomNav, Avatar, Toast, ComingSoonBadge, Web App Manifest + service worker, Vite PWA plugin.

## Files created / modified
| File | Action | Description |
|------|--------|-------------|
| frontend/src/components/profile/ProfileTab.jsx | Created | Profile + edit |
| frontend/src/components/profile/SettingsScreen.jsx | Created | Dark mode, delete account |
| frontend/src/components/shared/BottomNav.jsx | Created | Mobile nav |
| frontend/src/components/shared/Avatar.jsx | Created | Photo or initials |
| frontend/public/manifest.json | Created | PWA manifest |
| frontend/public/sw.js | Created | App-shell cache |
| frontend/vite.config.js | Modified | VitePWA config |

## Dark mode
CSS class `dark` on `<html>`, toggled in Settings, persisted in `localStorage` key `spark-theme`. Applied early in main.jsx to avoid flash.

## PWA install
**Android Chrome:** Menu → Install app / Add to Home screen.  
**iOS Safari:** Share → Add to Home Screen.

## Delete account
DELETE /users/me removes user, queue, tokens, blocks, reports, friends. Cascades handle messages/sessions via FK rules.

## What is NOT built yet
Tablet/desktop responsive layout, deployment checklist polish
