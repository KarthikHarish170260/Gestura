import React from 'react';
import { useErKioskStore } from './erKioskStore';

export interface BodyRegionDef {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
  badgeX: number;
  badgeY: number;
}

const BODY_REGIONS: BodyRegionDef[] = [
  { id: 'HEAD', name: 'Head / Brain', x: 80, y: 15, width: 40, height: 42, rx: 20, badgeX: 130, badgeY: 35 },
  { id: 'EYE', name: 'Eyes / Vision', x: 86, y: 30, width: 28, height: 12, rx: 6, badgeX: 40, badgeY: 35 },
  { id: 'THROAT', name: 'Throat / Neck', x: 90, y: 60, width: 20, height: 16, rx: 6, badgeX: 130, badgeY: 68 },
  { id: 'TOOTH', name: 'Tooth / Jaw', x: 88, y: 44, width: 24, height: 14, rx: 6, badgeX: 40, badgeY: 52 },
  { id: 'CHEST', name: 'Chest / Heart', x: 68, y: 80, width: 64, height: 48, rx: 12, badgeX: 145, badgeY: 104 },
  { id: 'ABDOMEN', name: 'Stomach / Gut', x: 72, y: 132, width: 56, height: 44, rx: 10, badgeX: 30, badgeY: 154 },
  { id: 'BACK', name: 'Back / Spine', x: 78, y: 95, width: 44, height: 75, rx: 8, badgeX: 145, badgeY: 145 },
  { id: 'ARM', name: 'Arms / Hands', x: 30, y: 85, width: 34, height: 110, rx: 14, badgeX: 15, badgeY: 110 },
  { id: 'LEG', name: 'Legs / Feet', x: 65, y: 180, width: 70, height: 130, rx: 16, badgeX: 145, badgeY: 245 },
  { id: 'SKIN', name: 'Skin / Rash', x: 82, y: 220, width: 36, height: 40, rx: 8, badgeX: 30, badgeY: 220 },
];

export const InteractiveBodyMap: React.FC = () => {
  const { selectedBodyRegion, selectBodyRegion, painScale } = useErKioskStore();

  const getRegionFill = (regionId: string) => {
    const isSelected = selectedBodyRegion === regionId;
    if (!isSelected) return 'rgba(30, 41, 59, 0.65)'; // slate-800/65

    // Color code based on pain scale
    if (painScale >= 8) return 'rgba(239, 68, 68, 0.85)'; // Red critical
    if (painScale >= 5) return 'rgba(245, 158, 11, 0.85)'; // Amber moderate
    return 'rgba(16, 185, 129, 0.85)'; // Emerald mild
  };

  const getRegionStroke = (regionId: string) => {
    const isSelected = selectedBodyRegion === regionId;
    if (!isSelected) return '#475569'; // slate-600
    if (painScale >= 8) return '#f87171'; // red-400
    if (painScale >= 5) return '#fbbf24'; // amber-400
    return '#34d399'; // emerald-400
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-xl border border-slate-800 p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            One-Tap Pain Locator (Body Map)
          </h3>
        </div>
        {selectedBodyRegion && (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Selected: {selectedBodyRegion}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mb-2">
        Tap the exact body area on the diagram below to indicate your chief location of pain:
      </p>

      {/* SVG Interactive Anatomical Figure */}
      <div className="relative flex-1 flex items-center justify-center min-h-[260px] max-h-[340px] bg-slate-900/40 rounded-lg border border-slate-800/80 p-2 overflow-hidden">
        <svg
          viewBox="0 0 200 320"
          className="h-full w-auto max-w-[240px] filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          aria-label="Interactive Human Body Anatomy Map"
        >
          {/* Base Background Silhouette */}
          <g opacity="0.3" stroke="#64748b" strokeWidth="1.5" fill="#0f172a">
            {/* Head */}
            <circle cx="100" cy="36" r="22" />
            {/* Neck */}
            <rect x="94" y="58" width="12" height="18" rx="4" />
            {/* Torso */}
            <path d="M 68 76 Q 100 68 132 76 L 126 175 L 74 175 Z" />
            {/* Left Arm */}
            <path d="M 68 76 L 40 140 L 32 190" strokeWidth="12" strokeLinecap="round" />
            {/* Right Arm */}
            <path d="M 132 76 L 160 140 L 168 190" strokeWidth="12" strokeLinecap="round" />
            {/* Left Leg */}
            <path d="M 82 175 L 78 250 L 74 308" strokeWidth="16" strokeLinecap="round" />
            {/* Right Leg */}
            <path d="M 118 175 L 122 250 L 126 308" strokeWidth="16" strokeLinecap="round" />
          </g>

          {/* Clickable Active Anatomical Regions */}
          {BODY_REGIONS.map((region) => {
            const isSelected = selectedBodyRegion === region.id;
            return (
              <g
                key={region.id}
                onClick={() => selectBodyRegion(region.id)}
                className="cursor-pointer group transition-all"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    selectBodyRegion(region.id);
                  }
                }}
                aria-label={`Select ${region.name}`}
              >
                {/* Region Touch Target */}
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  rx={region.rx ?? 8}
                  fill={getRegionFill(region.id)}
                  stroke={getRegionStroke(region.id)}
                  strokeWidth={isSelected ? 2.5 : 1.2}
                  className="transition-all duration-200 group-hover:brightness-125 group-active:scale-95"
                />

                {/* Pulse Ring if Selected */}
                {isSelected && (
                  <rect
                    x={region.x - 3}
                    y={region.y - 3}
                    width={region.width + 6}
                    height={region.height + 6}
                    rx={(region.rx ?? 8) + 2}
                    fill="none"
                    stroke={getRegionStroke(region.id)}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    className="animate-spin"
                  />
                )}

                {/* Label text */}
                <text
                  x={region.x + region.width / 2}
                  y={region.y + region.height / 2 + 3}
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : '#94a3b8'}
                  fontSize="7.5"
                  fontWeight="bold"
                  className="pointer-events-none select-none font-mono"
                >
                  {region.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Quick Region Selector Chips below body map */}
      <div className="flex flex-wrap gap-1 mt-2.5">
        {BODY_REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            data-testid={`body-region-${r.id.toLowerCase()}`}
            onClick={() => selectBodyRegion(r.id)}
            className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-all ${
              selectedBodyRegion === r.id
                ? 'bg-cyan-400 text-slate-950 font-extrabold shadow-sm scale-105'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>
    </div>
  );
};
