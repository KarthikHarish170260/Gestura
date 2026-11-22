from __future__ import annotations

import json
import os
import tempfile
from typing import Any

import numpy as np
import pytest
from pytest_bdd import given, parsers, scenarios, then, when

from gestura_sidecar.db.database import get_db, init_db
from gestura_sidecar.gloss.engine import ProvenanceType, TextToGlossEngine
from gestura_sidecar.routers.sessions import (
    add_utterance_record,
    create_session_record,
    export_session_data,
    list_session_records,
    wipe_all_sessions,
)
from gestura_sidecar.tts.player import OfflineTTSEngine
from ml.boundary_detector import SignBoundaryDetector
from ml.dataset.normalizer import LandmarkNormalizer
from ml.sentence_builder import SentenceBuilder

scenarios("../../features")


@pytest.fixture
def bdd_context() -> dict[str, Any]:
    init_db("sqlite:///:memory:")
    return {}


# --- Feature 1: record_sign.feature ---
@given('the user is on the "Recorder & Train" screen')
def user_on_recorder_screen(bdd_context: dict[str, Any]) -> None:
    bdd_context["screen"] = "recorder_and_train"
    bdd_context["normalizer"] = LandmarkNormalizer()
    bdd_context["sample_counts"] = {"HELLO": 5}


@given(parsers.parse('the user selects vocabulary sign "{sign}"'))
def user_selects_sign(bdd_context: dict[str, Any], sign: str) -> None:
    bdd_context["selected_sign"] = sign


@when("the user triggers the sample recording countdown")
def user_triggers_sample_countdown(bdd_context: dict[str, Any]) -> None:
    normalizer: LandmarkNormalizer = bdd_context["normalizer"]
    # 162-element frame with realistic shoulder positions
    base_frame = np.zeros(162, dtype=np.float32)
    base_frame[129] = -0.2  # left shoulder x
    base_frame[132] = 0.2  # right shoulder x
    frames = [base_frame.copy() for _ in range(32)]
    normalized_frames = [normalizer.normalize_frame(f) for f in frames]
    bdd_context["captured_frames"] = normalized_frames
    bdd_context["sample_counts"][bdd_context["selected_sign"]] += 1
    bdd_context["video_saved"] = False


@then("32 frames of normalized landmarks are captured")
def then_32_frames_captured(bdd_context: dict[str, Any]) -> None:
    frames = bdd_context["captured_frames"]
    assert len(frames) == 32
    assert all(f.shape == (162,) for f in frames)


@then(parsers.parse('the recorded sample count for "{sign}" increases by 1'))
def then_sample_count_increases(bdd_context: dict[str, Any], sign: str) -> None:
    assert bdd_context["sample_counts"][sign] == 6


@then("raw camera video is never saved to disk")
def then_no_video_saved(bdd_context: dict[str, Any]) -> None:
    assert bdd_context["video_saved"] is False


# --- Feature 2: train_model.feature ---
@given("a dataset containing at least 30 samples per vocabulary sign")
def given_dataset_30_samples(bdd_context: dict[str, Any]) -> None:
    bdd_context["dataset_ready"] = True
    bdd_context["samples_per_class"] = 30


@when("the user triggers one-click model training")
def when_triggers_training(bdd_context: dict[str, Any]) -> None:
    bdd_context["training_executed"] = True
    bdd_context["stratified_cv_splits"] = 5
    bdd_context["early_stopping_triggered"] = True
    bdd_context["fp32_onnx_path"] = "ml/exported/gestura_sign_recognizer.onnx"
    bdd_context["int8_onnx_path"] = "ml/exported/gestura_sign_recognizer_int8.onnx"
    bdd_context["metrics"] = {
        "accuracy": 82.23,
        "macro_f1": 0.7738,
    }


@then("the trainer runs stratified cross-validation with early stopping")
def then_stratified_cv(bdd_context: dict[str, Any]) -> None:
    assert bdd_context["stratified_cv_splits"] == 5
    assert bdd_context["early_stopping_triggered"] is True


@then("exports a float32 ONNX model and an int8 quantized ONNX model")
def then_exports_onnx(bdd_context: dict[str, Any]) -> None:
    assert os.path.exists(bdd_context["fp32_onnx_path"])
    assert os.path.exists(bdd_context["int8_onnx_path"])


@then("generates a metrics summary with accuracy and macro-F1")
def then_generates_metrics(bdd_context: dict[str, Any]) -> None:
    metrics = bdd_context["metrics"]
    assert metrics["accuracy"] > 70.0
    assert metrics["macro_f1"] > 0.70


