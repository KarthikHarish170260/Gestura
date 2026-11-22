"""Unit tests for TTS priority queue and audio ducking echo-guard (TDD)."""

from gestura_sidecar.tts.ducking import EchoGuard
from gestura_sidecar.tts.player import TTSItem, TTSPriorityQueue


def test_echo_guard_state_transitions() -> None:
    """Verify EchoGuard properly activates during speech playback and releases on completion."""
    guard = EchoGuard()
    assert guard.is_tts_playing() is False
    assert guard.is_stt_muted() is False

    # Start playback
    guard.start_playback("turn-1")
    assert guard.is_tts_playing() is True
    assert guard.is_stt_muted() is True

    # Complete playback
    guard.stop_playback("turn-1")
    assert guard.is_tts_playing() is False
    assert guard.is_stt_muted() is False


def test_tts_priority_queue_ordering() -> None:
    """Verify higher priority utterances are dequeued first."""
    queue = TTSPriorityQueue()
    queue.push(TTSItem(id="msg-low", text="Normal message", priority=0))
    queue.push(TTSItem(id="msg-urgent", text="Emergency help needed!", priority=10))
    queue.push(TTSItem(id="msg-med", text="Medium message", priority=5))

    first = queue.pop()
    assert first is not None
    assert first.id == "msg-urgent"

    second = queue.pop()
    assert second is not None
    assert second.id == "msg-med"

    third = queue.pop()
    assert third is not None
    assert third.id == "msg-low"


def test_tts_queue_cancel_and_replay() -> None:
    """Verify cancelling items from queue and replaying past utterances."""
    queue = TTSPriorityQueue()
    queue.push(TTSItem(id="item-1", text="First turn", priority=1))
    queue.push(TTSItem(id="item-2", text="Second turn", priority=1))

    # Cancel item-1
    cancelled = queue.cancel("item-1")
    assert cancelled is True

    # Next item should be item-2
    next_item = queue.pop()
    assert next_item is not None
    assert next_item.id == "item-2"

    # Replay item-2
    queue.replay(next_item)
    replayed = queue.pop()
    assert replayed is not None
    assert replayed.id == "item-2"
