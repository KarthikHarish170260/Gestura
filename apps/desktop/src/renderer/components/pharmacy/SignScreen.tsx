import React, { useState, useCallback } from 'react';
import { Volume2, Trash2, ArrowRight, Keyboard, ArrowLeft, Check } from 'lucide-react';
import { PharmacyCameraView } from './PharmacyCameraView';
import { PHARMACY_SIGNS, PHARMACY_SIGN_MAP } from '../../config/pharmacySigns';
import { StateMachineOutput } from '../../recognition/PharmacyHoldGater';
import { useConversationStore } from '../../store/conversationStore';

interface SignScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
}

export const SignScreen: React.FC<SignScreenProps> = ({ onNavigate }) => {
  const {
    signerBuffer,
    addSignToBuffer,
    clearSignerBuffer,
    settings,
  } = useConversationStore();

  const [lastConfirmedGloss, setLastConfirmedGloss] = useState<string | null>(
    signerBuffer.length > 0 ? signerBuffer[signerBuffer.length - 1] : null
  );

  const [machineState, setMachineState] = useState<StateMachineOutput>({
    state: 'NO_HAND',
    userMessage: 'Show your hand to the camera',
    confirmedGloss: null,
    shouldCommit: false,
    holdProgress: 0,
    confidence: 0,
    topGuesses: [],
  });

  const [typeInsteadOpen, setTypeInsteadOpen] = useState(false);
  const [typedText, setTypedText] = useState('');

  // Native Speech Synthesis TTS
  const speakPhrase = useCallback((text: string) => {
    if ('speechSynthesis' in window && text.trim().length > 0) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.ttsRate || 1.0;
      utterance.volume = settings.ttsVolume ?? 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [settings.ttsRate, settings.ttsVolume]);

  // Handle Confirmed Sign from Camera / HoldGater
  const handleSignConfirmed = useCallback(
    (gloss: string) => {
      setLastConfirmedGloss(gloss);
      addSignToBuffer(gloss);

      // Find spoken text from 15-sign config
      const signConfig = PHARMACY_SIGN_MAP[gloss];
      const spoken = signConfig ? signConfig.spokenText : gloss;
      speakPhrase(spoken);
    },
    [addSignToBuffer, speakPhrase]
  );

  // Handle Tapping a 15-word chip or UNSURE top-guess chip
  // "Tapping a chip must do exactly what a recognised sign does: add to the strip, speak, and send to Summary."
  const handleTapChip = (gloss: string) => {
    handleSignConfirmed(gloss);
  };

  // Handle Custom Typed Submission
  const handleCustomTypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim()) {
      const upper = typedText.trim().toUpperCase();
      addSignToBuffer(upper);
      setLastConfirmedGloss(upper);
      speakPhrase(typedText.trim());
      setTypedText('');
    }
  };

  // Full spoken phrase generated from buffer
  const currentSentence = signerBuffer
    .map((g) => (PHARMACY_SIGN_MAP[g] ? PHARMACY_SIGN_MAP[g].spokenText : g))
    .join(' ');

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#FAFAF7] text-[#1E293B] select-none overflow-hidden">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-[#0F766E] hover:bg-slate-100 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </button>
          <span className="text-slate-300">/</span>
          <h2 className="text-sm font-bold tracking-tight text-[#1E293B]">
            Sign to Pharmacist (15 Signs Locked)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] text-xs font-semibold border border-[#0F766E]/20">
            <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse" />
            On-Device Vision Ready
          </span>
        </div>
      </div>

      {/* Main Two-Column Stage */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left Column: Camera Panel (~60% width -> 7 cols on desktop) */}
        <div className="md:col-span-7 flex flex-col justify-start">
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-sm">
            <PharmacyCameraView
              onConfirmSign={handleSignConfirmed}
              onStateUpdate={setMachineState}
            />
          </div>
        </div>

        {/* Right Column: Result Panel (~40% width -> 5 cols on desktop) */}
        <div className="md:col-span-5 flex flex-col justify-between bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm overflow-y-auto">
          {/* Top of Right Column: Last Confirmed Sign */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Last Confirmed Sign
              </span>
              {lastConfirmedGloss && (
                <span className="flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
                  <Check className="w-3.5 h-3.5" />
                  Locked
                </span>
              )}
            </div>

            <div className="min-h-[64px] flex items-center">
              {lastConfirmedGloss ? (
                <div className="text-4xl md:text-5xl font-extrabold text-[#0F766E] tracking-tight transition-all">
                  {PHARMACY_SIGN_MAP[lastConfirmedGloss]?.label || lastConfirmedGloss}
                </div>
              ) : (
                <div className="text-2xl font-medium text-slate-400 italic">
                  Awaiting sign...
                </div>
              )}
            </div>

            {/* Sentence Strip */}
            <div className="mt-5 pt-4 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Sentence Strip ({signerBuffer.length})
                </span>
                {signerBuffer.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSignerBuffer}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {signerBuffer.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-[#FAFAF7] border border-[#E2E8F0] min-h-[56px] items-center">
                  {signerBuffer.map((sign, idx) => (
                    <span
                      key={`${sign}-${idx}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-bold text-base shadow-sm"
                    >
                      {PHARMACY_SIGN_MAP[sign]?.label || sign}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 rounded-xl bg-[#FAFAF7] border border-dashed border-[#E2E8F0] text-sm text-slate-400">
                  Confirmed signs will chain together here (e.g. Medicine + Allergy)
                </div>
              )}
            </div>

            {/* Top-3 Tappable Chips (ONLY in UNSURE state) */}
            {machineState.state === 'UNSURE' && machineState.topGuesses.length > 0 && (
              <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">
                  Did you mean one of these? Tap to select:
                </div>
                <div className="flex flex-wrap gap-2">
                  {machineState.topGuesses.map((guess) => (
                    <button
                      key={guess}
                      type="button"
                      onClick={() => handleTapChip(guess)}
                      className="px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-base hover:bg-amber-100 shadow-sm active:scale-95 transition-all"
                    >
                      {PHARMACY_SIGN_MAP[guess]?.label || guess}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Speak / Clear / Send to Summary */}
          <div className="mt-6 pt-4 border-t border-[#E2E8F0] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => speakPhrase(currentSentence || 'No phrase to speak')}
                disabled={signerBuffer.length === 0}
                className="flex items-center justify-center gap-2 h-14 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-semibold text-base transition-colors"
              >
                <Volume2 className="w-5 h-5 text-[#0F766E]" />
                <span>Speak</span>
              </button>

              <button
                type="button"
                onClick={clearSignerBuffer}
                disabled={signerBuffer.length === 0}
                className="flex items-center justify-center gap-2 h-14 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 text-slate-600 font-semibold text-base transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>Clear</span>
              </button>
            </div>

            {/* Large Send to Summary Button */}
            <button
              type="button"
              onClick={() => onNavigate('summary')}
              disabled={signerBuffer.length === 0}
              className="flex items-center justify-center gap-2 w-full h-14 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-40 text-white font-bold text-lg shadow-sm hover:shadow transition-all"
            >
              <span>Send to Summary</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar: Type Instead + 15 Word Chips */}
      <div className="bg-white border-t border-[#E2E8F0] px-6 py-3 shadow-md z-20">
        {/* Optional Typing Input Drawer */}
        {typeInsteadOpen && (
          <form onSubmit={handleCustomTypeSubmit} className="flex gap-2 mb-3">
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your message here (e.g. Need fever medicine)..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-base focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#0F766E] text-white font-semibold text-sm hover:bg-[#0D655E] transition-colors"
            >
              Add to Strip
            </button>
          </form>
        )}

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {/* Type Instead Toggle Button */}
          <button
            type="button"
            onClick={() => setTypeInsteadOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap border transition-all ${
              typeInsteadOpen
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-[#E2E8F0]'
            }`}
          >
            <Keyboard className="w-4 h-4 text-[#0F766E]" />
            <span>Type Instead</span>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          {/* 15 Locked Word Chips */}
          <div className="flex items-center gap-2">
            {PHARMACY_SIGNS.map((sign) => {
              const isSelected = signerBuffer.includes(sign.gloss);
              return (
                <button
                  key={sign.id}
                  type="button"
                  onClick={() => handleTapChip(sign.gloss)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-sm active:scale-95 border ${
                    isSelected
                      ? 'bg-[#0F766E] text-white border-[#0F766E]'
                      : 'bg-[#FAFAF7] hover:bg-white text-slate-800 border-[#E2E8F0] hover:border-[#0F766E]'
                  }`}
                  title={sign.hasTrainingData ? 'Real AI ML model' : 'Fallback-supported'}
                >
                  {sign.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
