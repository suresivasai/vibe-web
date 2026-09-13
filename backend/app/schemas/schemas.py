# backend/app/schemas/schemas.py
# Purpose: Pydantic v2 request/response schemas for all Spark models
# Iteration: 1

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# Allowed interest tags (must match master prompt exactly)
# ---------------------------------------------------------------------------
# (Interests removed)

Gender = Literal["male", "female", "other"]
SessionStatus = Literal["active", "ended", "reported"]
FriendStatus = Literal["pending", "accepted", "blocked"]
ReportReason = Literal[
    "inappropriate_content", "nudity", "harassment", "underage", "spam"
]


# ---------------------------------------------------------------------------
# User schemas
# ---------------------------------------------------------------------------
class UserBase(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=30)
    gender: Gender

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        cleaned = "".join(c for c in v if c.isalnum() or c.isspace() or c in "._'-").strip()
        if not cleaned or len(cleaned) < 2:
            raise ValueError("Display name must be at least 2 characters")
        if len(cleaned) > 24:
            raise ValueError("Display name max 24 characters")
        # Block pure numbers / very generic
        if cleaned.replace(" ", "").isdigit():
            raise ValueError("Display name cannot be only numbers")
        return cleaned


class UserCreate(UserBase):
    email: EmailStr
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=30)
    gender: Optional[Gender] = None
    avatar_url: Optional[str] = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = "".join(c for c in v if c.isalnum() or c.isspace() or c in "._'-").strip()
        if not cleaned or len(cleaned) < 2:
            raise ValueError("Display name must be at least 2 characters")
        if len(cleaned) > 24:
            raise ValueError("Display name max 24 characters")
        if cleaned.replace(" ", "").isdigit():
            raise ValueError("Display name cannot be only numbers")
        return cleaned


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str
    avatar_url: Optional[str] = None
    gender: Gender
    is_banned: bool
    ban_until: Optional[datetime] = None
    report_count: int
    created_at: datetime
    last_seen: datetime


class UserPublic(BaseModel):
    """Limited public view of a user (for match / friend lists)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    display_name: str
    avatar_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth schemas
# ---------------------------------------------------------------------------
class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., description="Google ID token from client")

class LocalRegisterRequest(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=6)
    display_name: str = Field(..., min_length=2, max_length=24)

class LocalLoginRequest(BaseModel):
    email: EmailStr = Field(...)
    password: str = Field(...)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Waiting queue / Match schemas
# ---------------------------------------------------------------------------
class JoinQueueRequest(BaseModel):
    """Empty body accepted — matching is pure FIFO."""
    pass


class WaitingQueueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    gender: Gender
    joined_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user1_id: Optional[UUID] = None
    user2_id: Optional[UUID] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: SessionStatus


class MatchedPayload(BaseModel):
    session_id: UUID
    stranger: UserPublic


# ---------------------------------------------------------------------------
# Message schemas
# ---------------------------------------------------------------------------
class SendMessageRequest(BaseModel):
    session_id: UUID
    content: str = Field(..., min_length=1, max_length=500)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    sender_id: Optional[UUID] = None
    content: str
    is_flagged: bool
    sent_at: datetime


# ---------------------------------------------------------------------------
# Friend schemas
# ---------------------------------------------------------------------------
class FriendRequestCreate(BaseModel):
    target_user_id: UUID


class FriendResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    requester_id: UUID
    receiver_id: UUID
    status: FriendStatus
    created_at: datetime
    # Optional nested public user info filled by router
    other_user: Optional[UserPublic] = None


class FriendMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    friend_id: UUID
    sender_id: Optional[UUID] = None
    content: str
    is_read: bool
    sent_at: datetime


class FriendChatPage(BaseModel):
    messages: list[FriendMessageOut]
    page: int
    limit: int
    has_more: bool


# ---------------------------------------------------------------------------
# Report schemas
# ---------------------------------------------------------------------------
class ReportCreate(BaseModel):
    reported_id: UUID
    session_id: Optional[UUID] = None
    reason: ReportReason


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reporter_id: Optional[UUID] = None
    reported_id: UUID
    session_id: Optional[UUID] = None
    reason: ReportReason
    created_at: datetime


# ---------------------------------------------------------------------------
# Block schemas
# ---------------------------------------------------------------------------
class BlockCreate(BaseModel):
    blocked_id: UUID


class BlockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    blocker_id: UUID
    blocked_id: UUID
    created_at: datetime


# ---------------------------------------------------------------------------
# Health / generic
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str = "0.1.0"
