"""Sample recordings management API router."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from gestura_sidecar.db.database import get_db_dependency
from gestura_sidecar.db.models import SignSampleModel

router = APIRouter(tags=["samples"])


class SampleCreateRequest(BaseModel):
    """Payload to record a new sign landmark sample."""

    gloss: str = Field(min_length=1, max_length=64)
    landmark_data: list[Any] = Field(
        description="Sequence of frames containing landmark coordinates"
    )
    num_frames: int = Field(default=32, ge=1)
    quality_score: float = Field(default=1.0, ge=0.0, le=1.0)
    user_profile: str = Field(default="default", max_length=64)


class SampleResponse(BaseModel):
    """Metadata of a saved sign sample."""

    id: str
    gloss: str
    sample_index: int
    user_profile: str
    num_frames: int
    quality_score: float
    created_at: datetime


class SampleDetailResponse(SampleResponse):
    """Full detail of a sign sample including raw landmarks."""

    landmark_data: list[Any]


@router.post("/samples", response_model=SampleResponse, status_code=status.HTTP_201_CREATED)
def create_sample(
    payload: SampleCreateRequest, db: Session = Depends(get_db_dependency)
) -> SampleResponse:
    """Save a user-recorded landmark sample sequence."""
    # Compute auto-incremented sample_index for this gloss and profile
    count_query = select(func.count(SignSampleModel.id)).where(
        SignSampleModel.gloss == payload.gloss.upper(),
        SignSampleModel.user_profile == payload.user_profile,
    )
    existing_count = db.scalar(count_query) or 0

    sample = SignSampleModel(
        gloss=payload.gloss.upper(),
        sample_index=existing_count + 1,
        user_profile=payload.user_profile,
        num_frames=payload.num_frames,
        quality_score=payload.quality_score,
        landmark_data=payload.landmark_data,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    return SampleResponse(
        id=sample.id,
        gloss=sample.gloss,
        sample_index=sample.sample_index,
        user_profile=sample.user_profile,
        num_frames=sample.num_frames,
        quality_score=sample.quality_score,
        created_at=sample.created_at,
    )


@router.get("/samples", response_model=list[SampleResponse])
def list_samples(
    gloss: str | None = Query(default=None),
    user_profile: str | None = Query(default=None),
    db: Session = Depends(get_db_dependency),
) -> list[SampleResponse]:
    """List saved landmark samples with optional filters."""
    query = select(SignSampleModel).order_by(SignSampleModel.gloss, SignSampleModel.sample_index)
    if gloss:
        query = query.where(SignSampleModel.gloss == gloss.upper())
    if user_profile:
        query = query.where(SignSampleModel.user_profile == user_profile)

    records = db.scalars(query).all()
    return [
        SampleResponse(
            id=r.id,
            gloss=r.gloss,
            sample_index=r.sample_index,
            user_profile=r.user_profile,
            num_frames=r.num_frames,
            quality_score=r.quality_score,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/samples/{sample_id}", response_model=SampleDetailResponse)
def get_sample(sample_id: str, db: Session = Depends(get_db_dependency)) -> SampleDetailResponse:
    """Retrieve full sample landmark data by ID."""
    sample = db.get(SignSampleModel, sample_id)
    if not sample:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found")
    return SampleDetailResponse(
        id=sample.id,
        gloss=sample.gloss,
        sample_index=sample.sample_index,
        user_profile=sample.user_profile,
        num_frames=sample.num_frames,
        quality_score=sample.quality_score,
        landmark_data=sample.landmark_data,
        created_at=sample.created_at,
    )


@router.delete("/samples/{sample_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sample(sample_id: str, db: Session = Depends(get_db_dependency)) -> None:
    """Delete a sample by ID."""
    sample = db.get(SignSampleModel, sample_id)
    if not sample:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sample not found")
    db.delete(sample)
    db.commit()
