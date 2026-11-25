import React, { useState } from 'react';
import { Columns, User, Stethoscope, Shield } from 'lucide-react';
import { PatientKioskView } from './PatientKioskView';
import { StaffTriageView } from './StaffTriageView';
import { EvaluationHarnessModal } from './EvaluationHarnessModal';
import { useErKioskStore } from './erKioskStore';

interface ErKioskViewProps {
  onOpenSUSModal?: () => void;
}

export const ErKioskView: React.FC<ErKioskViewProps> = ({ onOpenSUSModal }) => {
  const [viewMode, setViewMode] = useState<'split' | 'patient_only' | 'staff_only'>('split');
  const { evaluationHarnessOpen } = useErKioskStore();

  return (
    <div className="flex flex-col h-full w-full gap-2">
      {/* Top Kiosk Configuration Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Shield className="h-4 w-4 text-rose-400" />
            <span>Gestura-ER &bull; Fixed Emergency Triage Kiosk</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
            Emergency Medicine Protocol
          </span>
        </div>

        {/* Display Layout Switcher (Dual Split vs Single Monitor Patient / Staff) */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dual-facing split screen (Patient on left, Nurse on right)"
          >
            <Columns className="h-3 w-3" />
            <span>Dual Split Kiosk</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('patient_only')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              viewMode === 'patient_only'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Full-screen patient kiosk terminal"
          >
            <User className="h-3 w-3" />
            <span>Patient Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('staff_only')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              viewMode === 'staff_only'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Full-screen staff triage station"
          >
            <Stethoscope className="h-3 w-3" />
            <span>Staff Station</span>
          </button>
        </div>
      </div>

      {/* Main Kiosk Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-full">
            <PatientKioskView />
            <StaffTriageView />
          </div>
        )}

        {viewMode === 'patient_only' && (
          <div className="h-full w-full">
            <PatientKioskView />
          </div>
        )}

        {viewMode === 'staff_only' && (
          <div className="h-full w-full">
            <StaffTriageView />
          </div>
        )}
      </div>

      {/* A/B Evaluation Benchmark Modal */}
      {evaluationHarnessOpen && (
        <EvaluationHarnessModal onOpenSUSModal={onOpenSUSModal} />
      )}
    </div>
  );
};
