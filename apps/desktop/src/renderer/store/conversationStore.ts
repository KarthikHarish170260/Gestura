import { create } from 'zustand';

export interface UtteranceItem {
  id: string;
  direction: 'sign_to_speech' | 'speech_to_sign';
  text: string;
  gloss: string;
  confidence: number;
  latencyMs: number;
  timestamp: string;
}

export interface AppSettings {
  signLanguage: 'ISL' | 'ASL';
  highContrast: boolean;
  largeType: boolean;
  captionFontSize: number;
  confidenceThreshold: number;
  debounceFrames: number;
  ttsVoice: string;
  ttsRate: number;
  ttsVolume: number;
  inputMicDevice: string;
  cameraDevice: string;
  fingerspellingMode: boolean;
}

export interface ConversationState {
  // Session
  sessionId: string | null;
  sessionTitle: string;
  utterances: UtteranceItem[];
  setSession: (id: string, title: string) => void;
  addUtterance: (item: UtteranceItem) => void;
  clearUtterances: () => void;

  // Signer pane state
  signerBuffer: string[];
  pendingCaption: string;
  setSignerBuffer: (signs: string[]) => void;
  addSignToBuffer: (sign: string) => void;
  setPendingCaption: (caption: string) => void;
  clearSignerBuffer: () => void;

  // Hearing pane state
  speechTranscript: string;
  avatarGlossSequence: string[];
  setSpeechTranscript: (text: string) => void;
  setAvatarGlossSequence: (glosses: string[]) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Sidecar configuration
  sidecarPort: number;
  sidecarToken: string;
  sidecarOnline: boolean;
  setSidecarStatus: (port: number, token: string, online: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  sessionId: 'default-session',
  sessionTitle: 'Live Conversation',
  utterances: [],
  setSession: (id, title) => set({ sessionId: id, sessionTitle: title }),
  addUtterance: (item) => set((state) => ({ utterances: [item, ...state.utterances] })),
  clearUtterances: () => set({ utterances: [] }),

  signerBuffer: [],
  pendingCaption: '',
  setSignerBuffer: (signs) => set({ signerBuffer: signs, pendingCaption: signs.join(' ') }),
  addSignToBuffer: (sign) =>
    set((state) => {
      const nextBuffer = [...state.signerBuffer, sign];
      return { signerBuffer: nextBuffer, pendingCaption: nextBuffer.join(' ') };
    }),
  setPendingCaption: (caption) => set({ pendingCaption: caption }),
  clearSignerBuffer: () => set({ signerBuffer: [], pendingCaption: '' }),

  speechTranscript: '',
  avatarGlossSequence: [],
  setSpeechTranscript: (text) => set({ speechTranscript: text }),
  setAvatarGlossSequence: (glosses) => set({ avatarGlossSequence: glosses }),

  settings: {
    signLanguage: 'ISL',
    highContrast: false,
    largeType: false,
    captionFontSize: 18,
    confidenceThreshold: 0.65,
    debounceFrames: 4,
    ttsVoice: 'default',
    ttsRate: 1.0,
    ttsVolume: 1.0,
    inputMicDevice: 'default',
    cameraDevice: 'default',
    fingerspellingMode: false,
  },
  updateSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),

  sidecarPort: 8000,
  sidecarToken: 'dev-token',
  sidecarOnline: true,
  setSidecarStatus: (port, token, online) =>
    set({ sidecarPort: port, sidecarToken: token, sidecarOnline: online }),
}));
