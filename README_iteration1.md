# Spark — Iteration 1: Project scaffold + database + backend foundation

## What was built
A complete FastAPI backend foundation connected to Supabase PostgreSQL via async SQLAlchemy. All 8 database models matching the master schema are defined, along with full Pydantic v2 request/response schemas, rate-limiting infrastructure (slowapi), text sanitization utilities, CORS + security headers middleware, and a public health-check endpoint. No authentication, matching, or chat logic is present yet — this is the solid base for every later iteration.

## Files created / modified
| File | Action | Description |
|------|--------|-------------|
| `backend/requirements.txt` | Created | All Python dependencies pinned to exact versions |
| `backend/.env.example` | Created | Documented environment variables with setup notes |
| `backend/app/__init__.py` | Created | Package marker |
| `backend/app/database.py` | Created | Async SQLAlchemy engine, session factory, Settings, `get_db` dependency |
| `backend/app/models/models.py` | Created | All 8 ORM models (User, WaitingQueue, Session, Message, Friend, FriendMessage, Report, Block, RefreshToken) matching schema exactly |
| `backend/app/schemas/schemas.py` | Created | Pydantic v2 schemas for every model + ALLOWED_INTERESTS constant |
| `backend/app/main.py` | Created | FastAPI app, CORS whitelist, security headers, SlowAPI, `GET /health` |
| `backend/app/middleware/rate_limit.py` | Created | slowapi Limiter instance + named rate-limit strings |
| `backend/app/middleware/sanitize.py` | Created | `sanitize_text()` and `sanitize_display_name()` helpers |
| `backend/app/models/__init__.py` | Created | Package marker |
| `backend/app/schemas/__init__.py` | Created | Package marker |
| `backend/app/routers/__init__.py` | Created | Package marker (empty for now) |
| `backend/app/socket/__init__.py` | Created | Package marker (empty for now) |
| `backend/app/middleware/__init__.py` | Created | Package marker |
| `backend/app/services/__init__.py` | Created | Package marker (empty for now) |
| `frontend/` (skeleton dirs) | Created | Empty directory tree prepared for later iterations |

## How to run

### 1. Set up Supabase (one-time)
1. Create a free project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings → API** and copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY`
3. Go to **Project Settings → Database** and copy the connection string (URI).  
   Convert it to asyncpg form:  
   `postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.[REF].supabase.co:5432/postgres`
4. Open the **SQL Editor** and run the full schema from the master prompt (the `CREATE TABLE` statements + indexes).  
   Make sure the `pgcrypto` extension is enabled (the first line does this).

### 2. Local backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create .env from the example and fill real values
cp .env.example .env
# Edit .env with your Supabase credentials and a generated JWT_SECRET:
#   openssl rand -hex 32

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at `http://localhost:8000`.

## How to test
1. Start the server with the command above.
2. Open a browser or use curl:
   ```bash
   curl http://localhost:8000/health
   ```
3. Expected response:
   ```json
   {
     "status": "ok",
     "environment": "development",
     "version": "0.1.0"
   }
   ```
4. Confirm security headers are present:
   ```bash
   curl -I http://localhost:8000/health
   ```
   You should see:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin`
5. Visit `http://localhost:8000/docs` (only in development) to see the interactive OpenAPI docs.
6. Optional: Verify the database connection by importing models in a Python shell (requires valid `DATABASE_URL`):
   ```python
   from app.models.models import User, Session, Message
   print(User.__tablename__)  # → users
   ```

## Security implemented this iteration
- CORS restricted to `ALLOWED_ORIGINS` environment variable only
- Security headers on every response (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`)
- Rate-limiter infrastructure ready (slowapi) — login limit will be applied in Iteration 2
- Input sanitization helpers that strip HTML tags, control characters, and enforce length limits
- All models use server-side defaults and CHECK constraints matching the SQL schema
- No sensitive data accepted via query strings (enforced by design; body/header only)
- Environment-based settings via pydantic-settings (secrets never hard-coded)

## Known issues / limitations
- Database tables must be created manually in the Supabase SQL editor (no Alembic migrations yet)
- Rate limits are configured but not yet applied to any routes (no auth/match routes exist)
- Frontend is only a directory skeleton — no React code yet
- Socket.io, authentication, match engine, chat, friends, and moderation are intentionally absent
- Free Render instances sleep after 15 min idle; health checks will cold-start the service later

## What is NOT built yet
- Google OAuth + JWT authentication (Iteration 2)
- User profile create/update/delete endpoints (Iteration 2)
- Frontend login, onboarding, and protected routes (Iteration 2)
- Match queue + Socket.io server (Iteration 3)
- Real-time chat + profanity filter (Iteration 4)
- Friends system (Iteration 5)
- Profile, settings, dark mode, PWA (Iteration 6)
- Responsive tablet/desktop layouts + deployment polish (Iteration 7)
