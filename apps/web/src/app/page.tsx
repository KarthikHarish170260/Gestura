'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  HeartPulse,
  Tablet,
  LayoutDashboard,
  QrCode,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Zap,
  Users,
  Radio,
  FileText,
  BarChart2,
} from 'lucide-react';
import { telemetryBridge } from '../lib/telemetryChannel';
import { EvaluationModal } from '../components/EvaluationModal';

export default function WardPortalPage() {
  const [bed12Occupied, setBed12Occupied] = useState<boolean>(false);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState<boolean>(false);

  useEffect(() => {
    const ward = telemetryBridge.getWardState();
    const b12 = ward.beds.find((b) => b.bedId === 'BED-12');
    setBed12Occupied(!!(b12 && b12.occupied));

    const unsubscribe = telemetryBridge.subscribe(() => {
      const updated = telemetryBridge.getWardState();
      const b12Updated = updated.beds.find((b) => b.bedId === 'BED-12');
      setBed12Occupied(!!(b12Updated && b12Updated.occupied));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Clinical Navigation Bar */}
      <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-white tracking-tight">GESTURA</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                CLINICAL TELE-BRIDGE
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Ward 4B: Trauma &amp; Acute Observation Telemetry</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEvaluationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <BarChart2 className="h-4 w-4 text-sky-400" />
            <span>A/B Telemetry Audit</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero-Latency BroadcastChannel Active</span>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Enterprise Healthcare Telemetry Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Hospital Ward Tele-Bridge for Deaf &amp; Sign-First Inpatients
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            Eliminates communication delays in acute inpatient care. Seamlessly binds patient wristbands to bedside assistive tablets and streams real-time continuous ISL sign telemetry to the central nursing station.
          </p>
        </div>

        {/* Demo Simulation Launcher Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Launch Card 1: Bedside Tablet */}
          <div className="relative p-7 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/80 transition-all flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform">
                  <Tablet className="h-6 w-6" />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    bed12Occupied
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {bed12Occupied ? 'BED 12 OCCUPIED (RAJESH K.)' : 'WAITING FOR WRISTBAND SCAN'}
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Bedside Assistive Tablet (`/patient`)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Dedicated tablet mounted at Bed 12. Simulates hospital wristband barcode scanning, in-browser continuous sign gesture tracking (MediaPipe cyan skeletal HUD), and instant nurse action card reception with countdown timers.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">Laser Wristband Scan</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">4:3 Target Viewport</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">Tactile AAC Tray</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Link
                href="/patient"
                target="_blank"
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 group-hover:bg-sky-500"
              >
                <span>Launch Bedside Tablet (Bed 12)</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Launch Card 2: Central Nurse Console */}
          <div className="relative p-7 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/80 transition-all flex flex-col justify-between group shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="h-6 w-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  12-BED TELEMETRY WARD
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Central Nurse Station Console (`/nurse`)
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                24/7 dark-mode telemetry workstation for ward nurses. Visual grid of Beds 01 to 12. Listens to ward telemetry in real time, sounds medical pager chimes on distress, and triggers 1-click nurse dispatches.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">Web Audio Synth Chime</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">1-Click Dispatch</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800">Emergency Call Drawer</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <Link
                href="/nurse"
                target="_blank"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 group-hover:bg-emerald-500"
              >
                <span>Launch Nurse Station Console</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Demo Walkthrough Instructions Callout */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Evaluation Protocol &bull; Dual-Screen Live Demo
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Open both views side-by-side. In the Bedside Tablet tab, click <strong>&quot;Simulate Wristband Scan&quot;</strong> &mdash; watch Bed 12 on the Nurse Console instantly flip from Vacant to Occupied! Then tap an emergency sign to test immediate telemetry chime and dispatch.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEvaluationOpen(true)}
            className="shrink-0 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-400 border border-slate-700 transition-colors"
          >
            View A/B Benchmark &rarr;
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-800/80 px-6 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
        <span>Gestura Hospital Telemetry &bull; Ready for Vercel Deployment</span>
        <span>Zero External Cloud Dependencies</span>
      </footer>

      {/* Evaluation Modal */}
      <EvaluationModal isOpen={isEvaluationOpen} onClose={() => setIsEvaluationOpen(false)} />
    </div>
  );
}