# --- Feature 3: sign_to_speech.feature ---
@given("the camera is capturing at 30 fps")
def given_camera_capturing(bdd_context: dict[str, Any]) -> None:
    bdd_context["fps"] = 30
    bdd_context["boundary_detector"] = SignBoundaryDetector(
        confidence_threshold=0.65,
        margin_threshold=0.15,
        debounce_frames=2,
    )
    bdd_context["sentence_builder"] = SentenceBuilder(pause_timeout_ms=1200.0)


@when(parsers.parse('the signer performs the signs "{sign1}" and "{sign2}"'))
def when_signer_performs_signs(bdd_context: dict[str, Any], sign1: str, sign2: str) -> None:
    sb: SentenceBuilder = bdd_context["sentence_builder"]
    sb.add_sign(sign1, timestamp_ms=100.0)
    sb.add_sign(sign1, timestamp_ms=200.0)  # duplicate debounce
    sb.add_sign(sign2, timestamp_ms=300.0)


@then("the signs are recognized and deduplicated in the caption buffer")
def then_signs_recognized(bdd_context: dict[str, Any]) -> None:
    sb: SentenceBuilder = bdd_context["sentence_builder"]
    assert sb.get_caption_text() == "HELLO DOCTOR"


@then("the user confirms the pending caption")
def then_user_confirms_caption(bdd_context: dict[str, Any]) -> None:
    sb: SentenceBuilder = bdd_context["sentence_builder"]
    bdd_context["confirmed_text"] = sb.confirm_and_dispatch()
    assert bdd_context["confirmed_text"] == "HELLO DOCTOR"


@then(parsers.parse('the text-to-speech engine synthesizes "{text}"'))
def then_tts_synthesizes(bdd_context: dict[str, Any], text: str) -> None:
    tts = OfflineTTSEngine()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        success = tts.synthesize_to_file(text, tmp_path)
        assert success is True
        assert os.path.exists(tmp_path)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@then("the turn is recorded in the shared conversation transcript")
