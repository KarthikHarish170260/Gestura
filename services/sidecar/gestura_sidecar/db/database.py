"""Database session factory and SQLite WAL configuration."""

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from gestura_sidecar.db.models import Base

_engine: Engine | None = None
_SessionFactory: sessionmaker[Session] | None = None


@event.listens_for(Engine, "connect")
def configure_sqlite_pragmas(dbapi_connection: Any, _connection_record: Any) -> None:
    """Enforce WAL mode and foreign key integrity on SQLite connections."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


def init_db(database_url: str = "sqlite:///gestura.db") -> Engine:
    """Initialize SQLite database engine and create schema tables."""
    global _engine, _SessionFactory

    # Connect args for SQLite thread safety
    connect_args = {"check_same_thread": False} if "sqlite" in database_url else {}
    _engine = create_engine(database_url, connect_args=connect_args)
    _SessionFactory = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=_engine)
    return _engine


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """Yield a transactional database session context manager."""
    global _SessionFactory
    if _SessionFactory is None:
        init_db()
    assert _SessionFactory is not None

    session = _SessionFactory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db_dependency() -> Generator[Session, None, None]:
    """FastAPI request-scoped database dependency."""
    with get_db() as db:
        yield db
