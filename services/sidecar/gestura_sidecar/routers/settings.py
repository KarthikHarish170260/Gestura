"""Settings persistence and SUS usability assessment API router."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from gestura_sidecar.db.database import get_db_dependency
from gestura_sidecar.db.models import SettingModel, SUSResponseModel

router = APIRouter(tags=["settings"])

DEFAULT_SETTINGS: dict[str, Any] = {
    "sign_language": "ISL",
    "high_contrast": False,
    "large_type": False,
    "caption_font_size": 18,
    "confidence_threshold": 0.65,
    "margin_threshold": 0.15,
    "debounce_frames": 5,
    "pause_commit_ms": 1200,
    "tts_voice": "default",
    "tts_rate": 1.0,
    "tts_volume": 1.0,
    "input_mic_device": "default",
    "output_speaker_device": "default",
    "camera_device": "default",
    "left_handed": False,
}


class SUSSubmissionRequest(BaseModel):
    """System Usability Scale 10-item answer submission."""

    answers: list[int] = Field(
        min_length=10,
        max_length=10,
        description="10 integer answers on a 1-5 Likert scale",
    )


class SUSSubmissionResponse(BaseModel):
    """Calculated SUS usability score output."""

    id: str
    score: float
    grade: str
    adjective: str


def calculate_sus_score(answers: list[int]) -> float:
    """Compute standard SUS score (0-100 scale)."""
    if len(answers) != 10:
        raise ValueError("SUS requires exactly 10 responses")

    odd_sum = sum(score - 1 for i, score in enumerate(answers) if i % 2 == 0)
    even_sum = sum(5 - score for i, score in enumerate(answers) if i % 2 == 1)
    total = (odd_sum + even_sum) * 2.5
    return float(round(total, 2))


def get_sus_grade(score: float) -> tuple[str, str]:
    """Map numeric SUS score to percentile grade and adjective descriptor."""
    if score >= 85.0:
        return "A+", "Excellent"
    elif score >= 80.0:
        return "A", "Good"
    elif score >= 70.0:
        return "B", "Acceptable"
    elif score >= 60.0:
        return "C", "Marginal"
    elif score >= 50.0:
        return "D", "Poor"
    return "F", "Unacceptable"


@router.get("/settings", response_model=dict[str, Any])
def get_all_settings(db: Session = Depends(get_db_dependency)) -> dict[str, Any]:
    """Fetch stored user settings merged with system defaults."""
    stored_records = db.scalars(select(SettingModel)).all()
    result = dict(DEFAULT_SETTINGS)
    for record in stored_records:
        result[record.key] = record.value
    return result


@router.put("/settings", response_model=dict[str, Any])
def update_settings(
    updates: dict[str, Any], db: Session = Depends(get_db_dependency)
) -> dict[str, Any]:
    """Upsert individual user settings."""
    for key, val in updates.items():
        existing = db.get(SettingModel, key)
        if existing:
            existing.value = val
        else:
            db.add(SettingModel(key=key, value=val))
    db.flush()
    return get_all_settings(db)


@router.post("/settings/sus", response_model=SUSSubmissionResponse)
def submit_sus_survey(
    submission: SUSSubmissionRequest, db: Session = Depends(get_db_dependency)
) -> SUSSubmissionResponse:
    """Submit 10-item SUS evaluation, calculate score and persist result."""
    for val in submission.answers:
        if val < 1 or val > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All SUS question answers must be between 1 and 5",
            )

    score = calculate_sus_score(submission.answers)
    grade, adjective = get_sus_grade(score)

    record = SUSResponseModel(score=score, answers=submission.answers)
    db.add(record)
    db.flush()

    return SUSSubmissionResponse(
        id=record.id,
        score=score,
        grade=grade,
        adjective=adjective,
    )
