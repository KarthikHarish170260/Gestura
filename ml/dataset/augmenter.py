"""Data augmentation pipeline for sign landmark sequences."""

import numpy as np
from numpy.typing import NDArray


class LandmarkAugmenter:
    """Applies realistic spatial and temporal augmentations to landmark trajectories."""

    def __init__(
        self,
        jitter_std: float = 0.015,
        scale_range: tuple[float, float] = (0.92, 1.08),
        rotation_degrees: float = 8.0,
        dropout_max_frames: int = 2,
    ) -> None:
        self.jitter_std = jitter_std
        self.scale_range = scale_range
        self.rotation_degrees = rotation_degrees
        self.dropout_max_frames = dropout_max_frames

    def augment_sequence(self, sequence: NDArray[np.float32]) -> NDArray[np.float32]:
        """Apply combined augmentations to a (32, 162) sequence."""
        out = np.array(sequence, dtype=np.float32).copy()
        time_steps, features = out.shape

        # 1. Gaussian noise jitter
        noise = np.random.normal(0, self.jitter_std, size=out.shape).astype(np.float32)
        out += noise

        # 2. Random spatial scaling
        scale = float(np.random.uniform(self.scale_range[0], self.scale_range[1]))
        out *= scale

        # 3. Random 2D planar rotation (around z-axis)
        angle_rad = np.radians(np.random.uniform(-self.rotation_degrees, self.rotation_degrees))
        cos_a = np.cos(angle_rad)
        sin_a = np.sin(angle_rad)

        reshaped = out.reshape(time_steps, 54, 3)
        x = reshaped[:, :, 0]
        y = reshaped[:, :, 1]
        reshaped[:, :, 0] = x * cos_a - y * sin_a
        reshaped[:, :, 1] = x * sin_a + y * cos_a
        out = reshaped.reshape(time_steps, features)

        # 4. Random frame dropout (zeroing out up to dropout_max_frames)
        num_drops = np.random.randint(0, self.dropout_max_frames + 1)
        if num_drops > 0:
            drop_indices = np.random.choice(time_steps, size=num_drops, replace=False)
            out[drop_indices] = 0.0

        return out.astype(np.float32)
