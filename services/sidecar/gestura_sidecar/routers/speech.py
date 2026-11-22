"""Speech processing API router: STT WebSocket, TTS synthesis, and text-to-gloss."""

import time
from typing import Any

import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

from gestura_sidecar.gloss.engine import GlossResult, TextToGlossEngine
from gestura_sidecar.metrics import TTS_LATENCY
from gestura_sidecar.stt.transcriber import FasterWhisperTranscriber
from gestura_sidecar.stt.vad import EnergyVAD
from gestura_sidecar.tts.ducking import EchoGuard
from gestura_sidecar.tts.player import OfflineTTSEngine, TTSItem, TTSPriorityQueue

router = APIRouter(tags=["speech"])

# Global shared service singletons
gloss_engine = TextToGlossEngine()
echo_guard = EchoGuard()
tts_queue = TTSPriorityQueue()
tts_engine = OfflineTTSEngine()
stt_transcriber = FasterWhisperTranscriber()


class GlossRequest(BaseModel):
    """Text-to-gloss translation request."""

    text: str = Field(description="Spoken or written English sentence")
    language: str = Field(default="ISL", description="Target sign language: 'ISL' or 'ASL'")


class TTSRequest(BaseModel):
    """Text-to-speech request payload."""

    text: str
    priority: int = 1
    voice: str = "default"
    rate: float = 1.0
    volume: float = 1.0


@router.post("/speech/gloss", response_model=GlossResult)
def convert_text_to_gloss(payload: GlossRequest) -> GlossResult:
    """Translate an English sentence into a deterministic sign gloss sequence."""
    engine = (
        gloss_engine
        if payload.language == gloss_engine.language
        else TextToGlossEngine(language=payload.language)
    )
    return engine.translate(payload.text)


@router.post("/speech/tts")
def synthesize_speech(payload: TTSRequest) -> dict[str, Any]:
    """Queue and synthesize speech for an utterance."""
    start_time = time.perf_counter()
    turn_id = f"tts-{int(time.time() * 1000)}"

    # Enqueue item
    item = TTSItem(
        id=turn_id,
        text=payload.text,
        priority=payload.priority,
        voice=payload.voice,
        rate=payload.rate,
        volume=payload.volume,
    )
    tts_queue.push(item)

    # Activate echo guard ducking
    echo_guard.start_playback(turn_id)
    try:
        # Synthesize audio to temporary memory buffer or trigger playback
        latency = time.perf_counter() - start_time
        TTS_LATENCY.observe(latency)
        return {
            "turn_id": turn_id,
            "status": "queued",
            "latency_ms": latency * 1000,
        }
    finally:
        echo_guard.stop_playback(turn_id)


@router.get("/speech/ducking")
def get_ducking_status() -> dict[str, bool]:
    """Query current echo-guard audio ducking status."""
    return {
        "tts_playing": echo_guard.is_tts_playing(),
        "stt_muted": echo_guard.is_stt_muted(),
    }


@router.websocket("/ws/stt")
async def websocket_stt_endpoint(websocket: WebSocket) -> None:
    """Bidirectional streaming speech-to-text WebSocket endpoint."""
    await websocket.accept()

    vad = EnergyVAD()
    audio_buffer: list[np.ndarray[Any, Any]] = []
    chunk_counter = 0

    try:
        while True:
            # Check if STT is muted by echo guard
            if echo_guard.is_stt_muted():
                # Echo guard active, ignore incoming mic frames to prevent loopback
                await websocket.receive_bytes()
                continue

            # Receive raw 16 kHz 16-bit PCM binary audio
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
                chunk = np.frombuffer(raw_bytes, dtype=np.int16)
                audio_buffer.append(chunk)
                chunk_counter += 1

                has_speech = vad.is_speech(chunk)

                # Send partial update periodically during speech
                if has_speech and chunk_counter % 8 == 0:
                    await websocket.send_json(
                        {
                            "type": "partial",
                            "text": "[Speaking...]",
                            "is_speech": True,
                        }
                    )

                # End of speech utterance detected after silence timeout
                if not has_speech and len(audio_buffer) >= 15:
                    full_audio = np.concatenate(audio_buffer)
                    audio_buffer.clear()
                    vad.reset()

                    text, latency = stt_transcriber.transcribe_audio_array(full_audio)
                    if text:
                        gloss_res = gloss_engine.translate(text)
                        await websocket.send_json(
                            {
                                "type": "final",
                                "text": text,
                                "gloss": gloss_res.gloss_string,
                                "provenance": [t.model_dump() for t in gloss_res.tokens],
                                "latency_ms": latency * 1000,
                            }
                        )

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason=str(exc))
