import React from 'react';
import {
  Accessibility,
  Armchair,
  Syringe,
  DoorOpen,
  UserCheck,
  HeartPulse,
  ScanLine,
  Ban,
  Pill,
  CheckCircle,
} from 'lucide-react';
import { useErKioskStore } from './erKioskStore';
import { VisualActionCard } from './erClinicalOntology';

interface IconRendererProps {
  name: string;
  className?: string;
}

const ActionCardIcon: React.FC<IconRendererProps> = ({ name, className = 'h-10 w-10' }) => {
  switch (name) {
    case 'Accessibility':
      return <Accessibility className={className} />;
    case 'Armchair':
      return <Armchair className={className} />;
    case 'Syringe':
      return <Syringe className={className} />;
    case 'DoorOpen':
      return <DoorOpen className={className} />;
    case 'UserCheck':
      return <UserCheck className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'ScanLine':
      return <ScanLine className={className} />;
    case 'Ban':
      return <Ban className={className} />;
    case 'Pill':
      return <Pill className={className} />;
    default:
      return <CheckCircle className={className} />;
  }
};

export const ClinicalActionCards: React.FC = () => {
  const { activeVisualActionCards, clearVisualActionCards } = useErKioskStore();

  const getCardTheme = (theme: VisualActionCard['colorTheme']) => {
    switch (theme) {
      case 'red':
        return {
          bg: 'bg-rose-950/80',
          border: 'border-rose-500',
          glow: 'shadow-rose-900/40',
          iconColor: 'text-rose-400',
          titleColor: 'text-rose-100',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'amber':
        return {
          bg: 'bg-amber-950/80',
          border: 'border-amber-500',
          glow: 'shadow-amber-900/40',
          iconColor: 'text-amber-400',
          titleColor: 'text-amber-100',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-950/80',
          border: 'border-emerald-500',
          glow: 'shadow-emerald-900/40',
          iconColor: 'text-emerald-400',
          titleColor: 'text-emerald-100',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'cyan':
        return {
          bg: 'bg-cyan-950/80',
          border: 'border-cyan-500',
          glow: 'shadow-cyan-900/40',
          iconColor: 'text-cyan-400',
          titleColor: 'text-cyan-100',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'indigo':
      default:
        return {
          bg: 'bg-indigo-950/80',
          border: 'border-indigo-500',
          glow: 'shadow-indigo-900/40',
          iconColor: 'text-indigo-400',
          titleColor: 'text-indigo-100',
          badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        };
    }
  };

  if (activeVisualActionCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800/80 rounded-xl text-center select-none">
        <Armchair className="h-10 w-10 text-cyan-400/80 mb-2 animate-pulse" />
        <h4 className="text-sm font-bold text-slate-200">Patient Status: Check-in Ready</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please sign or tap your symptoms. Triage instructions from staff will appear here with high-visibility visual icons.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Triage Nurse Instructions (Visual Action Cards)
          </h4>
        </div>
        <button
          type="button"
          onClick={clearVisualActionCards}
          className="text-[11px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          Acknowledge / Dismiss
        </button>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activeVisualActionCards.map((card) => {
          const theme = getCardTheme(card.colorTheme);
          return (
            <div
              key={card.id}
              className={`flex flex-col justify-between p-4 rounded-xl border-2 ${theme.bg} ${theme.border} shadow-lg ${theme.glow} transition-all duration-300 hover:scale-[1.02]`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-slate-950/60 border border-white/10 ${theme.iconColor}`}>
                  <ActionCardIcon name={card.iconName} className="h-10 w-10" />
                </div>
                <div className="flex-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border mb-1 ${theme.badgeBg}`}>
                    {card.category}
                  </span>
                  <h3 className={`text-base font-extrabold tracking-tight ${theme.titleColor}`}>
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium mt-1">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* Sign Confirmation Clip / Tag */}
              {card.avatarSignGloss && (
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>Sign Reference: [{card.avatarSignGloss}]</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Universal Symbol</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
