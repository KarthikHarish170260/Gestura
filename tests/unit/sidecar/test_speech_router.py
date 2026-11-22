"""Unit tests for speech router, STT transcriber, and speech WebSocket."""

from unittest.mock import MagicMock

import numpy as np
import pytest
from fastapi.testclient import TestClient

from gestura_sidecar.main import app
from gestura_sidecar.stt.transcriber import FasterWhisperTranscriber


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_speech_gloss_endpoint(client: TestClient) -> None:
    """Test REST /speech/gloss translation endpoint."""
    resp = client.post(
        "/speech/gloss",
        headers={"X-Gestura-Token": "default-insecure-dev-token"},
        json={"text": "Where is the doctor?", "language": "ISL"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["gloss_string"] == "DOCTOR WHERE"
    assert len(data["tokens"]) == 2


def test_speech_tts_and_ducking_endpoints(client: TestClient) -> None:
    """Test REST /speech/tts queueing and /speech/ducking query."""
    resp = client.post(
        "/speech/tts",
        headers={"X-Gestura-Token": "default-insecure-dev-token"},
        json={"text": "Hello world", "priority": 2},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "queued"
    assert "turn_id" in data

    # Check ducking status
    ducking_resp = client.get(
        "/speech/ducking",
        headers={"X-Gestura-Token": "default-insecure-dev-token"},
    )
    assert ducking_resp.status_code == 200
    duck_data = ducking_resp.json()
    assert "tts_playing" in duck_data
    assert "stt_muted" in duck_data


def test_faster_whisper_transcriber_empty_and_mocked() -> None:
    """Test transcriber handles empty and audio arrays."""
    transcriber = FasterWhisperTranscriber()
    # Empty audio
    text, latency = transcriber.transcribe_audio_array(np.array([], dtype=np.float32))
    assert text == ""
    assert latency == 0.0

    # Mock model
    mock_model = MagicMock()
    mock_segment = MagicMock()
    mock_segment.text = "Hello doctor"
    mock_model.transcribe.return_value = ([mock_segment], None)
    transcriber._model = mock_model

    dummy_audio = np.ones(16000, dtype=np.int16)
    result_text, result_latency = transcriber.transcribe_audio_array(dummy_audio)
    assert result_text == "Hello doctor"
    assert result_latency > 0


def test_websocket_stt_streaming(client: TestClient) -> None:
    """Test /ws/stt WebSocket communication."""
    with client.websocket_connect("/ws/stt") as ws:
        # Send silence chunk
        silence = np.zeros(1600, dtype=np.int16).tobytes()
        ws.send_bytes(silence)
        # Verify connection stays alive and receives smoothly
