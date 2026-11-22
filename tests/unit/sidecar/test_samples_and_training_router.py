"""Unit tests for samples and training API endpoints and event WebSocket."""

import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from gestura_sidecar.config import SidecarSettings
from gestura_sidecar.db.database import init_db
from gestura_sidecar.main import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    db_file = tmp_path / "test_samples_train.db"
    settings = SidecarSettings(
        database_url=f"sqlite:///{db_file.as_posix()}",
        auth_token="test-secret-token",
    )
    init_db(settings.database_url)
    app = create_app(settings)
    return TestClient(app)


def test_samples_crud_lifecycle(client: TestClient) -> None:
    headers = {"X-Gestura-Token": "test-secret-token"}

    # 1. Upload first sample for HELLO
    dummy_landmarks = [[0.0] * 162 for _ in range(32)]
    payload1 = {
        "gloss": "HELLO",
        "landmark_data": dummy_landmarks,
        "num_frames": 32,
        "quality_score": 0.95,
        "user_profile": "tester",
    }
    resp1 = client.post("/samples", json=payload1, headers=headers)
    assert resp1.status_code == 201
    sample1 = resp1.json()
    assert sample1["gloss"] == "HELLO"
    assert sample1["sample_index"] == 1
    sample_id = sample1["id"]

    # 2. Upload second sample for HELLO
    payload2 = {
        "gloss": "HELLO",
        "landmark_data": dummy_landmarks,
        "num_frames": 32,
        "quality_score": 0.98,
        "user_profile": "tester",
    }
    resp2 = client.post("/samples", json=payload2, headers=headers)
    assert resp2.status_code == 201
    sample2 = resp2.json()
    assert sample2["sample_index"] == 2

    # 3. List samples filtered by gloss
    list_resp = client.get("/samples?gloss=HELLO", headers=headers)
    assert list_resp.status_code == 200
    samples = list_resp.json()
    assert len(samples) == 2

    # 4. Get sample detail by ID
    detail_resp = client.get(f"/samples/{sample_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == sample_id
    assert len(detail["landmark_data"]) == 32

    # 5. Delete sample
    del_resp = client.delete(f"/samples/{sample_id}", headers=headers)
    assert del_resp.status_code == 204

    # 6. Verify 404 after deletion
    del_check = client.get(f"/samples/{sample_id}", headers=headers)
    assert del_check.status_code == 404


def test_sample_validation_rejection(client: TestClient) -> None:
    headers = {"X-Gestura-Token": "test-secret-token"}
    # Quality score out of bounds
    invalid_payload = {
        "gloss": "HELLO",
        "landmark_data": [],
        "quality_score": 1.5,
    }
    resp = client.post("/samples", json=invalid_payload, headers=headers)
    assert resp.status_code == 422


def test_models_management(client: TestClient) -> None:
    headers = {"X-Gestura-Token": "test-secret-token"}

    # List available models
    models_resp = client.get("/models", headers=headers)
    assert models_resp.status_code == 200
    models = models_resp.json()
    assert isinstance(models, list)
    assert len(models) >= 1

    model_names = [m["id"] for m in models]
    target_model = model_names[0]

    # Activate model
    act_resp = client.post(f"/models/{target_model}/activate", headers=headers)
    assert act_resp.status_code == 200
    assert act_resp.json()["active_model"] == target_model


def test_training_status_and_cancel(client: TestClient) -> None:
    headers = {"X-Gestura-Token": "test-secret-token"}

    status_resp = client.get("/train/status", headers=headers)
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "status" in status_data
    assert "epoch" in status_data

    # Cancel when no job running should return 400
    if status_data["status"] == "idle":
        cancel_resp = client.post("/train/cancel", headers=headers)
        assert cancel_resp.status_code == 400


def test_start_training_flow(client: TestClient) -> None:
    headers = {"X-Gestura-Token": "test-secret-token"}
    train_payload = {
        "epochs": 2,
        "batch_size": 16,
        "learning_rate": 0.001,
        "samples_per_class": 5,
    }
    resp = client.post("/train", json=train_payload, headers=headers)
    assert resp.status_code in (202, 409)

    # Poll status briefly
    for _ in range(5):
        st = client.get("/train/status", headers=headers).json()
        if st["status"] in ("running", "completed", "cancelled"):
            break
        time.sleep(0.05)

    assert st["status"] in ("running", "completed", "cancelled", "idle")


def test_websocket_events(client: TestClient) -> None:
    with client.websocket_connect("/ws/events") as websocket:
        data = websocket.receive_json()
        assert data["type"] == "connection_established"
        # Send ping
        websocket.send_json({"type": "ping"})
        pong = websocket.receive_json()
        assert pong["type"] == "pong"
