import { create } from 'zustand';
import {
  ClinicalTriageStatement,
  VisualActionCard,
  parseGlossSequenceToClinicalStatement,
  parseStaffSpeechToVisualCards,
  calculateEsiLevel,
} from './erClinicalOntology';

export interface BenchmarkLogEntry {
  id: string;
  scenario: string;
  method: 'multimodal' | 'textpad';
  completionTimeSec: number;
  clarificationLoops: number;
  accuracyPass: boolean;
  timestamp: string;
}

export interface ErKioskState {
  // Mode & Navigation
  mode: 'multimodal' | 'textpad';
  isAacAutoExpanded: boolean;
  evaluationHarnessOpen: boolean;

  // Patient Sign & Sequence State
  signSequence: string[];
  lastDetectedGloss: string;
  lastDetectedConfidence: number;
  consecutiveLowConfidenceCount: number;
  clarificationPrompt: string | null;
  clarificationOptions: string[] | null;

  // AAC Fallback Tray State
  selectedBodyRegion: string | null;
  painScale: number; // 1-10
  activeQuickChips: string[];
  textpadNote: string;

  // Live Clinical Triage Record
  currentStatement: ClinicalTriageStatement | null;
  isEmrLogged: boolean;
  triageHistory: ClinicalTriageStatement[];
  lastSpokenNarrative: string;

  // Staff / Nurse View State
  nurseSpeechInput: string;
  isListeningToNurse: boolean;
  activeVisualActionCards: VisualActionCard[];
  nurseActionHistory: Array<{ text: string; timestamp: string; cardId?: string }>;

  // Evaluation & A/B Benchmark Logger
  isBenchmarkActive: boolean;
  benchmarkScenario: string | null;
  benchmarkMethod: 'multimodal' | 'textpad' | null;
  benchmarkStartTime: number | null;
  clarificationLoopCount: number;
  benchmarkLogs: BenchmarkLogEntry[];

  // Actions
  addSignToSequence: (gloss: string, confidence: number) => void;
  confirmClarification: (chosenGloss: string) => void;
  dismissClarification: () => void;
  selectBodyRegion: (regionId: string) => void;
  setPainScale: (val: number) => void;
  toggleQuickChip: (chipId: string) => void;
  setTextpadNote: (note: string) => void;
  setMode: (mode: 'multimodal' | 'textpad') => void;
  setAacAutoExpanded: (expanded: boolean) => void;
  setEvaluationHarnessOpen: (open: boolean) => void;
  clearSequence: () => void;
  resetPatientIntake: () => void;

  // Staff Actions
  setNurseSpeechInput: (text: string) => void;
  setIsListeningToNurse: (listening: boolean) => void;
  submitNurseSpeech: (speechOverride?: string) => void;
  triggerQuickStaffAction: (cardId: string, customText?: string) => void;
  clearVisualActionCards: () => void;

  // Benchmark Actions
  startBenchmark: (scenario: string, method: 'multimodal' | 'textpad') => void;
  recordClarificationLoop: () => void;
  finishBenchmark: (accuracyPass: boolean) => BenchmarkLogEntry | null;
  clearBenchmarkLogs: () => void;
}

// Helper: Synthesize audio to triage nurse
function speakTriageNarrative(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio fallback drop safely
    }
  }
}

// Helper: Play AAC chime alert
function playChimeAlert() {
  if (typeof window !== 'undefined' && 'AudioContext' in window) {
    try {
      const ctx = new window.AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Silently ignore audio context restrictions
    }
  }
}

