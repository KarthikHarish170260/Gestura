"""Offline speech-to-text transcriber wrapping faster-whisper."""

import threading
import time
from typing import Any

import numpy as np
from numpy.typing import NDArray

from gestura_sidecar.metrics import STT_LATENCY


class FasterWhisperTranscriber:
    """Offline Whisper transcription using int8 CPU quantization."""

    def __init__(
        self,
        model_size: str = "base.en",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model: Any = None
        self._lock = threading.Lock()

    def _ensure_model_loaded(self) -> None:
        """Lazy load the Whisper model on first request."""
        if self._model is None:
            with self._lock:
                if self._model is None:
                    from faster_whisper import WhisperModel

                    self._model = WhisperModel(
                        self.model_size,
                        device=self.device,
                        compute_type=self.compute_type,
                    )

    def transcribe_audio_array(
        self, audio: NDArray[Any], sample_rate: int = 16000
    ) -> tuple[str, float]:
        """Transcribe a 1D float32 numpy audio array. Returns (transcript, latency_sec)."""
        start_time = time.perf_counter()

        if len(audio) == 0:
            return "", 0.0

        # Ensure audio is float32 normalized to [-1.0, 1.0]
        if audio.dtype == np.int16:
            audio_data = audio.astype(np.float32) / 32768.0
        else:
            audio_data = audio.astype(np.float32)

        self._ensure_model_loaded()

        segments, _info = self._model.transcribe(
            audio_data,
            beam_size=1,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        texts = [segment.text.strip() for segment in segments]
        final_text = " ".join(texts).strip()
        latency = time.perf_counter() - start_time
        STT_LATENCY.observe(latency)

        return final_text, latency
