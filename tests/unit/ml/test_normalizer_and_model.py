"""Unit tests for landmark normalization and PyTorch 1D-TCN model (TDD)."""

import numpy as np
import torch

from ml.dataset.normalizer import LandmarkNormalizer
from ml.models.tcn_model import SignRecognizerTCN


def test_landmark_normalizer_math() -> None:
    """Verify landmark normalization translation, scaling, and mirror augmentation."""
    normalizer = LandmarkNormalizer()

    # Create synthetic frame: 162 coords
    # Pose landmarks: indices 126 to 161 (12 joints * 3)
    # Left shoulder = joints 1 & 2 -> index 126+3=129, Right shoulder = index 126+6=132
    raw_frame = np.zeros(162, dtype=np.float32)

    # Place left shoulder at (0.4, 0.5, 0.0)
    raw_frame[129] = 0.4
    raw_frame[130] = 0.5
    raw_frame[131] = 0.0

    # Place right shoulder at (0.6, 0.5, 0.0)
    raw_frame[132] = 0.6
    raw_frame[133] = 0.5
    raw_frame[134] = 0.0

    # Shoulder midpoint is (0.5, 0.5, 0.0), inter-shoulder distance is 0.2
    # Place right wrist (hand point) at (0.8, 0.5, 0.0)
    raw_frame[63] = 0.8
    raw_frame[64] = 0.5
    raw_frame[65] = 0.0

    normalized = normalizer.normalize_frame(raw_frame)
    # After normalization:
    # Shoulder midpoint translates to (0.0, 0.0, 0.0)
    # Inter-shoulder distance scales to 1.0 (0.2 / 0.2)
    # Right wrist relative to midpoint was (0.8 - 0.5) / 0.2 = 1.5
    assert np.isclose(normalized[63], 1.5, atol=1e-3)

    # Test mirror augmentation: x-coordinates are negated and left/right hands are swapped
    mirrored = normalizer.normalize_frame(raw_frame, mirror=True)
    assert np.isclose(mirrored[0], -1.5, atol=1e-3)


def test_tcn_model_forward_pass_dimensions() -> None:
    """Verify PyTorch model handles (batch, 32, 162) and produces (batch, 41) logits."""
    model = SignRecognizerTCN(input_dim=162, num_classes=41)
    model.eval()

    batch_size = 4
    sequence_length = 32
    input_features = 162

    dummy_input = torch.randn(batch_size, sequence_length, input_features, dtype=torch.float32)

    with torch.no_grad():
        output = model(dummy_input)

    assert output.shape == (batch_size, 41)
    # Output values should be finite real numbers (no NaNs or Infs)
    assert not torch.isnan(output).any()
    assert not torch.isinf(output).any()
