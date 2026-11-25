import React, { useState } from 'react';
import {
  Camera,
  MessageSquare,
  History,
  PlayCircle,
  FileText,
  ShieldCheck,
  Info,
} from 'lucide-react';

// Pharmacy Counter Screens (Demo Path)
import { HomeScreen } from './components/pharmacy/HomeScreen';
import { SignScreen } from './components/pharmacy/SignScreen';
import { ReplyScreen } from './components/pharmacy/ReplyScreen';
import { SummaryScreen } from './components/pharmacy/SummaryScreen';
import { PracticeScreen } from './components/pharmacy/PracticeScreen';
import { HistoryScreen } from './components/pharmacy/HistoryScreen';

// Hidden code preserved for compilation & test suites
import { ConversationView } from './components/ConversationView';
import { RecorderTrainer } from './components/RecorderTrainer';
import { SessionsManager } from './components/SessionsManager';
import { SettingsView } from './components/SettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { SUSSurveyModal } from './components/SUSSurveyModal';
import { ErKioskView } from './er/ErKioskView';
import { useConversationStore } from './store/conversationStore';

// Ensure future-work components stay referenced and compiled
export const _futureWorkSafeguards = [
  ConversationView,
  RecorderTrainer,
  SessionsManager,
  SettingsView,
  ErKioskView,
];

export type PharmacyNavScreen =
  | 'home'
  | 'sign'
  | 'reply'
  | 'summary'
  | 'practice'
  | 'history'
  | 'future_work_modal';

export default function App(): React.ReactElement {
  const [currentScreen, setCurrentScreen] = useState<PharmacyNavScreen>('home');
  const [futureWorkOpen, setFutureWorkOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [susModalOpen, setSusModalOpen] = useState(false);

  const { signerBuffer } = useConversationStore();

  return (
    <div className="flex h-screen w-screen flex-col bg-[#FAFAF7] text-[#1E293B] font-sans select-none overflow-hidden">
      {/* Top Header & Pharmacy Navigation Bar */}
      <header className="flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-6 shadow-sm z-30">
        {/* Brand */}
        <div
          onClick={() => setCurrentScreen('home')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] font-black text-white shadow-md shadow-[#0F766E]/20 text-lg transition-transform group-hover:scale-105">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-[#1E293B]">
                GESTURA
              </h1>
              <span className="rounded-md bg-[#0F766E]/10 px-2 py-0.5 text-[10px] font-mono font-bold text-[#0F766E] border border-[#0F766E]/20">
                PHARMACY
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Offline Non-Urgent Counter Aid · 15 Locked Signs
            </p>
          </div>
        </div>

        {/* Center Screen Navigation Tabs */}
        <nav
          className="hidden md:flex items-center gap-1.5 rounded-2xl bg-[#FAFAF7] p-1.5 border border-[#E2E8F0]"
          aria-label="Pharmacy Navigation"
        >
          <button
            type="button"
            onClick={() => setCurrentScreen('home')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              currentScreen === 'home'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0F766E] hover:bg-white'
            }`}
          >
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen('sign')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              currentScreen === 'sign'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0F766E] hover:bg-white'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Sign to Pharmacist</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen('reply')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              currentScreen === 'reply'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0F766E] hover:bg-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Pharmacist Reply</span>
          </button>

          {signerBuffer.length > 0 && (
            <button
              type="button"
              onClick={() => setCurrentScreen('summary')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                currentScreen === 'summary'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#0F766E] hover:bg-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Summary ({signerBuffer.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setCurrentScreen('practice')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              currentScreen === 'practice'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0F766E] hover:bg-white'
            }`}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            <span>Practice Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentScreen('history')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              currentScreen === 'history'
                ? 'bg-[#0F766E] text-white shadow-sm'
                : 'text-slate-600 hover:text-[#0F766E] hover:bg-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>
        </nav>

        {/* Right Status Badges & Future Work Note */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFutureWorkOpen(true)}
            title="View Architecture Scope & Future Work"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0F766E] font-medium transition-colors"
          >
            <Info className="h-4 w-4 text-slate-400" />
            <span className="hidden sm:inline">Scope &amp; Future Work</span>
          </button>

          <span className="flex items-center gap-1.5 rounded-full bg-[#0F766E]/10 px-3 py-1 text-xs font-semibold text-[#0F766E] border border-[#0F766E]/20">
            <span className="h-2 w-2 rounded-full bg-[#0F766E] animate-pulse" />
            100% Offline
          </span>
        </div>
      </header>

      {/* Main Screen Stage */}
      <main className="flex-1 overflow-y-auto">
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={setCurrentScreen}
            hasSummaryData={signerBuffer.length > 0}
          />
        )}
        {currentScreen === 'sign' && <SignScreen onNavigate={setCurrentScreen} />}
        {currentScreen === 'reply' && <ReplyScreen onNavigate={setCurrentScreen} />}
        {currentScreen === 'summary' && <SummaryScreen onNavigate={setCurrentScreen} />}
        {currentScreen === 'practice' && <PracticeScreen onNavigate={setCurrentScreen} />}
        {currentScreen === 'history' && <HistoryScreen onNavigate={setCurrentScreen} />}
      </main>

      {/* Future Work & Scope Disclosure Modal */}
      {futureWorkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-[#E2E8F0] shadow-xl">
            <div className="flex items-center gap-2 mb-3 text-[#0F766E]">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-xl font-extrabold text-[#1E293B]">Project Scope &amp; Future Work</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              <strong>Gestura</strong> is demonstrated today for a single non-urgent setting: a <strong>pharmacy counter</strong> with 15 isolated signs running 100% offline on a single device with instant text fallback by design.
            </p>
            <div className="bg-[#FAFAF7] p-4 rounded-2xl border border-[#E2E8F0] text-xs text-slate-600 space-y-2 mb-6">
              <div className="font-bold text-slate-800 uppercase tracking-wider">
                Preserved Codebase Modules (Future Work):
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-500">
                <li>Multi-bed ward telemetry console (Next.js web portal)</li>
                <li>Emergency Severity Index (ESI) ER triage kiosk</li>
                <li>Live continuous 3D Avatar sign generation engine</li>
                <li>Full 40-word and 50-concept clinical vocabulary</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setFutureWorkOpen(false)}
              className="w-full py-3 rounded-xl bg-[#0F766E] text-white font-bold text-sm hover:bg-[#0D655E] transition-colors"
            >
              Close &amp; Return to Demo
            </button>
          </div>
        </div>
      )}

      {/* Hidden compilation safeguards */}
      <div className="hidden" aria-hidden="true">
        <OnboardingModal isOpen={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />
        <SUSSurveyModal isOpen={susModalOpen} onClose={() => setSusModalOpen(false)} />
      </div>
    </div>
  );
}
