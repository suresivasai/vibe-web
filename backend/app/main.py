# backend/app/main.py
# Purpose: FastAPI application entry point — CORS, security headers, routers, Socket.io
# Iteration: 3 (auth routers from 2, socket mount from 3)

from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.database import settings
from app.middleware.rate_limit import limiter
from app.schemas.schemas import HealthResponse
from app.routers import auth, users, match, friends, reports, blocks
from app.socket.events import sio
from app.services.cleanup import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hooks."""
    print(f"[Vibe] Starting in {settings.ENVIRONMENT} mode")
    start_scheduler()
    yield
    stop_scheduler()
    print("[Vibe] Shutting down")


fastapi_app = FastAPI(
    title="Vibe API",
    description="Mobile-first random stranger chat backend",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

# Attach rate limiter
fastapi_app.state.limiter = limiter
fastapi_app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
fastapi_app.add_middleware(SlowAPIMiddleware)

# CORS — whitelist only
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin"],
    expose_headers=["X-Request-ID"],
)


@fastapi_app.middleware("http")
async def security_headers_middleware(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
    return response


@fastapi_app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        environment=settings.ENVIRONMENT,
        version="0.1.0",
    )


@fastapi_app.get("/", tags=["System"])
async def root():
    return JSONResponse(
        content={
            "name": "Vibe API",
            "version": "0.1.0",
            "docs": "/docs" if settings.ENVIRONMENT == "development" else "disabled",
            "health": "/health",
        }
    )


# Routers
fastapi_app.include_router(auth.router, prefix="/auth", tags=["Auth"])
fastapi_app.include_router(users.router, prefix="/users", tags=["Users"])
fastapi_app.include_router(match.router, prefix="/match", tags=["Match"])
fastapi_app.include_router(friends.router, prefix="/friends", tags=["Friends"])
fastapi_app.include_router(reports.router, prefix="/reports", tags=["Reports"])
fastapi_app.include_router(blocks.router, prefix="/blocks", tags=["Blocks"])

# Mount Socket.io on FastAPI
# Client connects to same origin; Socket.io handles /socket.io/ path
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
