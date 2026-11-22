# GESTURA

Offline, Single-Device, Bidirectional Sign-Language Communication App.

GESTURA enables real-time bidirectional conversation between a Deaf or hard-of-hearing person and a hearing person on a single laptop operating entirely offline.

## Core Capabilities
- **Sign -> Speech/Text**: Captures user signing via webcam, recognizes 40 isolated signs and fingerspelling with a normalized 1D-TCN/GRU sliding window model, synthesizes speech with offline TTS, and renders editable live captions.
- **Speech -> Sign**: Captures audio, streams partial transcriptions via offline `faster-whisper`, maps spoken language to sign glosses deterministically, and renders a 60 fps skeletal avatar signing the gloss sequence.
- **Privacy & Safety**: Runs completely offline without cloud APIs or telemetry. Raw camera video is never saved; only landmark telemetry is recorded with explicit user consent.

## Architecture
- `apps/desktop`: Electron + Vite + React 18 + TypeScript desktop shell.
- `services/sidecar`: Python 3.11 FastAPI sidecar for STT, TTS, gloss mapping, and SQLite storage.
- `ml`: PyTorch sign recognition models, 32-frame sliding window, ONNX FP32 and int8 dynamic quantization.
- `data`: 40-word ISL/ASL vocabulary and avatar animation templates.
