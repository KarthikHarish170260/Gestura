# GESTURA One-Step Setup Script for Windows PowerShell
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   GESTURA: Offline Bidirectional Sign App Setup          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Error "Python 3.11 is required but was not found on PATH. Please install Python 3.11."
    exit 1
}
Write-Host "[1/6] Found Python: $($pythonCmd.Source)" -ForegroundColor Green

# 2. Check Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error "Node.js (>= 18.0.0) is required but was not found on PATH."
    exit 1
}
Write-Host "[2/6] Found Node.js: $(node -v)" -ForegroundColor Green

# 3. Setup Virtual Environment using uv
Write-Host "[3/6] Configuring Python virtual environment with uv..." -ForegroundColor Cyan
$uvCmd = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uvCmd) {
    Write-Host "Installing uv package manager..."
    python -m pip install uv
}

if (-not (Test-Path ".venv")) {
    uv venv --python 3.11
}

# 4. Install Python Dependencies
Write-Host "[4/6] Installing Python backend sidecar & ML dependencies..." -ForegroundColor Cyan
uv pip install -e ".[dev]"

# 5. Install Node.js Dependencies
Write-Host "[5/6] Installing desktop Electron & React packages..." -ForegroundColor Cyan
npm install

# 6. Pre-train & Export Baseline ML Models
Write-Host "[6/6] Pre-training & Exporting baseline 1D-TCN ONNX models..." -ForegroundColor Cyan
.venv\Scripts\python.exe ml/train.py

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   GESTURA Setup Complete! Run:                           " -ForegroundColor Green
Write-Host "   npm --workspace=apps/desktop run dev                   " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
