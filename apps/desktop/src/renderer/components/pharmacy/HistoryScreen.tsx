import React from 'react';
import { ArrowLeft, Trash2, Clock, MessageSquare, Camera } from 'lucide-react';
import { useConversationStore } from '../../store/conversationStore';

interface HistoryScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onNavigate }) => {
  const { utterances, clearUtterances } = useConversationStore();

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#FAFAF7] text-[#1E293B] select-none p-6 md:p-10 pb-28 max-w-4xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 hover:text-[#0F766E] hover:bg-white text-base font-semibold border border-transparent hover:border-[#E2E8F0] transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Home</span>
        </button>

        <div className="flex items-center gap-3">
          {utterances.length > 0 && (
            <button
              type="button"
              onClick={clearUtterances}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E] bg-[#0F766E]/10 px-3.5 py-1.5 rounded-full border border-[#0F766E]/20">
            Session History Log ({utterances.length})
          </span>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white p-8 rounded-3xl border border-[#E2E8F0] shadow-sm">
        <div className="border-b border-[#E2E8F0] pb-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#1E293B]">
            Pharmacy Counter Communication Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Chronological record of bidirectional signs and replies during this counter session.
          </p>
        </div>

        {utterances.length > 0 ? (
          <div className="space-y-4">
            {utterances.map((item) => {
              const isPatient = item.direction === 'sign_to_speech';
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-[#FAFAF7] border border-[#E2E8F0] hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-xl ${
                          isPatient
                            ? 'bg-[#0F766E]/10 text-[#0F766E]'
                            : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {isPatient ? (
                          <Camera className="w-4 h-4" />
                        ) : (
                          <MessageSquare className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {isPatient ? 'Patient Signed (Sign -> Speech)' : 'Pharmacist Reply (Speech/Type -> Sign)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.timestamp}</span>
                    </div>
                  </div>

                  <div className="text-xl font-bold text-[#1E293B] mb-2">
                    &ldquo;{item.text}&rdquo;
                  </div>

                  {item.gloss && (
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                      <span className="font-semibold text-slate-400">Gloss sequence:</span>
                      <span className="bg-white px-2 py-0.5 rounded border border-[#E2E8F0] font-bold text-[#0F766E]">
                        {item.gloss}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-[#FAFAF7] rounded-2xl border border-dashed border-[#E2E8F0]">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No History Recorded</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Signs and pharmacist replies from this counter session will appear here in chronological order.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
