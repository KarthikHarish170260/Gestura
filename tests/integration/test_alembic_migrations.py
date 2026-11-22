"""Integration test for Alembic migrations upgrade and downgrade."""

from pathlib import Path

from alembic import command
from alembic.config import Config


def test_alembic_migration_roundtrip(tmp_path: Path) -> None:
    test_db = tmp_path / "migration_test.db"
    alembic_ini_path = Path("services/sidecar/alembic.ini")
    assert alembic_ini_path.exists()

    cfg = Config(str(alembic_ini_path))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{test_db.as_posix()}")
    cfg.set_main_option("script_location", "services/sidecar/alembic")

    # 1. Upgrade to head
    command.upgrade(cfg, "head")
    assert test_db.exists()

    # 2. Downgrade to base
    command.downgrade(cfg, "base")

    # 3. Upgrade back to head
    command.upgrade(cfg, "head")
