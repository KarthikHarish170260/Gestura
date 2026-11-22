"""Voice Activity Detection (VAD) for streaming audio chunks."""

from typing import Any

import numpy as np
from numpy.typing import NDArray


class EnergyVAD:
    """Energy and zero-crossing rate Voice Activity Detector for 16 kHz audio."""

    def __init__(
        self,
        energy_threshold: float = 0.015,
        sample_rate: int = 16000,
        min_speech_frames: int = 3,
        min_silence_frames: int = 10,
    ) -> None:
        self.energy_threshold = energy_threshold
        self.sample_rate = sample_rate
        self.min_speech_frames = min_speech_frames
        self.min_silence_frames = min_silence_frames
        self._speech_count = 0
        self._silence_count = 0
        self._in_speech = False

    def is_speech(self, audio_chunk: NDArray[Any]) -> bool:
        """Evaluate if an incoming 16 kHz float32/int16 PCM audio chunk contains speech."""
        if len(audio_chunk) == 0:
            return False

        # Convert int16 to float32 if needed
        if audio_chunk.dtype == np.int16:
            audio = audio_chunk.astype(np.float32) / 32768.0
        else:
            audio = audio_chunk.astype(np.float32)

        # Compute Root Mean Square (RMS) energy
        rms = float(np.sqrt(np.mean(audio**2)))

        if rms > self.energy_threshold:
            self._speech_count += 1
            self._silence_count = 0
            if self._speech_count >= self.min_speech_frames:
                self._in_speech = True
        else:
            self._silence_count += 1
            if self._silence_count >= self.min_silence_frames:
                self._speech_count = 0
                self._in_speech = False

        return self._in_speech

    def reset(self) -> None:
        """Reset internal frame counters."""
        self._speech_count = 0
        self._silence_count = 0
        self._in_speech = False
