# Spark — Random Stranger Chat (Mobile-first)

Production-oriented Omegle-style app: Google login, gender + interest matching, real-time text chat, friends, moderation, PWA.

## Stack
- **Frontend:** React 18, Vite, Tailwind, Zustand, Socket.io-client, Supabase JS
- **Backend:** FastAPI, python-socketio, SQLAlchemy 2 async, slowapi, better-profanity, APScheduler
- **Infra (free):** Vercel + Render + Supabase

## Quick start

### Database
Run the SQL schema from the master prompt in Supabase SQL Editor, then optionally `backend/sample_data.sql`.

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill values
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
cp .env.example .env   # fill values
npm install
npm run dev
```

## Iteration docs
- [Iteration 1](./README_iteration1.md) — Scaffold + models
- [Iteration 2](./README_iteration2.md) — Auth
- [Iteration 3](./README_iteration3.md) — Match + WebSocket
- [Iteration 4](./README_iteration4.md) — Chat + moderation
- [Iteration 5](./README_iteration5.md) — Friends
- [Iteration 6](./README_iteration6.md) — Profile + PWA
- [Iteration 7](./README_iteration7.md) — Polish + deploy

## License
Built for learning / launch. Use at your own risk; enforce 18+ and local laws.
