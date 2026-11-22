import React, { useState } from 'react';
import { Camera, Mic, Volume2, UserCheck, Settings, History, HelpCircle } from 'lucide-react';

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'conversation' | 'recorder' | 'history' | 'settings'>('conversation');

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
            G
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">GESTURA</h1>
            <p className="text-xs text-slate-400">Offline Bidirectional Sign Communication</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-lg bg-slate-800/80 p-1" aria-label="Main Navigation">
          <button
            type="button"
            onClick={() => setActiveTab('conversation')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'conversation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" />
            Conversation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recorder')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'recorder' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Recorder & Train
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="h-4 w-4" />
            Sessions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Offline Mode
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-hidden p-4">
        {activeTab === 'conversation' && (
          <div className="grid h-full grid-cols-2 gap-4">
            {/* Left Pane: Sign -> Speech/Text */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5 bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-slate-200">Signer Camera (Sign &rarr; Speech)</span>
                </div>
                <span className="text-xs text-slate-400">MediaPipe 30 fps</span>
              </div>
              <div className="relative flex-1 bg-black/60 flex items-center justify-center">
                <span className="text-sm text-slate-500">Camera preview and live landmark skeleton will appear here</span>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recognized Sentence</span>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Edit</button>
                    <button type="button" className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                      <Volume2 className="h-3 w-3" /> Speak
                    </button>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-sm font-medium text-slate-300 min-h-[50px] flex items-center">
                  [Waiting for signing gesture...]
                </div>
              </div>
            </div>

            {/* Right Pane: Speech -> Sign */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2.5 bg-slate-900/80">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-slate-200">Avatar Signer (Speech &rarr; Sign)</span>
                </div>
                <span className="text-xs text-slate-400">Skeleton Avatar 60 fps</span>
              </div>
              <div className="relative flex-1 bg-black/60 flex items-center justify-center">
                <span className="text-sm text-slate-500">Skeleton avatar animation will render here</span>
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Incoming Speech &amp; Gloss</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Mic className="h-3 w-3 text-red-400 animate-pulse" />
                    <span>Listening</span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-sm font-medium text-slate-300 min-h-[50px] flex items-center">
                  [Listening to hearing partner...]
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'conversation' && (
          <div className="flex h-full items-center justify-center text-slate-500">
            <div className="text-center">
              <HelpCircle className="h-10 w-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium capitalize">{activeTab} view will load here.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
