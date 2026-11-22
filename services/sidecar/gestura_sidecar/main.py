"""FastAPI sidecar main application factory and server startup."""

from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import HTTPConnection

from gestura_sidecar.config import SidecarSettings
from gestura_sidecar.db.database import init_db
from gestura_sidecar.logging_config import configure_logging
from gestura_sidecar.metrics import REQUEST_COUNTER, export_metrics_bytes
from gestura_sidecar.routers import (
    health,
    samples,
    sessions,
    settings,
    speech,
    training,
    vocabulary,
)
from gestura_sidecar.security import verify_auth_token


def create_app(app_settings: SidecarSettings | None = None) -> FastAPI:
    """Instantiate and configure FastAPI application."""
    current_settings = app_settings or SidecarSettings()
    configure_logging(current_settings.log_level)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
        # Startup: initialize database tables
        init_db(current_settings.database_url)
        yield
        # Shutdown cleanup

    app = FastAPI(
        title=current_settings.app_name,
        version=current_settings.version,
        lifespan=lifespan,
    )

    # CORS configuration for Electron renderer local communication
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Telemetry middleware tracking HTTP requests
    @app.middleware("http")
    async def track_telemetry_requests(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response: Response = await call_next(request)
        endpoint = request.url.path
        REQUEST_COUNTER.labels(
            method=request.method,
            endpoint=endpoint,
            status=str(response.status_code),
        ).inc()
        return response

    # Prometheus metrics endpoint
    @app.get("/metrics", tags=["telemetry"])
    def get_metrics() -> Response:
        return Response(
            content=export_metrics_bytes(), media_type="text/plain; version=0.0.4; charset=utf-8"
        )

    # Public unauthenticated routers
    app.include_router(health.router)

    # Token dependency helper supporting both HTTP requests and WebSocket connections
    def auth_dependency(connection: HTTPConnection) -> str:
        token = connection.headers.get("X-Gestura-Token")
        # Allow default token if header not present on internal local web-socket or dev
        if not token and connection.scope.get("type") == "websocket":
            token = current_settings.auth_token
        return verify_auth_token(token, settings=current_settings)

    # Authenticated API routers
    app.include_router(settings.router, dependencies=[Depends(auth_dependency)])
    app.include_router(sessions.router, dependencies=[Depends(auth_dependency)])
    app.include_router(vocabulary.router, dependencies=[Depends(auth_dependency)])
    app.include_router(speech.router, dependencies=[Depends(auth_dependency)])
    app.include_router(samples.router, dependencies=[Depends(auth_dependency)])
    app.include_router(training.router, dependencies=[Depends(auth_dependency)])
    app.include_router(training.ws_router, dependencies=[Depends(auth_dependency)])

    return app


# Default app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("gestura_sidecar.main:app", host="127.0.0.1", port=8000, reload=False)
