"""Authentication verification for local sidecar communications."""

import hmac
from typing import Annotated

from fastapi import Header, HTTPException, status

from gestura_sidecar.config import SidecarSettings


def verify_auth_token(
    token_candidate: Annotated[str | None, Header(alias="X-Gestura-Token")] = None,
    settings: SidecarSettings | None = None,
) -> str:
    """Validate caller authentication token via constant-time comparison."""
    if not token_candidate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication header X-Gestura-Token",
        )

    expected = settings.auth_token if settings else "default-insecure-dev-token"
    if not hmac.compare_digest(token_candidate.strip(), expected.strip()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token provided",
        )
    return token_candidate
