"""Unit tests for ML training pipeline, synthetic data generation, and evaluation."""

import numpy as np

from ml.boundary_detector import SignBoundaryDetector
from ml.sentence_builder import SentenceBuilder
from ml.train import generate_synthetic_sign_dataset, train_and_export_model


def test_synthetic_sign_dataset_generation() -> None:
    """Test generating balanced synthetic landmark datasets."""
    classes = ["HELLO", "THANK-YOU", "UNKNOWN"]
    X, y = generate_synthetic_sign_dataset(classes, samples_per_class=5)
    assert len(X) == 15
    assert len(y) == 15
    assert X.shape == (15, 32, 162)
    assert np.unique(y).tolist() == [0, 1, 2]


def test_fast_training_and_export_pipeline() -> None:
    """Test 1-epoch execution of training pipeline."""
    metrics = train_and_export_model(epochs=1, batch_size=128)
    assert "test_accuracy" in metrics
    assert "macro_f1" in metrics
    assert "inference_latency_ms" in metrics
    assert "model_sizes_kb" in metrics


def test_boundary_detector_edge_cases() -> None:
    """Test edge conditions in boundary detector and sentence builder."""
    detector = SignBoundaryDetector(debounce_frames=1)
    # Consecutive duplicate debounce
    detector._last_sign = "HELLO"
    detector._frames_since_last_sign = 0
    res = detector.filter_prediction([0.9] + [0.0] * 40, class_labels=["HELLO"] + ["OTHER"] * 40)
    assert res is None  # debounced

    # UNKNOWN class rejection
    res_unknown = detector.filter_prediction(
        [0.9] + [0.0] * 40, class_labels=["UNKNOWN"] + ["OTHER"] * 40
    )
    assert res_unknown is None

    # Sentence builder edit and dispatch
    sb = SentenceBuilder(pause_timeout_ms=500.0)
    assert sb.add_sign("UNKNOWN", 10.0) is False
    assert sb.add_sign("", 10.0) is False
    sb.add_sign("HELLO", 100.0)
    sb.edit_sentence("HELLO THERE")
    assert sb.get_caption_text() == "HELLO THERE"
    dispatched = sb.confirm_and_dispatch()
    assert dispatched == "HELLO THERE"
    assert sb.get_committed_sentence() == "HELLO THERE"
    assert sb.get_caption_text() == ""
    sb.clear()
    assert sb.get_current_buffer() == []
