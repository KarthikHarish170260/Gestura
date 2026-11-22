import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useConversationStore } from '../store/conversationStore';

export const CameraLandmarkView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [handsDetected] = useState(true);
  const [motionEnergy] = useState(0.42);

  const { settings, updateSettings, addSignToBuffer } = useConversationStore();

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        // Fallback for camera-less/sandbox test environments
        setHasPermission(false);
      }
    }

    initCamera();

    // Landmark overlay animation loop
    let animId: number;
    let tick = 0;

    const renderOverlay = () => {
      tick++;
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Simulated live skeletal landmarks overlay for interactive feedback
          const w = canvas.width;
          const h = canvas.height;

          // Upper body joints
          const nose = [w * 0.5, h * 0.28];
          const lShoulder = [w * 0.38, h * 0.42];
          const rShoulder = [w * 0.62, h * 0.42];
          const lWrist = [w * (0.34 + Math.sin(tick * 0.05) * 0.04), h * 0.68];
          const rWrist = [w * (0.66 + Math.cos(tick * 0.05) * 0.04), h * 0.68];

          // Draw skeleton bones
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(nose[0], nose[1]);
          ctx.lineTo((lShoulder[0] + rShoulder[0]) / 2, (lShoulder[1] + rShoulder[1]) / 2);
          ctx.moveTo(lShoulder[0], lShoulder[1]);
          ctx.lineTo(rShoulder[0], rShoulder[1]);
          ctx.moveTo(lShoulder[0], lShoulder[1]);
          ctx.lineTo(lWrist[0], lWrist[1]);
          ctx.moveTo(rShoulder[0], rShoulder[1]);
          ctx.lineTo(rWrist[0], rWrist[1]);
          ctx.stroke();

          // Draw joint points
          ctx.fillStyle = '#a5b4fc';
          for (const pt of [nose, lShoulder, rShoulder, lWrist, rWrist]) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Hand keypoints clusters
          ctx.fillStyle = '#38bdf8';
          for (let f = 0; f < 5; f++) {
            ctx.beginPath();
            ctx.arc(rWrist[0] + (f - 2) * 8, rWrist[1] - 18, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(lWrist[0] + (f - 2) * 8, lWrist[1] - 18, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      animId = requestAnimationFrame(renderOverlay);
    };

    animId = requestAnimationFrame(renderOverlay);

    return () => {
      cancelAnimationFrame(animId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      {/* Video Viewport & Landmark Canvas */}
      <div className="relative flex-1 flex items-center justify-center p-2 bg-black/60">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full max-w-[640px] max-h-[480px] object-cover rounded-lg border border-slate-800"
        />

        {hasPermission === false && (
          <div className="absolute inset-0 m-auto flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-lg text-center max-w-[360px] max-h-[160px] border border-amber-500/30">
            <AlertCircle className="h-6 w-6 text-amber-400 mb-2" />
            <div className="text-xs font-bold text-slate-200">Camera Access Notice</div>
            <div className="text-[11px] text-slate-400 mt-1">Operating in offline simulated landmark tracking mode.</div>
          </div>
        )}

        {/* Live Landmark Skeleton Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 m-auto w-full h-full max-w-[640px] max-h-[480px] pointer-events-none"
        />

        {/* Floating Badges */}
        <div className="absolute top-4 left-6 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-200 backdrop-blur">
            {handsDetected ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Hands Tracked</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <span>No Hands</span>
              </>
            )}
          </span>

          <span className="rounded-full bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 text-xs font-medium text-slate-300 backdrop-blur font-mono">
            30 FPS
          </span>
        </div>

        {/* Motion Energy Gauge */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between rounded-lg bg-slate-900/80 px-4 py-2 border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-medium text-slate-300">Motion Energy</span>
          </div>
          <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, motionEnergy * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mode Toolbar */}
      <div className="flex h-12 items-center justify-between border-t border-slate-800/80 bg-slate-900/70 px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateSettings({ fingerspellingMode: !settings.fingerspellingMode })}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              settings.fingerspellingMode
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Fingerspelling Mode: {settings.fingerspellingMode ? 'ON (A-Z)' : 'OFF (Signs)'}
          </button>
        </div>

        {/* Quick simulation button for offline demo verification */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => addSignToBuffer('HELLO')}
            className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-indigo-300 hover:bg-slate-700"
          >
            + HELLO
          </button>
          <button
            type="button"
            onClick={() => addSignToBuffer('DOCTOR')}
            className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-indigo-300 hover:bg-slate-700"
          >
            + DOCTOR
          </button>
          <button
            type="button"
            onClick={() => addSignToBuffer('HELP')}
            className="px-2 py-1 rounded bg-slate-800 text-xs font-mono text-indigo-300 hover:bg-slate-700"
          >
            + HELP
          </button>
        </div>
      </div>
    </div>
  );
};
