import React, { useState } from 'react';
import { Check, ShieldCheck, Sun, Sparkles } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {step}
            </span>
            <span className="text-xs font-bold text-slate-300">
              {step === 1 && 'Welcome & Offline Privacy'}
              {step === 2 && 'Lighting & Camera Framing'}
              {step === 3 && 'Calibration & First Signs'}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">Step {step} of 3</span>
        </div>

        {/* Step 1: Privacy & Offline Mode */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">100% Offline Single-Device Communication</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                GESTURA runs entirely on this device. No camera feeds or audio streams ever leave your laptop. Models are pre-compiled and run locally on CPU/GPU delegates.
              </p>
            </div>
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Check className="h-4 w-4" /> Zero network telemetry
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Check className="h-4 w-4" /> SQLite local storage
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Lighting & Framing */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sun className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Lighting &amp; Framing Check</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                For optimal landmark tracking, ensure your chest, shoulders, and both hands are clearly visible in the camera frame without strong backlighting.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div className="font-bold text-emerald-400 mb-1">Recommended</div>
                <div>Diffused front lighting, neutral dark clothing, arm-length distance.</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div className="font-bold text-red-400 mb-1">Avoid</div>
                <div>Direct windows behind you, hand motion blur, partial limb cropping.</div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: First 5 Signs Tutorial */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Ready to Communicate!</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Your starter vocabulary of 40 signs is active. Start with simple conversational glosses:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['HELLO', 'THANK-YOU', 'YES', 'NO', 'HELP'].map((g) => (
                <span
                  key={g}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs font-mono font-bold text-indigo-300"
                >
                  {g}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              You can personalize or record additional custom signs at any time in the <strong>Recorder &amp; Train</strong> tab.
            </p>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            >
              Continue &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
            >
              Start Conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
