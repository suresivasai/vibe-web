# Spark — Iteration 7: Responsive layout + polish + deploy

## What was built
Mobile-first layout already in place; BottomNav hidden on `md+`. Empty states, loading skeletons, and touch targets (≥44px) throughout. Full deployment checklist and env var list.

## Responsive behavior
- **&lt;768px:** Single column, bottom nav, full-screen chat
- **768–1024px:** Content centered max-width; bottom nav still available
- **&gt;1024px:** Same stack; can extend with CSS grid sidebar later

Keyboard: `visualViewport` + safe-area padding keep input above soft keyboard on mobile.

## Known limitations
- Video/voice are UI-only “coming soon”
- Free Render sleeps after 15 min idle (cold start ~30s)
- No Alembic migrations — run SQL schema manually in Supabase
- Interest matching is simple set intersection, not ML

## Full deployment checklist

### 1. Supabase
1. Create project
2. Run master SQL schema + optional sample_data.sql
3. Enable Google provider (Auth → Providers)
4. Copy URL, anon key, service_role key, DB URI

### 2. Backend (Render)
1. New Web Service from repo `backend/`
2. Build: `pip install -r requirements.txt`
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Env: DATABASE_URL, JWT_SECRET, SUPABASE_*, ALLOWED_ORIGINS, ENVIRONMENT=production

### 3. Frontend (Vercel)
1. Import `frontend/` root
2. Build: `npm run build`
3. Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL, VITE_SOCKET_URL
4. Update ALLOWED_ORIGINS on backend with Vercel URL

## Environment variables (complete)

**Frontend**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_SOCKET_URL=
```

**Backend**
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DATABASE_URL=
JWT_SECRET=
ALLOWED_ORIGINS=
ENVIRONMENT=production
```

## Post-launch ideas
- Video via 100ms.live
- Voice via WebRTC + Metered TURN
- Spark Pro (Razorpay)
- AI icebreakers
- Language preference matching
