# Spark — Iteration 2: Authentication (Google OAuth + JWT)

## What was built
Google OAuth login via Supabase, JWT access (1h) + rotating refresh (7d) tokens, user profile create-on-first-login, onboarding (gender + interests), protected routes, and Axios silent refresh.

## Files created / modified
| File | Action | Description |
|------|--------|-------------|
| backend/app/middleware/auth.py | Created | JWT create/decode, get_current_user, WS auth |
| backend/app/routers/auth.py | Created | POST /auth/google, /auth/refresh, DELETE /auth/logout |
| backend/app/routers/users.py | Created | GET/PATCH/DELETE /users/me |
| backend/app/main.py | Modified | Include auth + users routers |
| frontend/package.json | Created | React 18, Vite, Tailwind, Zustand, Socket.io, etc. |
| frontend/src/api/axios.js | Created | Interceptors for JWT + silent refresh |
| frontend/src/api/auth.js | Created | Google login, exchange, logout |
| frontend/src/store/authStore.js | Created | Zustand persist auth state |
| frontend/src/hooks/useAuth.js | Created | Auth hook + Supabase listener |
| frontend/src/components/shared/ProtectedRoute.jsx | Created | Auth + onboarding guard |
| frontend/src/components/auth/LoginScreen.jsx | Created | Google button, 18+ checkbox |
| frontend/src/components/auth/OnboardingScreen.jsx | Created | Gender + interest chips |
| frontend/src/App.jsx | Created | Full route tree |
| frontend/vite.config.js, tailwind, index.html, main.jsx, index.css | Created | Scaffold |

## How to run
1. Configure Google OAuth in Supabase (Auth → Providers → Google).
2. Set frontend `.env` and backend `.env`.
3. Backend: `uvicorn app.main:app --reload --port 8000`
4. Frontend: `cd frontend && npm i && npm run dev`

## How to test
1. Open http://localhost:5173/login
2. Check 18+, Continue with Google
3. Complete Google consent → redirect → onboarding
4. Pick gender + 3 interests → Home
5. Refresh page — session persists; token refresh works on 401

## Security implemented this iteration
- JWT access 1h / refresh 7d with rotation (old token invalidated)
- Login rate limit 5/min per IP
- Display name sanitization, interest enum validation
- CORS whitelist only
- No secrets in URL params

## Known issues / limitations
- Phone OTP not implemented (UI note only)
- Google token verification uses tokeninfo endpoint (fine for launch)

## What is NOT built yet
Match engine, chat, friends, PWA polish, responsive desktop (Iterations 3–7)
