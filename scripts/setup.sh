#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   GESTURA: Offline Bidirectional Sign App Setup          "
echo "=========================================================="

# 1. Check Python
if ! command -v python3 &> /dev/null; then
    echo "Python 3.11 is required but was not found on PATH."
    exit 1
fi
echo "[1/6] Found Python: $(python3 --version)"

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js (>= 18.0.0) is required but was not found on PATH."
    exit 1
fi
echo "[2/6] Found Node.js: $(node --version)"

# 3. Setup Virtual Environment using uv
echo "[3/6] Configuring Python virtual environment with uv..."
if ! command -v uv &> /dev/null; then
    echo "Installing uv package manager..."
    python3 -m pip install uv
fi

if [ ! -d ".venv" ]; then
    uv venv --python 3.11
fi

# 4. Install Python Dependencies
echo "[4/6] Installing Python backend sidecar & ML dependencies..."
uv pip install -e ".[dev]"

# 5. Install Node.js Dependencies
echo "[5/6] Installing desktop Electron & React packages..."
npm install

# 6. Pre-train & Export Baseline ML Models
echo "[6/6] Pre-training & Exporting baseline 1D-TCN ONNX models..."
.venv/bin/python ml/train.py

echo "=========================================================="
echo "   GESTURA Setup Complete! Run:                           "
echo "   npm --workspace=apps/desktop run dev                   "
echo "=========================================================="
