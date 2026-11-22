"""Echo guard and audio ducking state coordinator."""

import threading


class EchoGuard:
    """Synchronizes audio channels to prevent speaker audio from echoing into the microphone."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._playing_turns: set[str] = set()

    def start_playback(self, turn_id: str) -> None:
        """Mark TTS playback as active for a turn, muting microphone STT."""
        with self._lock:
            self._playing_turns.add(turn_id)

    def stop_playback(self, turn_id: str) -> None:
        """Mark TTS playback as ended, un-muting microphone STT when queue empties."""
        with self._lock:
            self._playing_turns.discard(turn_id)

    def is_tts_playing(self) -> bool:
        """Return True if TTS audio is currently playing."""
        with self._lock:
            return len(self._playing_turns) > 0

    def is_stt_muted(self) -> bool:
        """Return True if microphone STT should be muted to prevent feedback."""
        return self.is_tts_playing()