export const useErKioskStore = create<ErKioskState>((set, get) => ({
  mode: 'multimodal',
  isAacAutoExpanded: false,
  evaluationHarnessOpen: false,

  signSequence: [],
  lastDetectedGloss: '',
  lastDetectedConfidence: 0,
  consecutiveLowConfidenceCount: 0,
  clarificationPrompt: null,
  clarificationOptions: null,

  selectedBodyRegion: null,
  painScale: 5,
  activeQuickChips: [],
  textpadNote: '',

  currentStatement: null,
  isEmrLogged: false,
  triageHistory: [],
  lastSpokenNarrative: '',

  nurseSpeechInput: '',
  isListeningToNurse: false,
  activeVisualActionCards: [],
  nurseActionHistory: [],

  isBenchmarkActive: false,
  benchmarkScenario: null,
  benchmarkMethod: null,
  benchmarkStartTime: null,
  clarificationLoopCount: 0,
  benchmarkLogs: [],

  addSignToSequence: (gloss: string, confidence: number) => {
    const state = get();
    const cleanGloss = gloss.toUpperCase().trim();
    if (!cleanGloss || cleanGloss === 'SEARCHING' || cleanGloss === 'UNKNOWN') return;

    // 1. Confidence Threshold Gating Logic:
    // If confidence < 0.45:
    if (confidence < 0.45) {
      const newLowCount = state.consecutiveLowConfidenceCount + 1;
      if (newLowCount >= 2 && !state.isAacAutoExpanded) {
        playChimeAlert();
        set({
          consecutiveLowConfidenceCount: newLowCount,
          isAacAutoExpanded: true,
          clarificationPrompt: 'Ambiguous sign detected. Tap your symptom on the body map below or use the textpad.',
        });
      } else {
        set({ consecutiveLowConfidenceCount: newLowCount });
      }
      return;
    }

    // If confidence between 0.45 and 0.74:
    if (confidence < 0.75) {
      const altOptions = cleanGloss.includes('CHEST')
        ? ['CHEST', 'ABDOMEN']
        : cleanGloss.includes('HEAD')
        ? ['HEAD', 'THROAT']
        : [cleanGloss, 'PAIN'];

      get().recordClarificationLoop();

      set({
        lastDetectedGloss: cleanGloss,
        lastDetectedConfidence: confidence,
        consecutiveLowConfidenceCount: 0,
        clarificationPrompt: `Did you mean: [${altOptions[0]}] or [${altOptions[1]}]?`,
        clarificationOptions: altOptions,
      });
      return;
    }

    // High confidence (>= 0.75):
    // Add to sliding sequence buffer (max 6 items)
    const newSeq = [...state.signSequence, cleanGloss].slice(-6);
    const statement = parseGlossSequenceToClinicalStatement(newSeq, confidence);

    set({
      signSequence: newSeq,
      lastDetectedGloss: cleanGloss,
      lastDetectedConfidence: confidence,
      consecutiveLowConfidenceCount: 0,
      clarificationPrompt: null,
      clarificationOptions: null,
      currentStatement: statement,
      isEmrLogged: true,
    });

    // Synthesize audio to nurse if statement is actionable and distinct from last
    if (statement.narrativeSpeech !== state.lastSpokenNarrative) {
      set({ lastSpokenNarrative: statement.narrativeSpeech });
      speakTriageNarrative(statement.narrativeSpeech);
    }
  },

  confirmClarification: (chosenGloss: string) => {
    const state = get();
    const newSeq = [...state.signSequence, chosenGloss].slice(-6);
    const statement = parseGlossSequenceToClinicalStatement(newSeq, 0.92);

    set({
      signSequence: newSeq,
      lastDetectedGloss: chosenGloss,
      lastDetectedConfidence: 0.92,
      clarificationPrompt: null,
      clarificationOptions: null,
      currentStatement: statement,
      isEmrLogged: true,
    });

    if (statement.narrativeSpeech !== state.lastSpokenNarrative) {
      set({ lastSpokenNarrative: statement.narrativeSpeech });
      speakTriageNarrative(statement.narrativeSpeech);
    }
  },

  dismissClarification: () => {
    set({
      clarificationPrompt: null,
      clarificationOptions: null,
    });
  },

  selectBodyRegion: (regionId: string) => {
    const state = get();
    const newSeq = [regionId, ...state.activeQuickChips];
    const statement = parseGlossSequenceToClinicalStatement(newSeq, 0.95);

    set({
      selectedBodyRegion: regionId,
      currentStatement: statement,
      isEmrLogged: true,
    });

    if (statement.narrativeSpeech !== state.lastSpokenNarrative) {
      set({ lastSpokenNarrative: statement.narrativeSpeech });
      speakTriageNarrative(statement.narrativeSpeech);
    }
  },

  setPainScale: (val: number) => {
    const state = get();
    const cur = state.currentStatement;
    if (cur) {
      const updatedEsi = calculateEsiLevel(
        [cur.location],
        cur.symptoms,
        cur.alerts,
        val,
        cur.duration.includes('Sudden')
      );
      set({
        painScale: val,
        currentStatement: {
          ...cur,
          painScaleEstimated: val,
          esi: updatedEsi,
        },
      });
    } else {
      set({ painScale: val });
    }
  },

  toggleQuickChip: (chipId: string) => {
    const state = get();
    const exists = state.activeQuickChips.includes(chipId);
    const newChips = exists
      ? state.activeQuickChips.filter((c) => c !== chipId)
      : [...state.activeQuickChips, chipId];

    const tokens = state.selectedBodyRegion ? [state.selectedBodyRegion, ...newChips] : newChips;
    const statement = parseGlossSequenceToClinicalStatement(tokens, 0.95);

    set({
      activeQuickChips: newChips,
      currentStatement: statement,
      isEmrLogged: true,
    });

    if (statement.narrativeSpeech !== state.lastSpokenNarrative) {
      set({ lastSpokenNarrative: statement.narrativeSpeech });
      speakTriageNarrative(statement.narrativeSpeech);
    }
  },

  setTextpadNote: (note: string) => {
    set({ textpadNote: note });
  },

  setMode: (mode: 'multimodal' | 'textpad') => {
    set({ mode });
  },

  setAacAutoExpanded: (expanded: boolean) => {
    set({ isAacAutoExpanded: expanded });
  },

  setEvaluationHarnessOpen: (open: boolean) => {
    set({ evaluationHarnessOpen: open });
  },

  clearSequence: () => {
    set({
      signSequence: [],
      lastDetectedGloss: '',
      lastDetectedConfidence: 0,
      clarificationPrompt: null,
      clarificationOptions: null,
    });
  },

  resetPatientIntake: () => {
    const state = get();
    if (state.currentStatement) {
      set((s) => ({
        triageHistory: [state.currentStatement!, ...s.triageHistory],
      }));
    }

    set({
      signSequence: [],
      lastDetectedGloss: '',
      lastDetectedConfidence: 0,
      consecutiveLowConfidenceCount: 0,
      clarificationPrompt: null,
      clarificationOptions: null,
      selectedBodyRegion: null,
      painScale: 5,
      activeQuickChips: [],
      textpadNote: '',
      currentStatement: null,
      isEmrLogged: false,
      lastSpokenNarrative: '',
      activeVisualActionCards: [],
    });
  },

  setNurseSpeechInput: (text: string) => {
    set({ nurseSpeechInput: text });
  },

  setIsListeningToNurse: (listening: boolean) => {
    set({ isListeningToNurse: listening });
  },

  submitNurseSpeech: (speechOverride?: string) => {
    const state = get();
    const text = (speechOverride ?? state.nurseSpeechInput).trim();
    if (!text) return;

    const cards = parseStaffSpeechToVisualCards(text);
    const newEntry = {
      text,
      timestamp: new Date().toLocaleTimeString(),
      cardId: cards[0]?.id,
    };

    set({
      nurseSpeechInput: '',
      activeVisualActionCards: cards,
      nurseActionHistory: [newEntry, ...state.nurseActionHistory],
    });
  },

  triggerQuickStaffAction: (cardId: string, customText?: string) => {
    const state = get();
    const cards = parseStaffSpeechToVisualCards(customText ?? cardId);
    const text = customText ?? cards[0]?.title ?? 'Staff instruction';

    const newEntry = {
      text,
      timestamp: new Date().toLocaleTimeString(),
      cardId,
    };

    set({
      activeVisualActionCards: cards,
      nurseActionHistory: [newEntry, ...state.nurseActionHistory],
    });

    speakTriageNarrative(text);
  },

  clearVisualActionCards: () => {
    set({ activeVisualActionCards: [] });
  },

  startBenchmark: (scenario: string, method: 'multimodal' | 'textpad') => {
    set({
      isBenchmarkActive: true,
      benchmarkScenario: scenario,
      benchmarkMethod: method,
      benchmarkStartTime: performance.now(),
      clarificationLoopCount: 0,
      mode: method,
    });
  },

  recordClarificationLoop: () => {
    const state = get();
    if (state.isBenchmarkActive) {
      set({ clarificationLoopCount: state.clarificationLoopCount + 1 });
    }
  },

  finishBenchmark: (accuracyPass: boolean): BenchmarkLogEntry | null => {
    const state = get();
    if (!state.isBenchmarkActive || !state.benchmarkStartTime || !state.benchmarkScenario || !state.benchmarkMethod) {
      return null;
    }

    const elapsedMs = performance.now() - state.benchmarkStartTime;
    const completionTimeSec = Math.round((elapsedMs / 1000) * 10) / 10;

    const newEntry: BenchmarkLogEntry = {
      id: `bm-${Date.now()}`,
      scenario: state.benchmarkScenario,
      method: state.benchmarkMethod,
      completionTimeSec,
      clarificationLoops: state.clarificationLoopCount,
      accuracyPass,
      timestamp: new Date().toLocaleTimeString(),
    };

    set((s) => ({
      isBenchmarkActive: false,
      benchmarkStartTime: null,
      benchmarkLogs: [newEntry, ...s.benchmarkLogs],
    }));

    return newEntry;
  },

  clearBenchmarkLogs: () => {
    set({ benchmarkLogs: [] });
  },
}));
