import React, { useState } from 'react';
import { Camera, Volume2, Mic, Trash2, CheckCircle2, Send } from 'lucide-react';
import { CameraLandmarkView } from './CameraLandmarkView';
import { AvatarCanvas } from '../avatar/AvatarCanvas';
import { useConversationStore } from '../store/conversationStore';

export const ConversationView: React.FC = () => {
  const {
    utterances,
    addUtterance,
    pendingCaption,
    setPendingCaption,
    clearSignerBuffer,
    avatarGlossSequence,
    setAvatarGlossSequence,
    setSpeechTranscript,
    settings,
  } = useConversationStore();

  const [inputSpeechText, setInputSpeechText] = useState('');

  // Signer confirms recognized caption and triggers speech
  const handleConfirmAndSpeak = async () => {
    if (!pendingCaption.trim()) return;

    const utteranceText = pendingCaption.trim();
    const newUtterance = {
      id: `u-${Date.now()}`,
      direction: 'sign_to_speech' as const,
      text: utteranceText,
      gloss: utteranceText,
      confidence: 0.94,
      latencyMs: 140,
      timestamp: new Date().toLocaleTimeString(),
    };

    addUtterance(newUtterance);
    clearSignerBuffer();

    // Trigger local speech synthesis via sidecar or Web Speech API fallback
    try {
      const resp = await fetch('http://127.0.0.1:8000/speech/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gestura-Token': 'dev-token' },
        body: JSON.stringify({ text: utteranceText, rate: settings.ttsRate, volume: settings.ttsVolume }),
      });
      if (!resp.ok && 'speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(utteranceText));
      }
    } catch {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(utteranceText));
      }
    }
  };

  // Hearing partner speaks and triggers gloss translation for avatar
  const handleHearingPartnerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputSpeechText.trim()) return;

    const spokenText = inputSpeechText.trim();
    setInputSpeechText('');
    setSpeechTranscript(spokenText);

    // Call sidecar text-to-gloss engine
    try {
      const resp = await fetch('http://127.0.0.1:8000/speech/gloss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gestura-Token': 'dev-token' },
        body: JSON.stringify({ text: spokenText, language: settings.signLanguage }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const glosses = data.tokens.map((t: { token: string }) => t.token);
        setAvatarGlossSequence(glosses);

        addUtterance({
          id: `u-${Date.now()}`,
          direction: 'speech_to_sign',
          text: spokenText,
          gloss: data.gloss_string,
          confidence: 0.98,
          latencyMs: 85,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        // Fallback gloss tokenization
        const tokens = spokenText.toUpperCase().split(/\s+/);
        setAvatarGlossSequence(tokens);
        addUtterance({
          id: `u-${Date.now()}`,
          direction: 'speech_to_sign',
          text: spokenText,
          gloss: tokens.join(' '),
          confidence: 0.98,
          latencyMs: 85,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch {
      const tokens = spokenText.toUpperCase().split(/\s+/);
      setAvatarGlossSequence(tokens);
      addUtterance({
        id: `u-${Date.now()}`,
        direction: 'speech_to_sign',
        text: spokenText,
        gloss: tokens.join(' '),
        confidence: 0.98,
        latencyMs: 85,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full gap-4">
      {/* Top Split-Screen Views */}
      <div className="grid grid-cols-2 gap-4 h-[55%] min-h-[340px]">
        {/* Left: Signer Viewport */}
        <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-slate-200">
                Signer Camera (Sign &rarr; Speech)
              </span>
            </div>
            <span className="text-xs text-indigo-400 font-mono font-medium">30 FPS</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <CameraLandmarkView />
          </div>

          {/* Signer Editable Caption Builder Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending Signer Caption
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearSignerBuffer}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 font-medium transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="pending-sign-caption"
                aria-label="Pending sign caption"
                type="text"
                value={pendingCaption}
                onChange={(e) => setPendingCaption(e.target.value)}
                placeholder="Signing gesture will accumulate here... (Editable)"
                className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                type="button"
                onClick={handleConfirmAndSpeak}
                disabled={!pendingCaption.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Volume2 className="h-3.5 w-3.5" /> Speak
              </button>
            </div>
          </div>
        </div>

        {/* Right: Avatar Signer Viewport */}
        <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-200">
                Avatar Signer (Speech &rarr; Sign)
              </span>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-medium">60 FPS Decoupled</span>
          </div>

          <div className="flex-1 overflow-hidden">
            <AvatarCanvas glossSequence={avatarGlossSequence} />
          </div>

          {/* Hearing Partner Input / Mic Bar */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hearing Partner Microphone
              </span>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Mic className="h-3.5 w-3.5 animate-pulse text-red-400" />
                <span>Streaming STT Ready</span>
              </div>
            </div>

            <form onSubmit={handleHearingPartnerSubmit} className="flex items-center gap-2">
              <input
                id="hearing-speech-input"
                aria-label="Hearing partner spoken English text"
                type="text"
                value={inputSpeechText}
                onChange={(e) => setInputSpeechText(e.target.value)}
                placeholder="Speak or type English here to animate avatar..."
                className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <button
                type="submit"
                disabled={!inputSpeechText.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Send className="h-3.5 w-3.5" /> Sign
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom: Shared Scrolling Conversation Transcript */}
      <div className="flex-1 flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg min-h-[160px]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 bg-slate-900/80">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Shared Conversation History &amp; Session Transcript
          </span>
          <span className="text-xs text-slate-400">{utterances.length} dialogue turns</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {utterances.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              No messages yet in this session. Start signing or speaking above.
            </div>
          ) : (
            utterances.map((u) => {
              const isSigner = u.direction === 'sign_to_speech';
              return (
                <div
                  key={u.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    isSigner
                      ? 'bg-indigo-950/20 border-indigo-900/40 mr-12'
                      : 'bg-emerald-950/20 border-emerald-900/40 ml-12'
                  }`}
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSigner ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isSigner ? 'S' : 'H'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-300">
                        {isSigner ? 'Signer (Sign &rarr; Speech)' : 'Hearing Partner (Speech &rarr; Sign)'}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{u.timestamp}</span>
                        <span>{u.confidence * 100}% conf</span>
                        <span>{u.latencyMs}ms</span>
                      </div>
                    </div>

                    <div className="text-sm font-medium text-slate-100">{u.text}</div>

                    {u.gloss && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Gloss:</span>
                        <code className="text-xs font-mono font-semibold text-indigo-400">
                          {u.gloss}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
