import React, { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Droplet,
  Wind,
  Biohazard,
  TrendingDown,
  HeartHandshake,
} from 'lucide-react';
import { CameraLandmarkView } from '../components/CameraLandmarkView';
import { InteractiveBodyMap } from './InteractiveBodyMap';
import { ClinicalActionCards } from './ClinicalActionCards';
import { useErKioskStore } from './erKioskStore';
import { ER_50_CONCEPTS } from './erClinicalOntology';

const EMERGENCY_QUICK_CHIPS = [
  { id: 'ALLERGY-PENICILLIN', label: 'Allergy (Penicillin/Food)', icon: ShieldAlert, color: 'border-red-500 bg-red-950/60 text-red-300' },
  { id: 'BLEEDING', label: 'Active Bleeding', icon: Droplet, color: 'border-rose-500 bg-rose-950/60 text-rose-300' },
  { id: 'BREATHE-DIFFICULT', label: 'Cannot Breathe', icon: Wind, color: 'border-amber-500 bg-amber-950/60 text-amber-300' },
  { id: 'PREGNANCY', label: 'Pregnant', icon: HeartHandshake, color: 'border-pink-500 bg-pink-950/60 text-pink-300' },
  { id: 'POISON-BITE', label: 'Poison / Bite', icon: Biohazard, color: 'border-purple-500 bg-purple-950/60 text-purple-300' },
  { id: 'FALL-INJURY', label: 'Fall / Fracture', icon: TrendingDown, color: 'border-cyan-500 bg-cyan-950/60 text-cyan-300' },
];

const PAIN_SCALE_FACES = [
  { val: 1, emoji: '😃', label: 'Mild (1-2)' },
  { val: 3, emoji: '🙂', label: 'Moderate (3-4)' },
  { val: 5, emoji: '😐', label: 'Hurts (5-6)' },
  { val: 7, emoji: '😣', label: 'Severe (7-8)' },
  { val: 9, emoji: '😭', label: 'Worst (9-10)' },
];

