import React from 'react';
import { ArrowLeft, CheckCircle, RotateCcw, Volume2, ShieldCheck } from 'lucide-react';
import { PHARMACY_SIGN_MAP } from '../../config/pharmacySigns';
import { useConversationStore } from '../../store/conversationStore';

interface SummaryScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({ onNavigate }) => {
  const {
    signerBuffer,
    clearSignerBuffer,
    settings,
    addUtterance,
  } = useConversationStore();

  const phraseEnglish = signerBuffer
    .map((g) => (PHARMACY_SIGN_MAP[g] ? PHARMACY_SIGN_MAP[g].spokenText : g))
    .join(' ');

  const speakSummary = () => {
    if ('speechSynthesis' in window && phraseEnglish.trim().length > 0) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(phraseEnglish);
      u.rate = settings.ttsRate || 1.0;
      u.volume = settings.ttsVolume ?? 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  const handleConfirmByPharmacist = () => {
    // Record to utterance store
    if (signerBuffer.length > 0) {
      addUtterance({
        id: `utt-${Date.now()}`,
        direction: 'sign_to_speech',
        text: phraseEnglish,
        gloss: signerBuffer.join(' - '),
        confidence: 0.95,
        latencyMs: 140,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    // Advance to Pharmacist Reply Mode
    onNavigate('reply');
  };

  const handleStartAgain = () => {
    clearSignerBuffer();
    onNavigate('sign');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#FAFAF7] text-[#1E293B] select-none p-6 md:p-10 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={() => onNavigate('sign')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:text-[#0F766E] hover:bg-white text-base font-semibold border border-transparent hover:border-[#E2E8F0] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sign Camera</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-[#E2E8F0]">
          <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
          <span>Patient Intake Card (Show Pharmacist)</span>
        </div>
      </div>

      {/* Main 2-Metre Legible Summary Card */}
      <div className="max-w-4xl mx-auto w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-8 md:p-12">
        <div className="border-b border-[#E2E8F0] pb-6 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#0F766E]/10 px-3 py-1 rounded-full">
            Triage Summary
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#1E293B] tracking-tight mt-3">
            Patient Communication Summary
          </h1>
          <p className="text-base text-slate-500 mt-2">
            The signs below were confirmed by the patient at the pharmacy counter.
          </p>
        </div>

        {/* Signs in Order - Huge 36px+ Font Legible at 2 Metres */}
        <div className="mb-10">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Signs Expressed in Order ({signerBuffer.length}):
          </div>

          {signerBuffer.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {signerBuffer.map((sign, index) => {
                const info = PHARMACY_SIGN_MAP[sign];
                return (
                  <div
                    key={`${sign}-${index}`}
                    className="flex items-center gap-4 p-5 rounded-2xl bg-[#FAFAF7] border-2 border-[#E2E8F0]"
                  >
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#0F766E] text-white font-black text-xl shadow-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-extrabold text-[#1E293B]">
                        {info?.label || sign}
                      </div>
                      <div className="text-xs font-mono font-medium text-slate-500 mt-0.5">
                        {info?.category || 'General'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FAFAF7] rounded-2xl border border-dashed border-[#E2E8F0] text-lg text-slate-400">
              No signs registered yet. Please return to Sign Mode or tap a word chip.
            </div>
          )}
        </div>

        {/* Plain English Translation with Speak Button */}
        <div className="p-6 rounded-2xl bg-[#0F766E]/5 border border-[#0F766E]/20 mb-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
              Spoken Interpretation
            </span>
            <button
              type="button"
              onClick={speakSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#0F766E]/30 text-[#0F766E] hover:bg-[#0F766E] hover:text-white text-xs font-bold transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Read Aloud</span>
            </button>
          </div>
          <div className="text-2xl md:text-3xl font-bold text-[#1E293B]">
            &ldquo;{phraseEnglish || 'No words detected'}&rdquo;
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="text-xs text-slate-500 mb-8 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <strong>Important Clinical Note:</strong> The pharmacist confirms this intake summary; the Gestura software never makes or confirms an automated medical diagnosis or clinical prescription.
        </div>

        {/* Action Buttons: Confirm by Pharmacist and Start Again */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleConfirmByPharmacist}
            className="flex items-center justify-center gap-2.5 h-16 rounded-2xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-lg shadow-sm hover:shadow transition-all"
          >
            <CheckCircle className="w-6 h-6" />
            <span>Confirm &amp; Pharmacist Reply</span>
          </button>

          <button
            type="button"
            onClick={handleStartAgain}
            className="flex items-center justify-center gap-2.5 h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Start Again (Clear)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
