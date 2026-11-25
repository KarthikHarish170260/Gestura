import React from 'react';
import { Camera, MessageSquare, History, PlayCircle, ShieldCheck } from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (screen: 'home' | 'sign' | 'reply' | 'summary' | 'practice' | 'history') => void;
  hasSummaryData: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, hasSummaryData }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 py-10 bg-[#FAFAF7] text-[#1E293B] select-none">
      {/* Brand & Subtitle */}
      <div className="text-center max-w-2xl mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0F766E]/15 border border-[#0F766E]/30 text-[#044E46] text-xs font-bold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-4 h-4 text-[#044E46]" />
          <span>Pharmacy Counter · 100% Offline Aid</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#1E293B] mb-3">
          Gestura — Pharmacy
        </h1>
        <p className="text-lg md:text-xl text-slate-700 font-normal leading-relaxed">
          Two-way communication aid for sign-language users and pharmacists.
          Powered by on-device AI with instantaneous fallback.
        </p>
      </div>

      {/* Two Large Main Navigation Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-10">
        {/* Button 1: Sign to Pharmacist */}
        <button
          type="button"
          onClick={() => onNavigate('sign')}
          className="group flex flex-col items-start p-8 rounded-2xl bg-white border-2 border-[#CBD5E1] hover:border-[#0F766E] shadow-sm hover:shadow-md transition-all duration-200 text-left min-h-[160px] justify-between focus:outline-none focus:ring-4 focus:ring-[#0F766E]/20"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-3.5 rounded-xl bg-[#0F766E]/15 text-[#044E46] group-hover:bg-[#0F766E] group-hover:text-white transition-colors duration-200">
              <Camera className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#044E46] bg-[#0F766E]/15 px-2.5 py-1 rounded-md">
              Primary Mode
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1E293B] group-hover:text-[#0F766E] transition-colors">
              Sign to Pharmacist
            </h2>
            <p className="text-base text-slate-600 mt-1">
              Live camera sign recognition with 15 essential signs &amp; immediate word chips.
            </p>
          </div>
        </button>

        {/* Button 2: Pharmacist Reply */}
        <button
          type="button"
          onClick={() => onNavigate('reply')}
          className="group flex flex-col items-start p-8 rounded-2xl bg-white border-2 border-[#CBD5E1] hover:border-[#0F766E] shadow-sm hover:shadow-md transition-all duration-200 text-left min-h-[160px] justify-between focus:outline-none focus:ring-4 focus:ring-[#0F766E]/20"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-3.5 rounded-xl bg-slate-200 text-slate-800 group-hover:bg-[#0F766E] group-hover:text-white transition-colors duration-200">
              <MessageSquare className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2.5 py-1 rounded-md">
              Pharmacist Desk
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#1E293B] group-hover:text-[#0F766E] transition-colors">
              Pharmacist Reply
            </h2>
            <p className="text-base text-slate-600 mt-1">
              Type or speak medication instructions, dosage timing, and view sign cards.
            </p>
          </div>
        </button>
      </div>

      {/* Summary Link if active signs */}
      {hasSummaryData && (
        <button
          type="button"
          onClick={() => onNavigate('summary')}
          className="mb-6 px-6 py-3 rounded-xl bg-[#0F766E] text-white text-base font-semibold shadow hover:bg-[#0D655E] transition-colors"
        >
          View Pending Patient Summary →
        </button>
      )}

      {/* Small Secondary Links at Bottom */}
      <div className="flex items-center gap-8 text-sm font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => onNavigate('history')}
          className="flex items-center gap-1.5 hover:text-[#0F766E] transition-colors underline-offset-4 hover:underline"
        >
          <History className="w-4 h-4" />
          <span>Session History</span>
        </button>

        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />

        <button
          type="button"
          onClick={() => onNavigate('practice')}
          className="flex items-center gap-1.5 hover:text-[#0F766E] transition-colors underline-offset-4 hover:underline"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Practice &amp; Rehearsal Mode</span>
        </button>
      </div>

      {/* Academic Capstone Note */}
      <div className="mt-12 text-xs text-slate-600 text-center">
        <span>Gestura • CSA1023 Software Engineering • SIMATS Capstone</span>
      </div>
    </div>
  );
};