export const PatientKioskView: React.FC = () => {
  const {
    mode,
    setMode,
    signSequence,
    clearSequence,
    clarificationPrompt,
    clarificationOptions,
    confirmClarification,
    dismissClarification,
    isAacAutoExpanded,
    setAacAutoExpanded,
    painScale,
    setPainScale,
    activeQuickChips,
    toggleQuickChip,
    textpadNote,
    setTextpadNote,
    addSignToSequence,
  } = useErKioskStore();

  const [activeConceptCategory, setActiveConceptCategory] = useState<'anatomy' | 'symptom' | 'temporal' | 'alert' | 'need'>('anatomy');
  const [showConceptTester, setShowConceptTester] = useState(false);

  const filteredConcepts = ER_50_CONCEPTS.filter((c) => c.category === activeConceptCategory);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl select-none">
      {/* Kiosk Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
            Patient Kiosk View &bull; Live Intake
          </h2>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Sign &bull; Tap &bull; AAC
          </span>
        </div>

        {/* Mode Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'multimodal' ? 'textpad' : 'multimodal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              mode === 'textpad'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{mode === 'textpad' ? 'Back to Sign / Camera' : 'Switch to Direct Textpad'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {mode === 'textpad' ? (
        /* Direct Textpad Fallback Screen */
        <div className="flex-1 flex flex-col p-4 bg-slate-950 gap-3 overflow-y-auto">
          <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <FileText className="h-4 w-4" />
              <span>Direct Emergency Textpad Mode Active</span>
            </div>
            <button
              type="button"
              onClick={() => setMode('multimodal')}
              className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-extrabold hover:bg-amber-400"
            >
              Return to Camera / Sign Kiosk
            </button>
          </div>

          <label htmlFor="patient-textpad" className="text-xs font-semibold text-slate-300">
            Type or write your emergency symptoms directly below:
          </label>
          <textarea
            id="patient-textpad"
            value={textpadNote}
            onChange={(e) => setTextpadNote(e.target.value)}
            placeholder="Type your emergency symptoms here... (e.g. My chest hurts very badly since this morning, I have asthma)"
            rows={8}
            className="w-full flex-1 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400 p-4 text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-medium leading-relaxed"
          />

          {/* Quick-tap phrases for textpad */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'Chest pain since morning',
              'Severe asthma cannot breathe',
              'Penicillin allergy alert',
              'Stomach pain and vomiting',
              'Need wheelchair urgently',
            ].map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => setTextpadNote(textpadNote ? `${textpadNote}. ${phrase}` : phrase)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200"
              >
                + {phrase}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Multimodal Kiosk Screen (Camera + Sequence Ribbon + Cards + AAC) */
        <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
          {/* Top Half: Camera View + Real-Time Gloss Ribbon */}
          <div className="relative min-h-[300px] h-[48%] rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">
            {/* Live Camera View with Skeletal Holographic Overlay */}
            <div className="flex-1 relative overflow-hidden">
              <CameraLandmarkView />

              {/* Gloss Sequence Ribbon Bar Overlay */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between p-2 rounded-lg bg-slate-950/85 backdrop-blur border border-cyan-500/30 z-10">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
                  <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">
                    Live Gloss Sequence:
                  </span>
                  {signSequence.length === 0 ? (
                    <span className="text-xs text-slate-400 font-medium italic">
                      Sign clearly in camera view to build symptom sequence...
                    </span>
                  ) : (
                    signSequence.map((gloss, idx) => (
                      <span
                        key={`${gloss}-${idx}`}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-extrabold animate-in fade-in"
                      >
                        <span>[{gloss}]</span>
                        {idx < signSequence.length - 1 && <span className="text-slate-500 font-normal">&rarr;</span>}
                      </span>
                    ))
                  )}
                </div>

                {signSequence.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSequence}
                    className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-red-400 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors ml-2"
                  >
                    <RotateCcw className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {/* Clarification Confirmation Banner */}
              {clarificationPrompt && (
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-amber-950/90 border-2 border-amber-500/80 shadow-2xl z-20 animate-in slide-in-from-bottom">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-amber-200 text-xs font-bold">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span>{clarificationPrompt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={dismissClarification}
                      className="text-[10px] font-mono text-slate-400 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>

                  {clarificationOptions && (
                    <div className="flex items-center gap-2">
                      {clarificationOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => confirmClarification(opt)}
                          className="flex-1 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs shadow-md hover:bg-amber-400 active:scale-95 transition-all"
                        >
                          Yes, Confirm: [{opt}]
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Clinical Action Cards (Displaying Nurse Instructions) */}
          <div className="shrink-0">
            <ClinicalActionCards />
          </div>

          {/* 50-Concept Quick Simulator Tester (Collapsible Drawer for Demonstration) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowConceptTester(!showConceptTester)}
                className="flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
              >
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                <span>50-Concept Bounded Lexicon Quick-Sign Simulator ({activeConceptCategory})</span>
                {showConceptTester ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <span className="text-[10px] font-mono text-slate-400">Click concept to simulate camera detection</span>
            </div>

            {showConceptTester && (
              <div className="mt-2 pt-2 border-t border-slate-800">
                {/* Category Pills */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 scrollbar-thin">
                  {(['anatomy', 'symptom', 'temporal', 'alert', 'need'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      data-testid={`concept-cat-${cat}`}
                      onClick={() => setActiveConceptCategory(cat)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase transition-all ${
                        activeConceptCategory === cat
                          ? 'bg-cyan-400 text-slate-950 font-extrabold shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Concept Action Buttons */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {filteredConcepts.map((concept) => (
                    <button
                      key={concept.id}
                      type="button"
                      onClick={() => addSignToSequence(concept.id, 0.95)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-600 hover:text-white border border-slate-700 text-xs font-mono font-semibold text-slate-200 transition-all active:scale-95 shadow-sm"
                      title={concept.description}
                    >
                      <span className="text-cyan-400 font-bold">+</span>
                      <span>{concept.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Half: One-Tap AAC Fallback Tray */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  One-Tap AAC Fallback Tray (Low-Literacy &amp; High-Pressure Bridge)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAacAutoExpanded(!isAacAutoExpanded)}
                className="text-[11px] font-mono text-cyan-300 hover:text-white"
              >
                {isAacAutoExpanded ? 'Collapse Body Map' : 'Expand Body Map'}
              </button>
            </div>

            {/* Pain Scale Slider with Wong-Baker Faces */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-300">
                  Pain Level (1-10 Scale): <span className="text-cyan-400 font-extrabold text-sm">{painScale} / 10</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {painScale >= 8 ? '🚨 Severe / Acute' : painScale >= 5 ? '⚠️ Moderate' : '✅ Mild'}
                </span>
              </div>

              {/* Face Buttons */}
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {PAIN_SCALE_FACES.map((face) => (
                  <button
                    key={face.val}
                    type="button"
                    onClick={() => setPainScale(face.val)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                      Math.abs(painScale - face.val) <= 1
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{face.emoji}</span>
                    <span className="text-[10px] font-mono font-bold mt-0.5">{face.label}</span>
                  </button>
                ))}
              </div>

              {/* Range Slider */}
              <input
                type="range"
                min="1"
                max="10"
                value={painScale}
                onChange={(e) => setPainScale(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                aria-label="Pain intensity scale slider from 1 to 10"
              />
            </div>

            {/* Emergency Quick-Tap Chips (6 High-Yield Clinical Alerts) */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Emergency One-Tap Clinical Chips:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EMERGENCY_QUICK_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  const isActive = activeQuickChips.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => toggleQuickChip(chip.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                        isActive
                          ? `${chip.color} shadow-md scale-[1.02] font-bold`
                          : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold">{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Anatomical Body Map (Rendered when expanded) */}
            {isAacAutoExpanded && (
              <div className="mt-1">
                <InteractiveBodyMap />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
