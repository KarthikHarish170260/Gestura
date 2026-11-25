import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { AvatarEngine } from './avatarEngine';

interface AvatarCanvasProps {
  glossSequence?: string[];
  activeGloss?: string;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({ glossSequence = [], activeGloss }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AvatarEngine | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [currentGloss, setCurrentGloss] = useState<string>('');

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 600;

    const engine = new AvatarEngine(canvas);
    engine.onGlossProgress((gloss) => {
      setCurrentGloss(gloss);
    });
    engine.start();
    engineRef.current = engine;

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current && glossSequence.length > 0) {
      engineRef.current.setGlossSequence(glossSequence);
    }
  }, [glossSequence]);

  useEffect(() => {
    if (engineRef.current && activeGloss) {
      engineRef.current.setGlossSequence([activeGloss]);
    }
  }, [activeGloss]);

  const togglePlayPause = () => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.resume();
    }
    setIsPlaying(!isPlaying);
  };

  const cycleSpeed = () => {
    const nextSpeed = speed === 1.0 ? 1.5 : speed === 1.5 ? 0.75 : 1.0;
    setSpeed(nextSpeed);
    engineRef.current?.setSpeed(nextSpeed);
  };

  const replaySequence = () => {
    if (engineRef.current && glossSequence.length > 0) {
      engineRef.current.setGlossSequence(glossSequence);
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-950 overflow-hidden">
      {/* 60 fps decoupled Canvas viewport - Expanded View */}
      <div className="relative flex-1 flex items-center justify-center p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain rounded-xl border border-slate-800 bg-black shadow-2xl"
        />

        {/* Gloss subtitle overlay banner */}
        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-lg bg-slate-900/90 px-4 py-2 border border-slate-700/80 backdrop-blur shadow-lg">
            {glossSequence.length > 0 ? (
              glossSequence.map((g, idx) => (
                <span
                  key={`${g}-${idx}`}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                    g === currentGloss
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : 'text-slate-400 bg-slate-800'
                  }`}
                >
                  {g}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 font-medium">Ready for incoming speech</span>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls Toolbar */}
      <div className="flex h-12 items-center justify-between border-t border-slate-800/80 bg-slate-900/70 px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause avatar playback' : 'Play avatar playback'}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={replaySequence}
            aria-label="Replay current gloss sequence"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label={`Cycle avatar speed, current speed ${speed}x`}
            className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <FastForward className="h-3.5 w-3.5 text-indigo-400" />
            <span>{speed}x</span>
          </button>
        </div>
      </div>
    </div>
  );
};
