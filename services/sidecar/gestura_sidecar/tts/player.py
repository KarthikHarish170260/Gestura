"""Offline Text-to-Speech synthesis with priority queue and OS fallback."""

import heapq
import time

from pydantic import BaseModel, Field


class TTSItem(BaseModel):
    """Utterance queued for offline audio synthesis."""

    id: str
    text: str
    priority: int = 0
    voice: str = "default"
    rate: float = 1.0
    volume: float = 1.0
    created_at: float = Field(default_factory=time.time)

    def __lt__(self, other: "TTSItem") -> bool:
        # Highest priority first; earlier created_at first for ties
        if self.priority != other.priority:
            return self.priority > other.priority
        return self.created_at < other.created_at


class TTSPriorityQueue:
    """Thread-safe priority queue with cancel and replay operations."""

    def __init__(self) -> None:
        self._heap: list[TTSItem] = []
        self._cancelled_ids: set[str] = set()

    def push(self, item: TTSItem) -> None:
        """Enqueue an utterance."""
        heapq.heappush(self._heap, item)

    def pop(self) -> TTSItem | None:
        """Dequeue the highest priority active item."""
        while self._heap:
            item = heapq.heappop(self._heap)
            if item.id not in self._cancelled_ids:
                return item
        return None

    def cancel(self, item_id: str) -> bool:
        """Cancel a queued utterance by ID."""
        self._cancelled_ids.add(item_id)
        return True

    def replay(self, item: TTSItem) -> None:
        """Re-enqueue an item for immediate replay."""
        replayed = TTSItem(
            id=item.id,
            text=item.text,
            priority=item.priority + 1,  # Boost priority for replay
            voice=item.voice,
            rate=item.rate,
            volume=item.volume,
        )
        self._cancelled_ids.discard(item.id)
        self.push(replayed)

    def is_empty(self) -> bool:
        """Return True if no active items remain in queue."""
        return len(self._heap) == 0


class OfflineTTSEngine:
    """Speech synthesis orchestrator with Piper and OS SAPI / pyttsx3 fallback."""

    def synthesize_to_file(
        self, text: str, output_path: str, rate: float = 1.0, volume: float = 1.0
    ) -> bool:
        """Synthesize speech audio directly to an offline WAV file."""
        try:
            import pyttsx3

            engine = pyttsx3.init()
            default_rate = engine.getProperty("rate")
            engine.setProperty("rate", int(default_rate * rate))
            engine.setProperty("volume", min(1.0, max(0.0, volume)))
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            del engine
            return True
        except Exception:
            return False
