"""Sentence builder with duplicate collapsing, pause commit rule, and editable captions."""


class SentenceBuilder:
    """Accumulates isolated sign predictions into coherent sentences."""

    def __init__(self, pause_timeout_ms: float = 1200.0) -> None:
        self.pause_timeout_ms = pause_timeout_ms

        self._buffer: list[str] = []
        self._last_sign_time_ms = 0.0
        self._committed_sentence = ""
        self._caption_text = ""

    def add_sign(self, sign: str, timestamp_ms: float) -> bool:
        """Add recognized sign to buffer with consecutive duplicate collapsing."""
        if not sign or sign.upper() == "UNKNOWN":
            return False

        # Collapse consecutive duplicate
        if self._buffer and self._buffer[-1] == sign:
            self._last_sign_time_ms = timestamp_ms
            return False

        self._buffer.append(sign)
        self._last_sign_time_ms = timestamp_ms
        self._caption_text = " ".join(self._buffer)
        return True

    def check_pause_commit(self, current_time_ms: float) -> bool:
        """Commit sentence if elapsed pause duration exceeds threshold."""
        if not self._buffer:
            return False

        elapsed = current_time_ms - self._last_sign_time_ms
        if elapsed >= self.pause_timeout_ms:
            self._committed_sentence = " ".join(self._buffer)
            self._buffer.clear()
            self._caption_text = ""
            return True

        return False

    def get_current_buffer(self) -> list[str]:
        """Return uncommitted signs currently in the accumulator."""
        return list(self._buffer)

    def get_committed_sentence(self) -> str:
        """Return the most recently committed sentence."""
        return self._committed_sentence

    def edit_sentence(self, text: str) -> None:
        """Allow user manual editing of pending caption before speech synthesis."""
        self._caption_text = text.strip()

    def get_caption_text(self) -> str:
        """Get live caption preview text."""
        return self._caption_text

    def confirm_and_dispatch(self) -> str:
        """Confirm caption text and dispatch for TTS, clearing active caption."""
        final_text = self._caption_text
        self._committed_sentence = final_text
        self._buffer.clear()
        self._caption_text = ""
        return final_text

    def clear(self) -> None:
        """Clear active buffer and caption."""
        self._buffer.clear()
        self._caption_text = ""
        self._last_sign_time_ms = 0.0
