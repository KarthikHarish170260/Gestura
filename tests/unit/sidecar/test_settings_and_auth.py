"""Unit tests for settings management, SUS scoring, and authentication middleware (TDD)."""

import pytest
from fastapi.testclient import TestClient

from gestura_sidecar.config import SidecarSettings
from gestura_sidecar.db.database import init_db
from gestura_sidecar.main import create_app


@pytest.fixture
def client_with_token(tmp_path: pytest.TempPathFactory) -> tuple[TestClient, str]:
    """Provide a TestClient with a registered secret token and temporary database."""
    db_file = tmp_path / "test_settings.db"
    settings = SidecarSettings(
        auth_token="test-secret-token-xyz-1234567890",
        database_url=f"sqlite:///{db_file}",
    )
    init_db(settings.database_url)
    app = create_app(settings)
    return TestClient(app), settings.auth_token


def test_auth_protection_on_endpoints(client_with_token: tuple[TestClient, str]) -> None:
    """Verify endpoints require X-Gestura-Token header except /health and /metrics."""
    client, token = client_with_token

    # Health and metrics are unauthenticated
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "ok"

    metrics_resp = client.get("/metrics")
    assert metrics_resp.status_code == 200

    # Protected routes fail without token
    unauth_resp = client.get("/settings")
    assert unauth_resp.status_code == 401

    # Protected routes succeed with correct token
    auth_resp = client.get("/settings", headers={"X-Gestura-Token": token})
    assert auth_resp.status_code == 200


def test_update_and_retrieve_settings(client_with_token: tuple[TestClient, str]) -> None:
    """Verify settings CRUD functionality."""
    client, token = client_with_token
    headers = {"X-Gestura-Token": token}

    # Initial settings
    get_res = client.get("/settings", headers=headers)
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "sign_language" in settings

    # Update sign language and high contrast theme
    put_res = client.put(
        "/settings",
        json={"sign_language": "ASL", "high_contrast": True, "caption_font_size": 24},
        headers=headers,
    )
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["sign_language"] == "ASL"
    assert updated["high_contrast"] is True
    assert updated["caption_font_size"] == 24


def test_sus_questionnaire_scoring(client_with_token: tuple[TestClient, str]) -> None:
    """Verify System Usability Scale (SUS) 10-item submission and score calculation."""
    client, token = client_with_token
    headers = {"X-Gestura-Token": token}

    # Standard 10-item answers (1-5 scale)
    # Perfect score: odd items = 5 (score 4), even items = 1 (score 4) -> 10 * 4 * 2.5 = 100
    perfect_answers = [5, 1, 5, 1, 5, 1, 5, 1, 5, 1]
    res = client.post(
        "/settings/sus",
        json={"answers": perfect_answers},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["score"] == 100.0

    # Average score check: all 3s -> odd (3-1=2), even (5-3=2) -> 10 * 2 * 2.5 = 50
    avg_answers = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
    res_avg = client.post(
        "/settings/sus",
        json={"answers": avg_answers},
        headers=headers,
    )
    assert res_avg.status_code == 200
    assert res_avg.json()["score"] == 50.0
