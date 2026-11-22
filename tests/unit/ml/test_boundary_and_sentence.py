"""Unit tests for Sign Boundary Detector and Sentence Builder (TDD)."""

from ml.boundary_detector import SignBoundaryDetector
from ml.sentence_builder import SentenceBuilder


def test_boundary_detector_motion_energy_and_hysteresis() -> None:
    """Verify motion energy calculation and active sign state hysteresis."""
    detector = SignBoundaryDetector(
        motion_threshold=0.08,
        confidence_threshold=0.65,
        margin_threshold=0.15,
        debounce_frames=3,
    )

    # Idle resting state: energy is low
    rest_frame = [0.0] * 162
    assert detector.update_motion_energy(rest_frame, rest_frame) < 0.08
    assert detector.is_active_signing() is False

    # Active signing: hands moving rapidly
    active_frame_1 = [0.0] * 162
    active_frame_2 = [0.5 if i % 3 == 0 else 0.0 for i in range(162)]
    energy = detector.update_motion_energy(active_frame_1, active_frame_2)
    assert energy >= 0.08
    assert detector.is_active_signing() is True


def test_boundary_detector_confidence_and_top2_margin() -> None:
    """Verify low-confidence or ambiguous predictions are rejected."""
    detector = SignBoundaryDetector(confidence_threshold=0.65, margin_threshold=0.15)

    # Valid clear prediction: class 0 has 0.85, class 1 has 0.10 -> margin = 0.75 >= 0.15
    probs_valid = [0.85, 0.10, 0.05] + [0.0] * 38
    accepted_sign = detector.filter_prediction(
        probs_valid, class_labels=["HELLO", "HELP"] + ["OTHER"] * 39
    )
    assert accepted_sign == "HELLO"

    # Low confidence rejection: highest prob is 0.50 < 0.65
    probs_low = [0.50, 0.40, 0.10] + [0.0] * 38
    rejected_low = detector.filter_prediction(
        probs_low, class_labels=["HELLO", "HELP"] + ["OTHER"] * 39
    )
    assert rejected_low is None

    # Ambiguous margin rejection: top1 = 0.70, top2 = 0.62 -> margin = 0.08 < 0.15
    probs_ambiguous = [0.70, 0.62, 0.08] + [0.0] * 38
    rejected_ambiguous = detector.filter_prediction(
        probs_ambiguous, class_labels=["HELLO", "HELP"] + ["OTHER"] * 39
    )
    assert rejected_ambiguous is None


def test_sentence_builder_duplicate_collapse_and_pause_commit() -> None:
    """Verify duplicate collapsing and pause timeout sentence commit."""
    builder = SentenceBuilder(pause_timeout_ms=500)

    # Add duplicate consecutive signs: HELLO, HELLO, HELLO
    builder.add_sign("HELLO", timestamp_ms=1000)
    builder.add_sign("HELLO", timestamp_ms=1100)
    builder.add_sign("HELLO", timestamp_ms=1200)

    # Sentence buffer should collapse duplicates to single HELLO
    assert builder.get_current_buffer() == ["HELLO"]

    # Add next sign: DOCTOR
    builder.add_sign("DOCTOR", timestamp_ms=1300)
    assert builder.get_current_buffer() == ["HELLO", "DOCTOR"]

    # Pause rule: timestamp advances past timeout without new signs
    committed = builder.check_pause_commit(current_time_ms=1900)
    assert committed is True
    assert builder.get_committed_sentence() == "HELLO DOCTOR"
    # Buffer resets after commit
    assert builder.get_current_buffer() == []


def test_sentence_builder_edit_and_confirm() -> None:
    """Verify user can edit pending caption before TTS dispatch."""
    builder = SentenceBuilder()
    builder.add_sign("PLEASE", timestamp_ms=100)
    builder.add_sign("WATER", timestamp_ms=200)

    # Edit caption buffer directly
    builder.edit_sentence("PLEASE BRING WATER")
    assert builder.get_caption_text() == "PLEASE BRING WATER"

    # Confirm action
    final_text = builder.confirm_and_dispatch()
    assert final_text == "PLEASE BRING WATER"
    assert builder.get_caption_text() == ""
