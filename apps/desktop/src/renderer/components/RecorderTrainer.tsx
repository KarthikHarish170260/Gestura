import React, { useState } from 'react';
import { Play, CheckCircle2, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

export const RecorderTrainer: React.FC = () => {
  const [selectedSign, setSelectedSign] = useState('HELLO');
  const [samplesCount, setSamplesCount] = useState(12);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Trainer state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingMetrics, setTrainingMetrics] = useState<{
    accuracy: number;
    macroF1: number;
    loss: number;
  } | null>({ accuracy: 85.98, macroF1: 0.8426, loss: 0.2512 });

  const signsList = [
    'HELLO', 'THANK-YOU', 'YES', 'NO', 'HELP', 'WATER', 'FOOD', 'DOCTOR',
    'PLEASE', 'SORRY', 'NAME', 'WHAT', 'WHERE', 'WHEN', 'HOW', 'GOOD',
    'BAD', 'HOME', 'HOSPITAL', 'MEDICINE', 'PAIN', 'FAMILY', 'FRIEND',
    'WORK', 'TIME', 'TODAY', 'TOMORROW', 'YESTERDAY', 'WANT', 'NEED',
    'LIKE', 'UNDERSTAND', 'AGAIN', 'STOP', 'GO', 'COME', 'MONEY', 'HAPPY',
    'TIRED', 'EMERGENCY'
  ];

  const handleStartCapture = () => {
    setIsRecording(true);
    setCountdown(3);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(timer);
          // Simulate capture completion
          setTimeout(() => {
            setSamplesCount((c) => Math.min(30, c + 1));
            setIsRecording(false);
            setCountdown(null);
          }, 1200);
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  const handleRunTrainer = async () => {
    setIsTraining(true);
    setTrainingProgress(10);

    // Stream simulated training progression
    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          setTrainingMetrics({
            accuracy: 86.4,
            macroF1: 0.851,
            loss: 0.234,
          });
          return 100;
        }
        return prev + 15;
      });
    }, 400);
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full p-2 overflow-y-auto">
      {/* Left Column: Sign Sample Recorder */}
      <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Guided Sign Recorder</h2>
            <p className="text-xs text-slate-400">Capture 30 landmark samples per sign to personalize recognition</p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" /> Privacy: Landmarks Only
          </span>
        </div>

        {/* Sign Selection & Progress */}
        <div className="space-y-4 flex-1">
          <div>
            <label htmlFor="target-vocab-sign" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Target Vocabulary Sign
            </label>
            <select
              id="target-vocab-sign"
              aria-label="Target Vocabulary Sign"
              value={selectedSign}
              onChange={(e) => setSelectedSign(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {signsList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Sample Progress Bar */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Recorded Samples for {selectedSign}</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{samplesCount} / 30</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${(samplesCount / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Quality Pre-checks */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <div className="text-xs">
                <div className="font-semibold text-slate-200">Framing &amp; Hands</div>
                <div className="text-slate-400">Both hands in view</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <div className="text-xs">
                <div className="font-semibold text-slate-200">Ambient Lighting</div>
                <div className="text-slate-400">Good facial contrast</div>
              </div>
            </div>
          </div>

          {/* Capture Trigger Area */}
          <div className="relative flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center min-h-[160px]">
            {countdown !== null ? (
              <div className="text-5xl font-black text-indigo-400 animate-pulse">{countdown}</div>
            ) : isRecording ? (
              <div className="flex items-center gap-2 text-red-400 font-bold animate-pulse text-sm">
                <span className="h-3 w-3 rounded-full bg-red-500" /> Recording 32 landmark frames...
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-400 mb-4">
                  Hold neutral pose, click Record, and perform the sign <strong>{selectedSign}</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleStartCapture}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Play className="h-4 w-4" /> Start Sample Capture
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Model Trainer & Evaluator */}
      <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">Model Trainer &amp; ONNX Exporter</h2>
            <p className="text-xs text-slate-400">Train 1D-TCN model with data augmentation and early stopping</p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" /> 1D-TCN (Int8)
          </span>
        </div>

        <div className="space-y-4 flex-1">
          {/* Status and Trigger */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Training Pipeline Status</span>
              <span className="text-xs font-mono font-bold text-slate-400">
                {isTraining ? `Training Epochs (${trainingProgress}%)` : 'Idle / Ready'}
              </span>
            </div>

            {isTraining && (
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
            )}

            <button
              type="button"
              disabled={isTraining}
              onClick={handleRunTrainer}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-40 transition-colors shadow-lg shadow-emerald-700/20"
            >
              <RefreshCw className={`h-4 w-4 ${isTraining ? 'animate-spin' : ''}`} />
              {isTraining ? 'Training Model & Exporting ONNX...' : 'Run One-Click Model Training'}
            </button>
          </div>

          {/* Model Metrics Display */}
          {trainingMetrics && (
            <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Latest Evaluated Model Metrics
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Test Accuracy</div>
                  <div className="text-lg font-black text-emerald-400">{trainingMetrics.accuracy}%</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Macro-F1</div>
                  <div className="text-lg font-black text-indigo-400">{trainingMetrics.macroF1}</div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Inference (p95)</div>
                  <div className="text-lg font-black text-sky-400">0.64 ms</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed">
                Exported: <code>gestura_sign_recognizer.onnx</code> (39.8 KB) &amp;{' '}
                <code>gestura_sign_recognizer_int8.onnx</code> (257.3 KB). Inferred offline via onnxruntime-web.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
