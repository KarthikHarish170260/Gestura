import React, { useState } from 'react';
import { Search, Trash2, Calendar, MessageSquare, AlertTriangle, FileText, Code, Globe } from 'lucide-react';
import { useConversationStore } from '../store/conversationStore';

interface SessionItem {
  id: string;
  title: string;
  signLanguage: string;
  createdAt: string;
  turnCount: number;
}

export const SessionsManager: React.FC = () => {
  const { utterances, clearUtterances } = useConversationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([
    {
      id: 'sess-today',
      title: 'Hospital Consultation & Medical Signs',
      signLanguage: 'ISL',
      createdAt: 'Today, 10:30 AM',
      turnCount: Math.max(4, utterances.length),
    },
    {
      id: 'sess-yesterday',
      title: 'Family Gathering & Evening Chat',
      signLanguage: 'ISL',
      createdAt: 'Yesterday, 4:15 PM',
      turnCount: 8,
    },
  ]);

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = async (sessionId: string, format: 'json' | 'txt' | 'html') => {
    // Attempt download from sidecar, fallback to browser generation
    try {
      const resp = await fetch(`http://127.0.0.1:8000/export/${sessionId}?format=${format}`, {
        headers: { 'X-Gestura-Token': 'dev-token' },
      });
      if (resp.ok) {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gestura_${sessionId}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback local file download
    }

    const dummyContent = format === 'json'
      ? JSON.stringify({ sessionId, title: 'Exported Session', utterances }, null, 2)
      : `GESTURA Session Transcript\nSession ID: ${sessionId}\nDate: ${new Date().toISOString()}\n\n` +
        utterances.map(u => `[${u.direction}] ${u.text} (Gloss: ${u.gloss})`).join('\n');

    const mime = format === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([dummyContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestura_${sessionId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const handleWipeAll = async () => {
    try {
      await fetch('http://127.0.0.1:8000/sessions', {
        method: 'DELETE',
        headers: { 'X-Gestura-Token': 'dev-token' },
      });
    } catch {
      // Continue local wipe
    }
    setSessions([]);
    clearUtterances();
    setShowWipeConfirm(false);
  };

  return (
    <div className="flex flex-col h-full p-2 space-y-4">
      {/* Top Header & Search Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100">Session History &amp; Privacy Management</h2>
          <p className="text-xs text-slate-400">All conversation transcripts are stored locally in SQLite WAL mode</p>
        </div>

        <button
          type="button"
          onClick={() => setShowWipeConfirm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-red-600/10 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-600 hover:text-white transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Full Data Wipe
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <label htmlFor="search-history" className="sr-only">Search past conversations by keyword</label>
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          id="search-history"
          aria-label="Search past conversations by keyword"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search past conversations by keyword..."
          className="w-full rounded-lg bg-slate-900/60 border border-slate-800 pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
        />
      </div>

      {/* Sessions Table */}
      <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-y-auto h-full">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 space-y-2">
              <MessageSquare className="h-8 w-8 text-slate-400" />
              <span>No matching conversation sessions found.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {filteredSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">{s.title}</span>
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border border-indigo-500/20">
                        {s.signLanguage}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {s.createdAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {s.turnCount} turns
                      </span>
                    </div>
                  </div>

                  {/* Actions: Export & Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExport(s.id, 'json')}
                      title="Export JSON"
                      className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Code className="h-3 w-3 text-indigo-400" /> JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(s.id, 'txt')}
                      title="Export Text"
                      className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <FileText className="h-3 w-3 text-emerald-400" /> TXT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport(s.id, 'html')}
                      title="Export Printable HTML"
                      className="flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs font-mono text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Globe className="h-3 w-3 text-sky-400" /> HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s.id)}
                      title="Delete session"
                      className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-slate-400 hover:bg-red-600/20 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Data Wipe */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-slate-100">Permanent Privacy Data Wipe</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              This action will permanently erase all stored sessions, utterances, and user-recorded landmark sequences from the local SQLite database. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipeAll}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 shadow-lg shadow-red-600/30"
              >
                Erase Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
