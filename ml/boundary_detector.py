"""Sign boundary detection with motion energy, hand presence hysteresis, and debounce."""

from collections.abc import Sequence

import numpy as np


class SignBoundaryDetector:
    """Detects sign boundaries and filters raw neural network probabilities."""

    def __init__(
        self,
        motion_threshold: float = 0.08,
        confidence_threshold: float = 0.65,
        margin_threshold: float = 0.15,
        debounce_frames: int = 4,
    ) -> None:
        self.motion_threshold = motion_threshold
        self.confidence_threshold = confidence_threshold
        self.margin_threshold = margin_threshold
        self.debounce_frames = debounce_frames

        self._current_energy = 0.0
        self._is_active = False
        self._last_sign: str | None = None
        self._frames_since_last_sign = 0

    def update_motion_energy(
        self, prev_frame: Sequence[float], curr_frame: Sequence[float]
    ) -> float:
        """Compute displacement energy of hand landmarks between consecutive frames."""
        p = np.array(prev_frame, dtype=np.float32)
        c = np.array(curr_frame, dtype=np.float32)

        if len(p) == 0 or len(c) == 0:
            self._current_energy = 0.0
            self._is_active = False
            return 0.0

        # Calculate displacement across all 162 coordinates
        displacement = np.abs(c - p)
        self._current_energy = float(np.mean(displacement))

        # Hysteresis update for active signing state
        if self._current_energy >= self.motion_threshold:
            self._is_active = True
        elif self._current_energy < (self.motion_threshold * 0.4):
            self._is_active = False

        self._frames_since_last_sign += 1
        return self._current_energy

    def is_active_signing(self) -> bool:
        """Return True if hands are currently engaged in active signing."""
        return self._is_active

    def filter_prediction(
        self,
        probabilities: Sequence[float],
        class_labels: Sequence[str],
    ) -> str | None:
        """Filter prediction by confidence threshold, top-2 margin, debounce, and unknown class."""
        probs = np.array(probabilities, dtype=np.float32)
        if len(probs) < 2:
            return None

        # Sort probability indices descending
        sorted_indices = np.argsort(probs)[::-1]
        top1_idx = int(sorted_indices[0])
        top2_idx = int(sorted_indices[1])

        top1_prob = float(probs[top1_idx])
        top2_prob = float(probs[top2_idx])
        margin = top1_prob - top2_prob

        # Confidence and margin gates
        if top1_prob < self.confidence_threshold:
            return None
        if margin < self.margin_threshold:
            return None

        candidate_label = class_labels[top1_idx]

        # Unknown / Idle class rejection
        if candidate_label.upper() == "UNKNOWN":
            return None

        # Debounce filter
        if (
            candidate_label == self._last_sign
            and self._frames_since_last_sign < self.debounce_frames
        ):
            return None

        # Valid accepted sign
        self._last_sign = candidate_label
        self._frames_since_last_sign = 0
        return candidate_label

    def reset(self) -> None:
        """Reset internal detector state."""
        self._current_energy = 0.0
        self._is_active = False
        self._last_sign = None
        self._frames_since_last_sign = 0
