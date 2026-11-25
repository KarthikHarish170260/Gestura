import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Clock,
  ShieldAlert,
  Volume2,
  Mic,
  MicOff,
  Send,
  RotateCcw,
  Stethoscope,
  FlaskConical,
  TrendingUp,
} from 'lucide-react';
import { useErKioskStore } from './erKioskStore';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultItem[][];
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export const StaffTriageView: React.FC = () => {
  const {
    currentStatement,
    nurseSpeechInput,
    setNurseSpeechInput,
    isListeningToNurse,
    setIsListeningToNurse,
    submitNurseSpeech,
    triggerQuickStaffAction,
    nurseActionHistory,
    resetPatientIntake,
    setEvaluationHarnessOpen,
    isBenchmarkActive,
  } = useErKioskStore();

  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognitionConstructor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (SpeechRecognitionConstructor) {
      setSpeechSupported(true);
      const rec = new SpeechRecognitionConstructor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = Array.from(event.results)
          .map((r) => r[0].transcript)
          .join('');
        setNurseSpeechInput(transcript);
      };

      rec.onerror = () => {
        setIsListeningToNurse(false);
      };

      rec.onend = () => {
        setIsListeningToNurse(false);
      };

      recognitionRef.current = rec;
    }
  }, [setNurseSpeechInput, setIsListeningToNurse]);

  const toggleMic = () => {
    if (!recognitionRef.current) return;
    if (isListeningToNurse) {
      recognitionRef.current.stop();
      setIsListeningToNurse(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningToNurse(true);
      } catch {
        // Drop safely
      }
    }
  };

  const handleSpeakTriageNarrative = () => {
    if (!currentStatement?.narrativeSpeech) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(currentStatement.narrativeSpeech);
      u.rate = 1.0;
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    }
  };

  const esi = currentStatement?.esi;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
            Staff / Nurse Triage Dashboard
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Emergency Severity Index (ESI)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Evaluation Harness Trigger */}
          <button
            type="button"
            onClick={() => setEvaluationHarnessOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border transition-all ${
              isBenchmarkActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
            <span>{isBenchmarkActive ? 'Benchmark Recording...' : 'A/B Benchmark Eval'}</span>
          </button>

          {/* Reset / Next Patient Button */}
          <button
            type="button"
            onClick={resetPatientIntake}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950 hover:text-red-300 border border-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            title="Archive intake and reset kiosk for next arrival"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Next Patient</span>
          </button>
        </div>
      </div>

      {/* Main Staff Dashboard Content */}
      <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
        {/* Live ESI Triage Summary Card */}
        {currentStatement ? (
          <div className="flex flex-col p-4 rounded-xl bg-slate-900/90 border-2 border-slate-700 shadow-xl gap-3">
            {/* Top Severity Ribbon */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider border shadow-md ${esi?.badgeColor}`}>
                  {esi?.title ?? 'ESI-3: Urgent'}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                  <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Target Response: &le; {esi?.targetResponseTimeMinutes ?? 30} mins</span>
                </div>
              </div>

              {/* Audio Playback of Clinical Narrative */}
              <button
                type="button"
                onClick={handleSpeakTriageNarrative}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Play Voice Narrative</span>
              </button>
            </div>

            {/* Core Patient Data Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Chief Complaint
                </span>
                <span className="text-sm font-extrabold text-white">
                  {currentStatement.chiefComplaint}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Location / Anatomy
                </span>
                <span className="text-sm font-extrabold text-cyan-300">
                  {currentStatement.location}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Onset &bull; Duration
                </span>
                <span className="text-sm font-extrabold text-amber-300">
                  {currentStatement.duration}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Pain Intensity
                </span>
                <span className={`text-sm font-extrabold ${
                  currentStatement.painScaleEstimated >= 8
                    ? 'text-red-400'
                    : currentStatement.painScaleEstimated >= 5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {currentStatement.painScaleEstimated} / 10
                </span>
              </div>
            </div>

            {/* Structured Clinical Narrative Text */}
            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                Structured Clinical Intake Statement (EMR Logged)
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                &ldquo;{currentStatement.narrativeSpeech}&rdquo;
              </p>
            </div>

            {/* Critical Safety Flags & Allergies */}
            {currentStatement.alerts.length > 0 && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-rose-200 block">
                    Critical Safety Alerts / Comorbidities:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentStatement.alerts.map((al) => (
                      <span
                        key={al}
                        className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-extrabold uppercase"
                      >
                        {al}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Expected Diagnostic Resources */}
            {esi?.expectedResources && esi.expectedResources.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                <FlaskConical className="h-3.5 w-3.5 text-cyan-400" />
                <span className="font-semibold text-slate-300">Expected Resources:</span>
                <span className="font-mono text-cyan-300">
                  {esi.expectedResources.join(' &bull; ')}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Empty Standby State */
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center">
            <Activity className="h-10 w-10 text-slate-600 mb-2 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-300">Waiting for Patient Input</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              As the patient signs or taps on the left kiosk screen, live structured triage notes and ESI classification will automatically populate here in real time.
            </p>
          </div>
        )}

        {/* One-Click Quick Response Chips for Nurses */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                One-Click Quick Response Chips (Translates to Patient Visual Cards)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Instant 1-Click Broadcast</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'WHEELCHAIR_SEAT', label: '🔴 Sit in Wheelchair', speech: 'Please sit in the transport wheelchair immediately' },
              { id: 'WAIT_CHAIR', label: '🪑 Take a Seat Here', speech: 'Please take a seat in the waiting area' },
              { id: 'BLOOD_SAMPLE', label: '💉 Blood Test Needed', speech: 'We need to draw a blood sample from your arm' },
              { id: 'TRIAGE_ROOM_1', label: '🚪 Go to Triage Room 1', speech: 'Please go to Triage Room 1' },
              { id: 'DOCTOR_ROOM_2', label: '👨‍⚕️ Doctor in Room 2', speech: 'The doctor is ready to examine you in Room 2' },
              { id: 'ECG_MONITOR', label: '💓 Heart Monitor (ECG)', speech: 'We are placing heart monitoring stickers on your chest' },
              { id: 'XRAY_SCAN', label: '📷 X-Ray Required', speech: 'We need an X-Ray picture of your injury' },
              { id: 'NO_FOOD_WATER', label: '🚫 Do Not Eat or Drink', speech: 'Please do not eat or drink anything right now' },
              { id: 'MEDICATION_GIVEN', label: '💊 Pain Medicine Ready', speech: 'The nurse is preparing pain relief medication for you' },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => triggerQuickStaffAction(chip.id, chip.speech)}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/60 text-xs font-semibold text-slate-200 transition-all active:scale-95 shadow-sm text-left"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Staff Voice & Text Input Bar */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Staff Voice / Typed Instruction (Web Speech API)
            </span>
            {speechSupported && (
              <span className={`text-[10px] font-mono ${isListeningToNurse ? 'text-red-400 font-bold animate-pulse' : 'text-slate-400'}`}>
                {isListeningToNurse ? 'Listening to nurse speech...' : 'Microphone standby'}
              </span>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitNurseSpeech();
            }}
            className="flex items-center gap-2"
          >
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2.5 rounded-lg border transition-all ${
                  isListeningToNurse
                    ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-lg shadow-red-600/40'
                    : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                }`}
                title="Toggle Nurse Speech Recognition"
              >
                {isListeningToNurse ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
            )}

            <input
              type="text"
              value={nurseSpeechInput}
              onChange={(e) => setNurseSpeechInput(e.target.value)}
              placeholder="Speak or type clinical instructions... (e.g. Sit in the red wheelchair, need blood test first)"
              className="flex-1 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none font-medium"
            />

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send Card</span>
            </button>
          </form>
        </div>

        {/* Staff Action History */}
        {nurseActionHistory.length > 0 && (
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5">
              Recent Staff Instructions Log:
            </span>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
              {nurseActionHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-200 font-medium truncate">&ldquo;{item.text}&rdquo;</span>
                  <span className="text-[10px] font-mono text-slate-500 ml-2 shrink-0">{item.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
