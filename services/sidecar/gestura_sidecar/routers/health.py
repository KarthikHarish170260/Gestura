"""Health check API router."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Health check payload."""

    status: str
    version: str
    sidecar: bool
    mode: str


@router.get("/health", response_model=HealthResponse)
def get_health_status() -> HealthResponse:
    """Return runtime sidecar health status."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        sidecar=True,
        mode="offline",
    )
