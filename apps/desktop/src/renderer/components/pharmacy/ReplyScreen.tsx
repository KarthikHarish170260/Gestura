import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  ArrowLeft,
  Clock,
  Volume2,
} from 'lucide-react';
import {
  PHARMACY_SIGNS,
  PHARMACY_SIGN_MAP,
  PHARMACY_QUICK_PHRASES,
} from '../../config/pharmacySigns';
import { useConversationStore } from '../../store/conversationStore';

interface ReplyScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
}

export const ReplyScreen: React.FC<ReplyScreenProps> = ({ onNavigate }) => {
  const { utterances, addUtterance, settings } = useConversationStore();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeReply, setActiveReply] = useState<{
    text: string;
    glosses: string[];
    activeClipIndex: number;
  }>({
    text: 'Morning and night with water',
    glosses: ['MORNING', 'NIGHT', 'WATER'],
    activeClipIndex: 0,
  });

  const [clipPlaying, setClipPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Parse glosses from English text using 15-sign ontology
  const parseGlossesFromText = (text: string): string[] => {
    const upper = text.toUpperCase();
    const matched: string[] = [];

    // Check quick phrase exact matches first
    const quick = PHARMACY_QUICK_PHRASES.find(
      (q) => q.text.toLowerCase() === text.trim().toLowerCase()
    );
    if (quick) {
      return quick.glosses;
    }

    // Otherwise match keywords in the 15 signs
    PHARMACY_SIGNS.forEach((s) => {
      if (
        upper.includes(s.gloss) ||
        upper.includes(s.label.toUpperCase()) ||
        upper.includes(s.spokenText.toUpperCase())
      ) {
        if (!matched.includes(s.gloss)) {
          matched.push(s.gloss);
        }
      }
    });

    return matched.length > 0 ? matched : ['MEDICINE'];
  };

  // Speak reply text using TTS
  const speakReply = (text: string) => {
    if ('speechSynthesis' in window && text.trim().length > 0) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = settings.ttsRate || 1.0;
      u.volume = settings.ttsVolume ?? 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  // Submit Pharmacist Reply
  const handleSendReply = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const glosses = parseGlossesFromText(textToSend);
    setActiveReply({
      text: textToSend.trim(),
      glosses,
      activeClipIndex: 0,
    });

    // Add to session utterances
    addUtterance({
      id: `reply-${Date.now()}`,
      direction: 'speech_to_sign',
      text: textToSend.trim(),
      gloss: glosses.join(' - '),
      confidence: 1.0,
      latencyMs: 85,
      timestamp: new Date().toLocaleTimeString(),
    });

    speakReply(textToSend.trim());
    setInputText('');
  };

  // Microphone STT setup via Web Speech API
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this environment. Please type instead.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleSendReply(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Play Again logic
  const handlePlayAgain = () => {
    setClipPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    setTimeout(() => setClipPlaying(false), 2500);
  };

  // Current sign config for active clip
  const currentGloss = activeReply.glosses[activeReply.activeClipIndex] || 'MEDICINE';
  const currentSignConfig = PHARMACY_SIGN_MAP[currentGloss];

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#FAFAF7] text-[#1E293B] select-none p-6 md:p-10 pb-28 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-[#0F766E] hover:bg-white text-sm font-semibold border border-transparent hover:border-[#E2E8F0] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#0F766E]/10 px-3 py-1.5 rounded-full border border-[#0F766E]/20">
          Pharmacist Reply Desk
        </span>
      </div>

      {/* 1. Large Text Input with Mic Button */}
      <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendReply(inputText);
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type medication instructions or press mic to speak..."
            className="w-full pl-5 pr-32 py-4 rounded-2xl border-2 border-[#E2E8F0] focus:border-[#0F766E] text-lg text-[#1E293B] placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0F766E]/10 transition-all"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Speak instructions'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] disabled:opacity-40 text-white font-bold transition-colors shadow-sm"
              title="Send reply"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* 2. Quick Phrases as Tappable Cards */}
        <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
            Quick Phrases:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PHARMACY_QUICK_PHRASES.map((phrase) => (
              <button
                key={phrase.text}
                type="button"
                onClick={() => handleSendReply(phrase.text)}
                className="p-3 rounded-xl bg-[#FAFAF7] hover:bg-[#0F766E]/10 border border-[#E2E8F0] hover:border-[#0F766E] text-left text-sm font-semibold text-slate-700 hover:text-[#0F766E] transition-all active:scale-95 shadow-sm"
              >
                {phrase.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Reply Display Area: 28px+ text, gloss sequence, clip player */}
      <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#0F766E]/10 px-3 py-1 rounded-full">
            Active Pharmacist Instruction
          </span>
          <button
            type="button"
            onClick={() => speakReply(activeReply.text)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0F766E] hover:underline"
          >
            <Volume2 className="w-4 h-4" />
            <span>Speak Again</span>
          </button>
        </div>

        {/* Reply in 28px+ font */}
        <div className="text-2xl md:text-3xl font-extrabold text-[#1E293B] mb-6 leading-snug">
          &ldquo;{activeReply.text}&rdquo;
        </div>

        {/* Gloss Sequence as a Row of Cards */}
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Sign Gloss Sequence:
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeReply.glosses.map((gloss, idx) => {
              const sign = PHARMACY_SIGN_MAP[gloss];
              const isCurrent = idx === activeReply.activeClipIndex;
              return (
                <button
                  key={`${gloss}-${idx}`}
                  type="button"
                  onClick={() =>
                    setActiveReply((prev) => ({ ...prev, activeClipIndex: idx }))
                  }
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                    isCurrent
                      ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-md scale-105'
                      : 'bg-[#FAFAF7] text-slate-700 border-[#E2E8F0] hover:border-[#0F766E]'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                      isCurrent ? 'bg-white text-[#0F766E]' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="text-left">
                    <div className="font-extrabold text-base">{sign?.label || gloss}</div>
                    <div className={`text-[10px] ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                      {sign?.category || 'Pharmacist'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clip Player or Clean Gloss Card */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-[#FAFAF7] border border-[#E2E8F0]">
          {/* Sign Visual Stage */}
          <div className="w-48 h-48 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col items-center justify-center p-4 text-center">
            {currentSignConfig?.clipPath ? (
              <video
                ref={videoRef}
                src={currentSignConfig.clipPath}
                className="w-full h-full object-contain rounded-xl"
                muted
                playsInline
                onError={() => {
                  // Handled cleanly via fallback
                }}
              />
            ) : null}

            {/* Clean Animated Gloss Card */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#0F766E]/10 text-[#0F766E] flex items-center justify-center font-black text-2xl mb-2">
                {currentGloss.charAt(0)}
              </div>
              <div className="text-xl font-extrabold text-[#1E293B]">
                {currentSignConfig?.label || currentGloss}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                {currentSignConfig?.hasTrainingData ? 'Model Verified' : 'Standard Sign'}
              </div>
            </div>
          </div>

          {/* Player Controls & Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                Demonstrated Sign
              </div>
              <h3 className="text-2xl font-extrabold text-[#0F766E]">
                {currentSignConfig?.label || currentGloss}
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Demonstrating the sign for &ldquo;{currentSignConfig?.spokenText || currentGloss}&rdquo; so the sign-language patient can visually confirm the instruction.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayAgain}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-base shadow transition-all active:scale-95"
              >
                <RotateCcw className={`w-4 h-4 ${clipPlaying ? 'animate-spin' : ''}`} />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Session History Preview at Bottom */}
      <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0F766E]" />
            <span className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Session History Preview
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-bold text-[#0F766E] hover:underline"
          >
            View Full Log ({utterances.length}) →
          </button>
        </div>

        {utterances.length > 0 ? (
          <div className="space-y-3">
            {utterances.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E2E8F0] flex items-center justify-between text-sm"
              >
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mr-2 ${
                      item.direction === 'sign_to_speech'
                        ? 'bg-[#0F766E]/10 text-[#0F766E]'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {item.direction === 'sign_to_speech' ? 'Patient Signed' : 'Pharmacist Reply'}
                  </span>
                  <span className="font-semibold text-slate-800">{item.text}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{item.timestamp}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 p-4 text-center bg-[#FAFAF7] rounded-xl border border-dashed border-[#E2E8F0]">
            No exchanges recorded yet in this counter session.
          </div>
        )}
      </div>
    </div>
  );
};
