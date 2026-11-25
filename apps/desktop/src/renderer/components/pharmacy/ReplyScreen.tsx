import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  RotateCcw,
  ArrowLeft,
  Clock,
  Volume2,
  Play,
  Pause,
  FastForward,
} from 'lucide-react';
import {
  PHARMACY_SIGNS,
  PHARMACY_SIGN_MAP,
  PHARMACY_QUICK_PHRASES,
} from '../../config/pharmacySigns';
import { useConversationStore } from '../../store/conversationStore';
import { AvatarEngine } from '../../avatar/avatarEngine';

interface ReplyScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
}

const SIGN_MOTION_CUES: Record<string, string> = {
  HELLO: 'Open hand raised near temple, waving outward.',
  'THANK-YOU': 'Flat palm touches chin and extends forward.',
  YES: 'Closed fist nods up and down twice.',
  NO: 'Index, middle, and thumb tap closed twice.',
  HELP: 'Thumbs-up fist lifts upward on flat base palm.',
  PAIN: 'Both index fingers point and pulse inward twice.',
  HEADACHE: 'Index finger taps near temple twice.',
  FEVER: 'Flat open palm rests horizontally on forehead.',
  COUGH: 'Curved fist rises to mouth and pulses twice.',
  COLD: 'Both fists curl at chest and shiver side-to-side.',
  ALLERGY: 'Index finger sweeps along opposite forearm.',
  MEDICINE: 'Middle fingertip taps twice onto open palm.',
  WATER: 'W-handshape taps chin twice.',
  MORNING: 'Right palm rises up from base arm (sunrise).',
  NIGHT: 'Curved right hand arcs down over base wrist (sunset).',
};

