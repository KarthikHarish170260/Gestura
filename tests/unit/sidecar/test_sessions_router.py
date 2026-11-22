"""Unit tests for sessions REST API endpoints."""

import pytest
from fastapi.testclient import TestClient

from gestura_sidecar.db.database import init_db
from gestura_sidecar.main import app


@pytest.fixture(autouse=True)
def setup_db(tmp_path: pytest.TempPathFactory) -> None:
    db_file = tmp_path / "test_sessions_api.db"
    init_db(f"sqlite:///{db_file}")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_sessions_api_crud_and_export(client: TestClient) -> None:
    """Test full HTTP CRUD and export lifecycle for sessions and utterances."""
    auth_header = {"X-Gestura-Token": "default-insecure-dev-token"}

    # 1. Create session
    resp = client.post(
        "/sessions",
        headers=auth_header,
        json={"title": "Doctor Consultation", "sign_language": "ISL"},
    )
    assert resp.status_code == 201
    s_data = resp.json()
    session_id = s_data["id"]
    assert s_data["title"] == "Doctor Consultation"

    # 2. List sessions
    list_resp = client.get("/sessions", headers=auth_header)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 1

    # 3. Get single session
    get_resp = client.get(f"/sessions/{session_id}", headers=auth_header)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == session_id

    # 4. Add utterance
    utt_resp = client.post(
        f"/sessions/{session_id}/utterances",
        headers=auth_header,
        json={
            "direction": "sign_to_speech",
            "text": "Hello doctor",
            "gloss": "HELLO DOCTOR",
            "confidence": 0.95,
            "latency_ms": 110.0,
        },
    )
    assert utt_resp.status_code == 201
    utt_id = utt_resp.json()["id"]
    assert utt_id is not None

    # 5. List utterances
    utts_resp = client.get(f"/sessions/{session_id}/utterances", headers=auth_header)
    assert utts_resp.status_code == 200
    assert len(utts_resp.json()) == 1

    # 6. Export session formats
    for fmt in ["json", "txt", "html"]:
        exp_resp = client.get(f"/export/{session_id}?format={fmt}", headers=auth_header)
        assert exp_resp.status_code == 200

    # 7. Delete single session
    del_resp = client.delete(f"/sessions/{session_id}", headers=auth_header)
    assert del_resp.status_code == 204

    # 8. Not found 404 check
    not_found_resp = client.get(f"/sessions/{session_id}", headers=auth_header)
    assert not_found_resp.status_code == 404

    # 9. Wipe all sessions
    wipe_resp = client.delete("/sessions", headers=auth_header)
    assert wipe_resp.status_code == 200
    assert wipe_resp.json()["deleted_count"] >= 0
