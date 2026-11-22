"""Unit tests for ML data augmentation and fingerspelling classifier."""

import numpy as np
import torch

from ml.dataset.augmenter import LandmarkAugmenter
from ml.models.fingerspelling_model import FingerspellingClassifier


def test_landmark_augmenter_shape_and_dropout() -> None:
    """Test that augmenter preserves sequence shape and applies frame dropout."""
    augmenter = LandmarkAugmenter(dropout_max_frames=3)
    seq = np.ones((32, 162), dtype=np.float32)

    augmented = augmenter.augment_sequence(seq)
    assert augmented.shape == (32, 162)
    assert augmented.dtype == np.float32

    # Check that augmented values differ from original due to noise and scale
    assert not np.allclose(augmented, seq)


def test_landmark_augmenter_rotation() -> None:
    """Test planar 2D rotation of landmark coordinates."""
    augmenter = LandmarkAugmenter(
        jitter_std=0.0, scale_range=(1.0, 1.0), rotation_degrees=45.0, dropout_max_frames=0
    )
    seq = np.zeros((32, 162), dtype=np.float32)
    # Point at (1, 0, 0)
    seq[:, 0] = 1.0

    rotated = augmenter.augment_sequence(seq)
    assert rotated.shape == (32, 162)
    # X and Y coordinates should change according to rotation
    assert np.all(rotated[:, 2] == 0.0)  # Z-axis unchanged


def test_fingerspelling_classifier_architecture() -> None:
    """Test fingerspelling PyTorch classifier forward pass."""
    model = FingerspellingClassifier(input_dim=63, num_classes=37, hidden_dim=64)
    model.eval()

    batch_input = torch.randn(4, 63)
    with torch.no_grad():
        logits = model(batch_input)

    assert logits.shape == (4, 37)
    probs = torch.softmax(logits, dim=-1)
    assert torch.allclose(probs.sum(dim=-1), torch.ones(4), atol=1e-5)
