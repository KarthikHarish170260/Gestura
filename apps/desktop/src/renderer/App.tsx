import React, { useState } from 'react';
import { Camera, UserCheck, History, Settings, HelpCircle } from 'lucide-react';
import { ConversationView } from './components/ConversationView';
import { RecorderTrainer } from './components/RecorderTrainer';
import { SessionsManager } from './components/SessionsManager';
import { SettingsView } from './components/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { SUSSurveyModal } from './components/SUSSurveyModal';
import { useConversationStore } from './store/conversationStore';

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'conversation' | 'recorder' | 'history' | 'settings'>('conversation');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [susModalOpen, setSusModalOpen] = useState(false);

  const { settings } = useConversationStore();

  const themeClasses = settings.highContrast
    ? 'bg-black text-white font-sans'
    : 'bg-slate-950 text-slate-100 font-sans';

  return (
    <div className={`flex h-screen w-screen flex-col ${themeClasses} select-none overflow-hidden`}>
      {/* Top Header & Global App Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-black text-white shadow-lg shadow-indigo-600/30">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">GESTURA</h1>
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                v0.1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Offline Bidirectional Sign-Language Communication</p>
          </div>
        </div>

        {/* Center Main Tab Bar */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-950 p-1 border border-slate-800" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => setActiveTab('conversation')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'conversation'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Camera className="h-4 w-4" />
            Conversation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recorder')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'recorder'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Recorder &amp; Train
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            Sessions
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>

        {/* Right Status Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOnboardingOpen(true)}
            title="Onboarding & Help Guide"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Guide</span>
          </button>

          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Offline Mode
          </span>
        </div>
      </header>

      {/* Main Tab View Container */}
      <main className="flex-1 overflow-hidden p-4">
        {activeTab === 'conversation' && <ConversationView />}
        {activeTab === 'recorder' && <RecorderTrainer />}
        {activeTab === 'history' && <SessionsManager />}
        {activeTab === 'settings' && <SettingsView onOpenSUSModal={() => setSusModalOpen(true)} />}
      </main>

      {/* Modals */}
      <OnboardingModal isOpen={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />
      <SUSSurveyModal isOpen={susModalOpen} onClose={() => setSusModalOpen(false)} />
    </div>
  );
}
