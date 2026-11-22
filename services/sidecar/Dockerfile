# Multi-stage non-root container for GESTURA backend sidecar
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast wheel resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY pyproject.toml README.md ./
COPY services/sidecar ./services/sidecar
COPY ml ./ml

RUN uv venv /opt/venv && \
    VIRTUAL_ENV=/opt/venv uv pip install --no-cache-dir .

# Final runtime image
FROM python:3.11-slim AS runtime

WORKDIR /app

# Non-root user setup
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

COPY --from=builder --chown=appuser:appgroup /opt/venv /opt/venv
COPY --chown=appuser:appgroup services/sidecar /app/services/sidecar
COPY --chown=appuser:appgroup ml /app/ml
COPY --chown=appuser:appgroup data /app/data

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH="/app:/app/services/sidecar" \
    GESTURA_HOST="0.0.0.0" \
    GESTURA_PORT=8000

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["uvicorn", "gestura_sidecar.main:app", "--host", "0.0.0.0", "--port", "8000"]