export const ReplyScreen: React.FC<ReplyScreenProps> = ({ onNavigate }) => {
  const { utterances, addUtterance, settings } = useConversationStore();

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeReply, setActiveReply] = useState<{
    text: string;
    glosses: string[];
    activeClipIndex: number;
    playbackId: number;
  }>({
    text: 'Morning and night with water',
    glosses: ['MORNING', 'NIGHT', 'WATER'],
    activeClipIndex: 0,
    playbackId: 1,
  });

  const [clipPlaying, setClipPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1.0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AvatarEngine | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize 60fps skeletal AvatarEngine on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 640;
    canvas.height = 520;

    try {
      const engine = new AvatarEngine(canvas);
      engine.onGlossProgress((_gloss, index) => {
        setClipPlaying(true);
        setIsPaused(false);
        setActiveReply((prev) => ({
          ...prev,
          activeClipIndex: index >= 0 ? index : 0,
        }));
      });
      engine.onSequenceComplete(() => {
        setClipPlaying(false);
        setIsPaused(false);
      });
      engine.start();
      engineRef.current = engine;

      return () => {
        engine.stop();
        engineRef.current = null;
      };
    } catch {
      return undefined;
    }
  }, []);

  // Trigger avatar animation whenever activeReply sequence or playbackId updates
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || activeReply.glosses.length === 0) return;
    setClipPlaying(true);
    setIsPaused(false);
    engine.setGlossSequence(activeReply.glosses);
  }, [activeReply.glosses, activeReply.playbackId]);

  // Parse glosses from English text ordered by position in sentence
  const parseGlossesFromText = (text: string): string[] => {
    const upper = text.toUpperCase();

    const quick = PHARMACY_QUICK_PHRASES.find(
      (q) => q.text.toLowerCase() === text.trim().toLowerCase()
    );
    if (quick) {
      return quick.glosses;
    }

    const hits: Array<{ gloss: string; pos: number }> = [];
    PHARMACY_SIGNS.forEach((s) => {
      const candidates = [s.gloss, s.label.toUpperCase(), s.spokenText.toUpperCase()];
      let bestPos = -1;
      for (const c of candidates) {
        const idx = upper.indexOf(c);
        if (idx !== -1 && (bestPos === -1 || idx < bestPos)) {
          bestPos = idx;
        }
      }
      if (bestPos !== -1) {
        hits.push({ gloss: s.gloss, pos: bestPos });
      }
    });

    hits.sort((a, b) => a.pos - b.pos);
    const matched = Array.from(new Set(hits.map((h) => h.gloss)));
    return matched.length > 0 ? matched : ['MEDICINE'];
  };

  // Speak reply text using offline browser/system TTS
  const speakReply = useCallback(
    (text: string) => {
      if ('speechSynthesis' in window && text.trim().length > 0) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = settings.ttsRate || 1.0;
        u.volume = settings.ttsVolume ?? 1.0;
        window.speechSynthesis.speak(u);
      }
    },
    [settings.ttsRate, settings.ttsVolume]
  );

  // Submit Pharmacist Reply
  const handleSendReply = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const glosses = parseGlossesFromText(textToSend);
    setActiveReply((prev) => ({
      text: textToSend.trim(),
      glosses,
      activeClipIndex: 0,
      playbackId: prev.playbackId + 1,
    }));

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

  // Play Again replays the entire gloss sequence from start
  const handlePlayAgain = () => {
    setActiveReply((prev) => ({
      ...prev,
      activeClipIndex: 0,
      playbackId: prev.playbackId + 1,
    }));
  };

  // Jump to and animate a single sign card immediately when clicked
  const handlePlaySingleGloss = (idx: number) => {
    const targetGloss = activeReply.glosses[idx];
    if (!targetGloss) return;
    setActiveReply((prev) => ({ ...prev, activeClipIndex: idx }));
    setClipPlaying(true);
    setIsPaused(false);
    engineRef.current?.setGlossSequence([targetGloss]);
  };

  const togglePlayPause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    if (!clipPlaying) {
      handlePlayAgain();
      return;
    }
    if (isPaused) {
      engine.resume();
      setIsPaused(false);
    } else {
      engine.pause();
      setIsPaused(true);
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = speed === 1.0 ? 0.75 : speed === 0.75 ? 1.5 : 1.0;
    setSpeed(nextSpeed);
    engineRef.current?.setSpeed(nextSpeed);
  };

  const currentGloss = activeReply.glosses[activeReply.activeClipIndex] || activeReply.glosses[0] || 'MEDICINE';
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

      {/* 3. Reply Display Area: 28px+ text, gloss sequence, live 60fps sign avatar */}
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
                  onClick={() => handlePlaySingleGloss(idx)}
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

        {/* Live 60fps Sign Avatar Player + Controls */}
        <div className="flex flex-col sm:flex-row items-stretch gap-6 p-6 rounded-2xl bg-[#FAFAF7] border border-[#E2E8F0]">
          {/* Animated Skeletal Avatar Stage */}
          <div className="w-full sm:w-72 shrink-0 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-md overflow-hidden flex flex-col">
            <div className="relative flex-1 min-h-[220px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                aria-label={`Animated sign demonstration for ${currentSignConfig?.label || currentGloss}`}
                className="w-full h-full object-contain block"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-slate-900/85 px-2.5 py-1 border border-teal-500/40 backdrop-blur">
                <span
                  className={`w-2 h-2 rounded-full ${
                    clipPlaying && !isPaused ? 'bg-teal-400 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="text-[11px] font-bold tracking-wide text-teal-200 uppercase">
                  {currentSignConfig?.label || currentGloss}
                </span>
              </div>
            </div>

            {/* Compact Player Controls Bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-t border-slate-800">
              <button
                type="button"
                onClick={togglePlayPause}
                aria-label={clipPlaying && !isPaused ? 'Pause sign animation' : 'Play sign animation'}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                {clipPlaying && !isPaused ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-teal-400" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={cycleSpeed}
                aria-label={`Playback speed ${speed}x`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors"
              >
                <FastForward className="w-3.5 h-3.5 text-teal-400" />
                <span>{speed}x</span>
              </button>
            </div>
          </div>

          {/* Player Info & Replay Button */}
          <div className="flex-1 flex flex-col justify-between py-1">
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

              {SIGN_MOTION_CUES[currentGloss] && (
                <div className="mt-4 p-3.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-slate-600">
                  <span className="font-bold text-[#0F766E] uppercase tracking-wider mr-1.5">
                    Sign Cue:
                  </span>
                  <span>{SIGN_MOTION_CUES[currentGloss]}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePlayAgain}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-base shadow transition-all active:scale-95"
              >
                <RotateCcw className={`w-4 h-4 ${clipPlaying && !isPaused ? 'animate-spin' : ''}`} />
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