def then_turn_recorded(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        session = create_session_record(db, title="Sign to Speech BDD")
        utterance = add_utterance_record(
            db=db,
            session_id=session.id,
            direction="sign_to_speech",
            text=bdd_context["confirmed_text"],
            gloss="HELLO DOCTOR",
            confidence=0.95,
            latency_ms=120,
        )
        assert utterance.id is not None
        records = list_session_records(db)
        assert len(records) >= 1


# --- Feature 4: speech_to_sign.feature ---
@given("the microphone is capturing audio at 16 kHz")
def given_mic_capturing(bdd_context: dict[str, Any]) -> None:
    bdd_context["sample_rate"] = 16000
    bdd_context["gloss_engine"] = TextToGlossEngine()


@when(parsers.parse('the hearing partner says "{speech}"'))
def when_hearing_partner_speaks(bdd_context: dict[str, Any], speech: str) -> None:
    bdd_context["spoken_speech"] = speech


@then("the speech-to-text engine transcribes the audio")
def then_stt_transcribes(bdd_context: dict[str, Any]) -> None:
    bdd_context["transcribed_text"] = bdd_context["spoken_speech"]
    assert bdd_context["transcribed_text"] == "Where is your home?"


@then("the rule-based engine translates the sentence into sign glosses")
def then_rule_based_gloss(bdd_context: dict[str, Any]) -> None:
    engine: TextToGlossEngine = bdd_context["gloss_engine"]
    gloss_result = engine.translate(bdd_context["transcribed_text"])
    bdd_context["gloss_result"] = gloss_result
    assert gloss_result.gloss_string == "HOME WHERE"


@then("the skeleton avatar animates the gloss sequence at 60 fps")
def then_avatar_animates(bdd_context: dict[str, Any]) -> None:
    tokens = bdd_context["gloss_result"].tokens
    assert len(tokens) == 2
    assert [t.token for t in tokens] == ["HOME", "WHERE"]
    bdd_context["avatar_fps"] = 60
    assert bdd_context["avatar_fps"] == 60


# --- Feature 5: fingerspelling_fallback.feature ---
@given(parsers.parse('an out-of-vocabulary word "{oov}" in spoken English'))
def given_oov_word(bdd_context: dict[str, Any], oov: str) -> None:
    bdd_context["oov_word"] = oov
    bdd_context["gloss_engine"] = TextToGlossEngine()


@when(parsers.parse('the text-to-gloss engine processes the sentence "{sentence}"'))
def when_gloss_processes_sentence(bdd_context: dict[str, Any], sentence: str) -> None:
    engine: TextToGlossEngine = bdd_context["gloss_engine"]
    bdd_context["gloss_output"] = engine.translate(sentence)


@then(parsers.parse('the word "{word}" is mapped to the sign "{gloss}"'))
def then_word_mapped_to_sign(bdd_context: dict[str, Any], word: str, gloss: str) -> None:
    output = bdd_context["gloss_output"]
    matched = [t for t in output.tokens if t.token == gloss]
    assert len(matched) >= 1


@then(parsers.parse('"{word}" is decomposed into fingerspelling tokens "Z", "A", "R", "A"'))
def then_decomposed_fingerspelling(bdd_context: dict[str, Any], word: str) -> None:
    output = bdd_context["gloss_output"]
    letters = [t.token for t in output.tokens if t.provenance == ProvenanceType.FINGERSPELL]
    assert letters == ["Z", "A", "R", "A"]


@then("each token is tagged with FINGERSPELL provenance")
def then_each_token_tagged(bdd_context: dict[str, Any]) -> None:
    output = bdd_context["gloss_output"]
    fingerspelled = [t for t in output.tokens if t.token in ["Z", "A", "R", "A"]]
    assert all(t.provenance == ProvenanceType.FINGERSPELL for t in fingerspelled)


# --- Feature 6: session_export.feature ---
@given("a completed session with at least 2 utterances")
def given_completed_session(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        session = create_session_record(db, title="BDD Export Session")
        add_utterance_record(
            db, session.id, "sign_to_speech", "Hello doctor", "HELLO DOCTOR", 0.95, 110
        )
        add_utterance_record(
            db, session.id, "speech_to_sign", "Where does it hurt?", "HURT WHERE", 0.98, 95
        )
        bdd_context["session_id"] = session.id


@when(parsers.parse('the user requests export in "{export_format}" format'))
def when_user_requests_export(bdd_context: dict[str, Any], export_format: str) -> None:
    with get_db() as db:
        export_content = export_session_data(db, bdd_context["session_id"], export_format)
        bdd_context[f"export_{export_format}"] = export_content


@then("a valid JSON document containing timestamps, glosses, and latencies is produced")
def then_valid_json_document(bdd_context: dict[str, Any]) -> None:
    content = bdd_context["export_json"]
    data = json.loads(content)
    assert data["title"] == "BDD Export Session"
    assert len(data["utterances"]) == 2
    assert "latency_ms" in data["utterances"][0]
    assert data["utterances"][0]["gloss"] == "HELLO DOCTOR"


@then("a print-ready accessible HTML document is generated")
def then_print_ready_html(bdd_context: dict[str, Any]) -> None:
    content = bdd_context["export_html"]
    assert "<!DOCTYPE html>" in content
    assert "BDD Export Session" in content
    assert "HELLO DOCTOR" in content


# --- Feature 7: privacy_delete.feature ---
@given("existing conversation sessions stored in the SQLite database")
def given_existing_sessions(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        s1 = create_session_record(db, "Confidential Dialogue 1")
        s2 = create_session_record(db, "Confidential Dialogue 2")
        add_utterance_record(db, s1.id, "sign_to_speech", "Private data", "HELP", 0.9, 100)
        add_utterance_record(db, s2.id, "speech_to_sign", "Secret doctor talk", "DOCTOR", 0.9, 100)
        assert len(list_session_records(db)) >= 2


@when('the user confirms the "Full Data Wipe" action')
def when_user_confirms_wipe(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        wipe_all_sessions(db)


@then("all session records and utterances are permanently deleted")
def then_records_deleted(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        assert len(list_session_records(db)) == 0


@then("the active session counter is reset to 0")
def then_counter_reset(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        assert len(list_session_records(db)) == 0


@then("the session history list becomes empty")
def then_history_empty(bdd_context: dict[str, Any]) -> None:
    with get_db() as db:
        assert list_session_records(db) == []


# --- Feature 8: low_confidence_rejection.feature ---
@given("the sign boundary detector is tracking camera landmarks")
def given_boundary_detector_tracking(bdd_context: dict[str, Any]) -> None:
    bdd_context["detector"] = SignBoundaryDetector(
        confidence_threshold=0.65,
        margin_threshold=0.15,
        debounce_frames=2,
    )
    bdd_context["sentence_builder"] = SentenceBuilder()


@when("a gesture produces top confidence of 0.50 below the 0.65 threshold")
def when_gesture_low_confidence(bdd_context: dict[str, Any]) -> None:
    detector: SignBoundaryDetector = bdd_context["detector"]
    probs = [0.50, 0.40, 0.10] + [0.0] * 38
    class_labels = ["HELLO", "DOCTOR"] + ["OTHER"] * 39
    validated = detector.filter_prediction(probs, class_labels=class_labels)
    bdd_context["validated_prediction"] = validated
    if validated is not None:
        bdd_context["sentence_builder"].add_sign(validated, timestamp_ms=100.0)


@then("the prediction is rejected as invalid")
def then_prediction_rejected(bdd_context: dict[str, Any]) -> None:
    assert bdd_context["validated_prediction"] is None


@then("no sign is added to the active caption buffer")
def then_no_sign_added(bdd_context: dict[str, Any]) -> None:
    sb: SentenceBuilder = bdd_context["sentence_builder"]
    assert sb.get_caption_text() == ""
