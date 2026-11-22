# GESTURA Operations Runbook & Setup Guide

## 1. Prerequisites

- **Operating System**: Windows 10/11 (x64) primary; macOS / Ubuntu 22.04+ supported.
- **Node.js**: v18.0.0 or higher (`node -v`, `npm -v`).
- **Python**: v3.11.x installed (`python --version`).
- **uv**: Fast Python package manager (`uv --version`) (installed automatically by setup script).
- **Hardware**: Standard laptop webcam (720p or 1080p), internal microphone, and stereo speakers.

---

## 2. One-Command Setup

### On Windows (PowerShell)
```powershell
.\scripts\setup.ps1
```

### On Linux / macOS (Bash)
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script automatically:
1. Verifies Node.js and Python 3.11 presence.
2. Installs `uv` if missing and creates `.venv` virtual environment.
3. Installs all Python sidecar and ML dependencies (`torch`, `faster-whisper`, `fastapi`, `onnxruntime`, etc.).
4. Installs all Node.js workspace dependencies across `apps/desktop`.
5. Pre-trains and exports the baseline 1D-TCN model into `ml/exported/`.
6. Executes smoke verification tests.

---

## 3. Running GESTURA in Development

### Option A: Simultaneous App Launch (Electron + Sidecar)
```powershell
# In terminal 1: Start Python Sidecar
.venv\Scripts\python.exe -m uvicorn gestura_sidecar.main:app --host 127.0.0.1 --port 8000

# In terminal 2: Start Vite Dev Server / Electron Desktop
npm --workspace=apps/desktop run dev
```

### Option B: Electron Standalone Launch
```powershell
npm --workspace=apps/desktop run dev
```
Navigate to `http://localhost:5173` in any modern Chromium browser or the Electron window.

---

## 4. Verification & Testing Commands

### Python Test Suite (Unit, Property, BDD & Coverage)
```powershell
# Run full 47-test suite with line coverage report (Target >= 85%)
.venv\Scripts\pytest.exe --cov=gestura_sidecar --cov=ml tests/

# Run BDD Gherkin scenarios only (8 scenarios)
.venv\Scripts\pytest.exe tests/bdd/ -v

# Run Hypothesis property-based invariants (300 iterations)
.venv\Scripts\pytest.exe tests/property/ -v
```

### Frontend E2E & Accessibility Suite (Playwright + Axe)
```powershell
# Run all 10 Playwright E2E tests (including WCAG 2.2 AA accessibility audit)
npm --workspace=apps/desktop run build:vite
npm --workspace=apps/desktop run test:e2e
```

### Static Analysis & Linter Verification
```powershell
# Python linting and strict typecheck
.venv\Scripts\ruff.exe check .
.venv\Scripts\mypy.exe services/sidecar ml

# TypeScript strict typecheck and ESLint
npm --workspace=apps/desktop run lint
npm --workspace=apps/desktop run typecheck
```

### Reproducible Benchmarks
```powershell
# 1. Speech & Gloss Latency Benchmark
.venv\Scripts\python.exe scripts/benchmark_speech.py

# 2. CodeCarbon Sustainability & Energy Profiler
.venv\Scripts\python.exe scripts/measure_sustainability.py

# 3. AST Mutation Testing Suite
.venv\Scripts\python.exe scripts/run_mutation_testing.py
```

---

## 5. Production Packaging

To build standalone Windows desktop installers and portable executables:
```powershell
npm --workspace=apps/desktop run build:win
```
The packaged standalone executable is output to `apps/desktop/release/`.

---

## 6. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **Port 8000 Conflict** | Another process is occupying `127.0.0.1:8000`. | Set `GESTURA_PORT=8001` or run `netstat -ano \| findstr :8000` to terminate the conflicting process. |
| **Camera Access Denied** | Operating system or browser camera permission blocked. | The app automatically displays an informative fallback notice and switches to simulated landmark streaming mode. |
| **Missing X-Gestura-Token** | Client did not provide authentication header. | In development, send `X-Gestura-Token: default-insecure-dev-token`. |
| **Microphone Feedback Loop** | Single-laptop acoustic echo from TTS speaker into mic. | GESTURA's built-in `EchoGuard` state manager automatically ducks and mutes STT capture while TTS audio synthesizes and plays. |
