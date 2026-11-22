"""Landmark normalizer for invariant sign language recognition."""

import numpy as np
from numpy.typing import NDArray


class LandmarkNormalizer:
    """Normalizes 162-element landmark vectors to invariant coordinate space."""

    def __init__(self, eps: float = 1e-4) -> None:
        self.eps = eps

    def normalize_frame(
        self, frame: NDArray[np.float32], mirror: bool = False
    ) -> NDArray[np.float32]:
        """Normalize a single 162-element landmark frame vector.

        Structure:
          - Left hand: 21 landmarks * 3 = [0:63]
          - Right hand: 21 landmarks * 3 = [63:126]
          - Upper pose subset (12 joints): [126:162]
            - Left shoulder: [129, 130, 131]
            - Right shoulder: [132, 133, 134]
        """
        arr = np.array(frame, dtype=np.float32).copy()
        if len(arr) != 162:
            raise ValueError(f"Expected 162-element landmark vector, got {len(arr)}")

        # Reshape to (54, 3) points
        points = arr.reshape(54, 3)

        # Pose joints start at index 42 (42 = 21 left hand + 21 right hand)
        # Joint 1: Left shoulder (index 43 in points array)
        # Joint 2: Right shoulder (index 44 in points array)
        left_shoulder = points[43]
        right_shoulder = points[44]

        # Calculate shoulder midpoint and Euclidean distance
        mid_shoulder = (left_shoulder + right_shoulder) / 2.0
        shoulder_dist = float(np.linalg.norm(left_shoulder - right_shoulder))
        scale = shoulder_dist if shoulder_dist > self.eps else 1.0

        # Translate to shoulder midpoint origin and scale by shoulder width
        normalized_points = (points - mid_shoulder) / scale

        # Optional mirror augmentation for left-handed signers
        if mirror:
            # Invert X coordinate
            normalized_points[:, 0] = -normalized_points[:, 0]
            # Swap left hand [0:21] and right hand [21:42] points
            left_hand = normalized_points[0:21].copy()
            right_hand = normalized_points[21:42].copy()
            normalized_points[0:21] = right_hand
            normalized_points[21:42] = left_hand

        res: NDArray[np.float32] = np.asarray(normalized_points.flatten(), dtype=np.float32)
        return res

    def normalize_sequence(
        self, sequence: NDArray[np.float32], mirror: bool = False
    ) -> NDArray[np.float32]:
        """Normalize a 32-frame sequence (32, 162)."""
        seq_arr = np.array(sequence, dtype=np.float32)
        out = np.zeros_like(seq_arr)
        for t in range(len(seq_arr)):
            out[t] = self.normalize_frame(seq_arr[t], mirror=mirror)
        return out
