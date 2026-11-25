import React, { useState } from 'react';
import { ArrowLeft, Play, Volume2, Info } from 'lucide-react';
import { PHARMACY_SIGNS, PharmacySign } from '../../config/pharmacySigns';
import { useConversationStore } from '../../store/conversationStore';

interface PracticeScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({ onNavigate }) => {
  const { addSignToBuffer, settings } = useConversationStore();

  const [activeSign, setActiveSign] = useState<PharmacySign>(PHARMACY_SIGNS[0]);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'simulating' | 'confirmed';
    progress: number;
    message: string;
  }>({
    status: 'idle',
    progress: 0,
    message: 'Select a sign to practice holding and verification.',
  });

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = settings.ttsRate || 1.0;
      u.volume = settings.ttsVolume ?? 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  // Simulate 10-of-12 hold frames verification for rehearsal
  const handleTestSign = (sign: PharmacySign) => {
    setActiveSign(sign);
    setTestResult({
      status: 'simulating',
      progress: 0.1,
      message: `Holding sign: ${sign.label}...`,
    });

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      const progress = Math.min(1.0, current / 10);
      setTestResult({
        status: current >= 10 ? 'confirmed' : 'simulating',
        progress,
        message:
          current >= 10
            ? `Got it: ${sign.label} (Verified 10/10 frames)`
            : `Holding sign: ${sign.label} (${current}/10 frames)`,
      });

      if (current >= 10) {
        clearInterval(interval);
        addSignToBuffer(sign.gloss);
        speakText(sign.spokenText);
      }
    }, 40);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#FAFAF7] text-[#1E293B] select-none p-6 md:p-10 pb-28 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:text-[#0F766E] hover:bg-white text-base font-semibold border border-transparent hover:border-[#E2E8F0] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Home</span>
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#0F766E]/10 px-3.5 py-1.5 rounded-full border border-[#0F766E]/20">
          Rehearsal &amp; Simulator Studio
        </span>
      </div>

      {/* Main Studio Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: 15 Sign Practice Selection Grid */}
        <div className="md:col-span-7 bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#1E293B]">15 Locked Pharmacy Signs</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Practice each sign to rehearse the 10-of-12 frame hold gater before live presentation.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-mono font-bold text-slate-600">
              15 Signs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {PHARMACY_SIGNS.map((s, idx) => {
              const isSelected = activeSign.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleTestSign(s)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-[#0F766E] bg-[#0F766E]/5 shadow-sm'
                      : 'border-[#E2E8F0] bg-[#FAFAF7] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        s.hasTrainingData
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {s.hasTrainingData ? 'Model' : 'Fallback'}
                    </span>
                  </div>
                  <div className="font-extrabold text-base text-[#1E293B]">{s.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.category}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Live Rehearsal Feedback & Gater Tester */}
        <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sign Selected for Practice
            </div>
            <div className="text-3xl font-extrabold text-[#0F766E] mb-1">
              {activeSign.label}
            </div>
            <div className="text-sm text-slate-600 mb-6">
              Category: <span className="font-semibold text-slate-800">{activeSign.category}</span>
            </div>

            {/* Hold Gater Simulation Ring */}
            <div className="p-6 rounded-2xl bg-[#FAFAF7] border border-[#E2E8F0] flex flex-col items-center justify-center text-center mb-6">
              <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#0F766E"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={(1 - testResult.progress) * 2 * Math.PI * 40}
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />
                </svg>
                <span className="absolute font-mono font-bold text-lg text-[#1E293B]">
                  {Math.round(testResult.progress * 100)}%
                </span>
              </div>

              <div className="font-bold text-sm text-[#1E293B]">
                {testResult.message}
              </div>
            </div>

            {/* Sign Training Data Transparency */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Info className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Model Pipeline Status</span>
              </div>
              <p>
                {activeSign.hasTrainingData
                  ? 'Real training keypoints dataset present in data/vocabulary.json (11 signs).'
                  : 'Fallback-supported sign with rule-based anatomical classifier and 1-tap chip (4 signs: Cough, Cold, Morning, Night).'}
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="mt-6 pt-4 border-t border-[#E2E8F0] space-y-2">
            <button
              type="button"
              onClick={() => handleTestSign(activeSign)}
              className="w-full h-14 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-base shadow transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              <span>Simulate 10-Frame Hold Test</span>
            </button>
            <button
              type="button"
              onClick={() => speakText(activeSign.spokenText)}
              className="w-full h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4 text-[#0F766E]" />
              <span>Test Audio Speech</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
