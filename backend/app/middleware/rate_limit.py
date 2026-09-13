# backend/app/middleware/rate_limit.py
# Purpose: slowapi rate limiter configuration for Spark API
# Iteration: 1

from slowapi import Limiter
from slowapi.util import get_remote_address

# Global limiter instance — key function uses client IP
limiter = Limiter(key_func=get_remote_address)

# Named rate-limit strings used across routers (documented for clarity)
# Login:          5/min per IP
# Match join:     10/min per user  (applied in later iterations with user key)
# Send message:   30/min per session
# Report submit:  3/hour per user
# Friend request: 20/day per user

RATE_LIMITS = {
    "login": "5/minute",
    "match_join": "10/minute",
    "send_message": "30/minute",
    "report": "3/hour",
    "friend_request": "20/day",
}
