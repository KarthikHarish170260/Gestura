"""SQLAlchemy persistence models for sessions, utterances, samples, and preferences."""

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def current_utc_time() -> datetime:
    """Return timezone-aware current UTC time."""
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Base declarative model class."""

    pass


class SessionModel(Base):
    """Conversation session metadata."""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), default="Conversation")
    sign_language: Mapped[str] = mapped_column(String(16), default="ISL")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=current_utc_time)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=current_utc_time, onupdate=current_utc_time
    )

    utterances: Mapped[list["UtteranceModel"]] = relationship(
        "UtteranceModel",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="UtteranceModel.timestamp",
    )


class UtteranceModel(Base):
    """Single dialogue turn in either sign->speech or speech->sign direction."""

    __tablename__ = "utterances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    direction: Mapped[str] = mapped_column(String(32))  # 'sign_to_speech' or 'speech_to_sign'
    text: Mapped[str] = mapped_column(Text)
    gloss: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    token_provenance: Mapped[Any] = mapped_column(JSON, default=list)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=current_utc_time, index=True)

    session: Mapped[SessionModel] = relationship("SessionModel", back_populates="utterances")


class SignSampleModel(Base):
    """User-recorded gesture landmark sequence for offline model fine-tuning and templates."""

    __tablename__ = "sign_samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gloss: Mapped[str] = mapped_column(String(64), index=True)
    sample_index: Mapped[int] = mapped_column(Integer, default=0)
    user_profile: Mapped[str] = mapped_column(String(64), default="default")
    num_frames: Mapped[int] = mapped_column(Integer, default=32)
    quality_score: Mapped[float] = mapped_column(Float, default=1.0)
    landmark_data: Mapped[Any] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=current_utc_time)


class SettingModel(Base):
    """Persisted user configuration key-value storage."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[Any] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=current_utc_time, onupdate=current_utc_time
    )


class SUSResponseModel(Base):
    """System Usability Scale survey submission record."""

    __tablename__ = "sus_responses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    score: Mapped[float] = mapped_column(Float)
    answers: Mapped[Any] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=current_utc_time)
