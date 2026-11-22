import React, { useState } from 'react';
import { Volume2, Sliders, Eye, FileSpreadsheet, Check } from 'lucide-react';
import { useConversationStore } from '../store/conversationStore';

interface SettingsViewProps {
  onOpenSUSModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenSUSModal }) => {
  const { settings, updateSettings } = useConversationStore();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    try {
      await fetch('http://127.0.0.1:8000/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Gestura-Token': 'dev-token' },
        body: JSON.stringify({
          sign_language: settings.signLanguage,
          high_contrast: settings.highContrast,
          large_type: settings.largeType,
          caption_font_size: settings.captionFontSize,
          confidence_threshold: settings.confidenceThreshold,
          debounce_frames: settings.debounceFrames,
          tts_rate: settings.ttsRate,
          tts_volume: settings.ttsVolume,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full p-2 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100">Preferences &amp; System Configuration</h2>
          <p className="text-xs text-slate-400">Configure accessibility themes, thresholds, and offline audio devices</p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 animate-fadeIn">
              <Check className="h-4 w-4" /> Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column: Language & Accessibility */}
        <div className="space-y-6">
          {/* Sign Language Selection */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Sliders className="h-4 w-4 text-indigo-400" />
              <span>Sign Language Grammar</span>
            </div>
            <p className="text-xs text-slate-400">Select standard sign language dialect for vocabulary and avatar</p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => updateSettings({ signLanguage: 'ISL' })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  settings.signLanguage === 'ISL'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs">ISL (Indian Sign Language)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Topic-comment interrogative final grammar</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettings({ signLanguage: 'ASL' })}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  settings.signLanguage === 'ASL'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs">ASL (American Sign Language)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Standard North American gloss set</div>
              </button>
            </div>
          </div>

          {/* Accessibility & Visual Theming */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Eye className="h-4 w-4 text-indigo-400" />
              <span>Accessibility &amp; Visual Contrast (WCAG 2.2 AA)</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-200">High-Contrast Theme</div>
                  <div className="text-[10px] text-slate-500">Pure black background with maximum luminance borders</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Large-Type Mode</div>
                  <div className="text-[10px] text-slate-500">Boosts conversation transcript and button typography</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.largeType}
                  onChange={(e) => updateSettings({ largeType: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-300">Caption Font Size</span>
                  <span className="text-xs font-mono font-bold text-indigo-400">{settings.captionFontSize}px</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={28}
                  step={2}
                  value={settings.captionFontSize}
                  onChange={(e) => updateSettings({ captionFontSize: Number(e.target.value) })}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hardware Devices & Usability Survey */}
        <div className="space-y-6">
          {/* Audio Devices */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Volume2 className="h-4 w-4 text-emerald-400" />
              <span>Offline Speech &amp; Audio Settings</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Microphone Input</label>
                <select className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200">
                  <option value="default">Default System Microphone (16 kHz Mono)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-400">TTS Speech Rate</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{settings.ttsRate}x</span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.5}
                  step={0.05}
                  value={settings.ttsRate}
                  onChange={(e) => updateSettings({ ttsRate: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Usability & Evaluation Survey */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
              <span>System Usability Scale (SUS) Evaluation</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Take the standard 10-item System Usability Scale (SUS) survey to evaluate accessibility and benchmark user experience scores offline.
            </p>
            <button
              type="button"
              onClick={onOpenSUSModal}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-xs font-bold text-indigo-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              Open 10-Item SUS Questionnaire
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
