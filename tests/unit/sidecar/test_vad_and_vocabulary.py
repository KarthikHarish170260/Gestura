"""Unit tests for Voice Activity Detection and Vocabulary Router."""

import numpy as np
import pytest
from fastapi import HTTPException

from gestura_sidecar.db.database import get_db, init_db
from gestura_sidecar.routers.vocabulary import (
    CustomSignRequest,
    add_custom_sign,
    get_vocabulary,
    load_base_vocabulary,
)
from gestura_sidecar.stt.vad import EnergyVAD


@pytest.fixture(autouse=True)
def setup_db(tmp_path: pytest.TempPathFactory) -> None:
    init_db("sqlite:///:memory:")


def test_energy_vad_speech_detection_and_hysteresis() -> None:
    """Test VAD speech detection threshold and hysteresis state transitions."""
    vad = EnergyVAD(
        energy_threshold=0.015,
        min_speech_frames=3,
        min_silence_frames=4,
    )

    # Empty chunk
    assert vad.is_speech(np.array([], dtype=np.float32)) is False

    # Low energy silence chunk
    silence_chunk = np.zeros(1600, dtype=np.float32)
    assert vad.is_speech(silence_chunk) is False

    # High energy speech chunk (sine wave)
    t = np.linspace(0, 0.1, 1600, endpoint=False)
    speech_chunk = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    # Requires 3 consecutive frames to transition to True
    assert vad.is_speech(speech_chunk) is False
    assert vad.is_speech(speech_chunk) is False
    assert vad.is_speech(speech_chunk) is True

    # Int16 audio input should also work
    speech_int16 = (speech_chunk * 32767).astype(np.int16)
    assert vad.is_speech(speech_int16) is True

    # 4 consecutive silence chunks to transition back to False
    assert vad.is_speech(silence_chunk) is True
    assert vad.is_speech(silence_chunk) is True
    assert vad.is_speech(silence_chunk) is True
    assert vad.is_speech(silence_chunk) is False

    # Reset
    vad.is_speech(speech_chunk)
    vad.reset()
    assert vad._speech_count == 0
    assert vad._in_speech is False


def test_vocabulary_get_and_add_custom_sign() -> None:
    """Test loading base vocabulary and dynamically registering custom signs."""
    base = load_base_vocabulary()
    assert len(base["signs"]) >= 40
    assert "special_classes" in base

    with get_db() as db:
        vocab = get_vocabulary(db)
        assert vocab["total_signs"] >= 40
        assert "HELLO" in [s["id"] for s in vocab["signs"]]

        # Add custom sign
        req = CustomSignRequest(
            id="INTERPRETER",
            label="Interpreter",
            category="Medical",
            synonyms=["translator", "signing partner"],
        )
        res = add_custom_sign(req, db)
        assert res["sign"]["id"] == "INTERPRETER"

        # Verify custom sign is now in merged vocabulary
        updated_vocab = get_vocabulary(db)
        assert any(s["id"] == "INTERPRETER" for s in updated_vocab["signs"])

        # Test duplicate sign rejection (409 Conflict)
        with pytest.raises(HTTPException) as exc_info:
            add_custom_sign(req, db)
        assert exc_info.value.status_code == 409

        # Test empty sign ID rejection (400 Bad Request)
        with pytest.raises(HTTPException) as exc_bad:
            add_custom_sign(CustomSignRequest(id="", label="Empty"), db)
        assert exc_bad.value.status_code == 400
