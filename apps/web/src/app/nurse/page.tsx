'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  HeartPulse,
  Bell,
  BellOff,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Send,
  Mic,
  MicOff,
  Filter,
  BarChart2,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import { BedData, TelemetryAlert, VisualActionResponse } from '../../types/telemetry';
import { telemetryBridge } from '../../lib/telemetryChannel';
import { clinicalAudio } from '../../lib/audioAlerts';
import { EvaluationModal } from '../../components/EvaluationModal';

export default function NurseStationPage() {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [filter, setFilter] = useState<'all' | 'occupied' | 'alerts'>('all');
  const [selectedBedId, setSelectedBedId] = useState<string | null>('BED-12');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState<boolean>(false);

  // Custom text / speech input state
  const [customReply, setCustomReply] = useState<string>('');
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

  // Load ward state and subscribe to BroadcastChannel
  useEffect(() => {
    const ward = telemetryBridge.getWardState();
    setBeds(ward.beds);

    const unsubscribe = telemetryBridge.subscribe((msg) => {
      // Reload updated ward state
      const updated = telemetryBridge.getWardState();
      setBeds(updated.beds);

      if (msg.type === 'PATIENT_ALERT') {
        setSelectedBedId(msg.bedId);
        if (audioEnabled) {
          clinicalAudio.playNurseAlertChime();
        }
      }
    });

    return () => unsubscribe();
  }, [audioEnabled]);

  // Selected bed object
  const selectedBed = beds.find((b) => b.bedId === selectedBedId);
  const activeAlert = selectedBed?.activeAlert;

  // Filtered beds
  const filteredBeds = beds.filter((b) => {
    if (filter === 'occupied') return b.occupied;
    if (filter === 'alerts') return !!b.activeAlert;
    return true;
  });

  const activeAlertCount = beds.filter((b) => !!b.activeAlert).length;
  const occupiedCount = beds.filter((b) => b.occupied).length;

  // 1-Click Fast Dispatch Actions
  const handleFastDispatch = (
    actionType: 'nurse_en_route' | 'doctor_notified' | 'remain_in_bed' | 'water_coming',
    title: string,
    subtitle: string,
    timerSeconds: number,
    icon: string
  ) => {
    if (!selectedBedId) return;

    const dispatch: VisualActionResponse = {
      id: `disp-${Date.now()}`,
      actionType,
      title,
      subtitle,
      icon,
      timerSeconds,
      remainingSeconds: timerSeconds,
      signGlossTag: title.toUpperCase(),
      dispatchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      staffName: 'Staff Nurse Anjali M., RN',
    };

    telemetryBridge.dispatchStaffResponse(selectedBedId, dispatch);
    clinicalAudio.playDispatchConfirmationChime();
  };

  // Custom Reply Dispatch
  const handleCustomSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBedId || !customReply.trim()) return;

    const dispatch: VisualActionResponse = {
      id: `disp-custom-${Date.now()}`,
      actionType: 'custom',
      title: 'Nurse Message Received',
      subtitle: customReply,
      icon: '💬',
      timerSeconds: 90,
      remainingSeconds: 90,
      signGlossTag: 'MESSAGE',
      dispatchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      staffName: 'Staff Nurse Anjali M., RN',
    };

    telemetryBridge.dispatchStaffResponse(selectedBedId, dispatch);
    clinicalAudio.playDispatchConfirmationChime();
    setCustomReply('');
  };

  // Clear / Resolve Alert
  const handleClearAlert = (bedId: string) => {
    telemetryBridge.clearAlert(bedId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Clinical Header Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">GESTURA WARD CONSOLE</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Ward 4B: Trauma Telemetry
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Shift: Day Trauma Duty &bull; Charge Nurse Station 1
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Evaluation Trigger */}
        <div className="flex items-center gap-3">
          {/* Quick Bed Filter Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                filter === 'all' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Beds ({beds.length})
            </button>
            <button
              onClick={() => setFilter('occupied')}
              className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                filter === 'occupied' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Occupied ({occupiedCount})
            </button>
            <button
              onClick={() => setFilter('alerts')}
              className={`px-3 py-1 rounded-lg font-mono font-bold transition-all flex items-center gap-1.5 ${
                filter === 'alerts'
                  ? 'bg-red-950 text-red-300 border border-red-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${activeAlertCount > 0 ? 'bg-red-400 animate-ping' : 'bg-slate-600'}`} />
              <span>Alerts Active ({activeAlertCount})</span>
            </button>
          </div>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border transition-colors ${
              audioEnabled
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-white'
            }`}
            title={audioEnabled ? 'Telemetry Audio Chimes Enabled' : 'Audio Chimes Muted'}
          >
            {audioEnabled ? <Bell className="h-4 w-4 text-emerald-400" /> : <BellOff className="h-4 w-4" />}
          </button>

          {/* Discrete A/B Evaluation Benchmark Modal Button */}
          <button
            onClick={() => setIsEvaluationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all"
          >
            <BarChart2 className="h-4 w-4" />
            <span>Evaluation Benchmark</span>
          </button>

          <Link
            href="/"
            className="text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-1"
          >
            Portal &rarr;
          </Link>
        </div>
      </header>

      {/* Main Ward Workspace: Grid (Left) + Live Drawer (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: 12-Bed Overview Grid */}
        <main className="flex-1 p-5 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBeds.map((bed) => {
              const hasAlert = !!bed.activeAlert;
              const isSelected = selectedBedId === bed.bedId;

              return (
                <div
                  key={bed.bedId}
                  onClick={() => setSelectedBedId(bed.bedId)}
                  className={`relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-44 ${
                    hasAlert
                      ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/30 animate-pulse-emergency'
                      : isSelected
                      ? 'bg-slate-900 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                      : bed.occupied
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/40 opacity-70 hover:opacity-90'
                  }`}
                >
                  {/* Bed Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            hasAlert
                              ? 'bg-red-500 animate-ping'
                              : bed.occupied
                              ? 'bg-emerald-500'
                              : 'bg-slate-600'
                          }`}
                        />
                        <span className="font-mono font-black text-sm text-white">{bed.bedId}</span>
                      </div>

                      {/* Acuity Badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${
                          hasAlert
                            ? 'bg-red-500 text-white'
                            : bed.occupied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {hasAlert ? 'EMERGENCY ALERT' : bed.occupied ? 'OCCUPIED' : 'VACANT'}
                      </span>
                    </div>

                    {/* Patient Name / Pre-admission status */}
                    {bed.occupied && bed.patient ? (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                          <User className="h-3.5 w-3.5 text-sky-400" />
                          <span className="truncate">{bed.patient.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">{bed.patient.uhid}</span>
                          <span className="text-[9px] font-mono font-bold px-1 rounded bg-sky-950 text-sky-300 border border-sky-800">
                            ISL USER
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic mt-1">Bed Vacant &bull; Ready for intake</div>
                    )}
                  </div>

                  {/* Active Alert Notification Badge or Vitals */}
                  {hasAlert ? (
                    <div className="p-2 rounded-lg bg-red-900/60 border border-red-500/40 text-red-100 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                        <span className="truncate">{bed.activeAlert?.intent}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1 rounded bg-red-950 text-red-300 shrink-0">
                        {bed.activeAlert?.esiLevel === 1 ? 'ESI-1' : 'ESI-3'}
                      </span>
                    </div>
                  ) : bed.occupied ? (
                    /* Normal Vitals Ticker */
                    <div className="grid grid-cols-4 gap-1 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-center font-mono text-[10px]">
                      <div>
                        <span className="text-slate-500 block">HR</span>
                        <span className="text-slate-200 font-bold">{bed.vitals.hr}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">BP</span>
                        <span className="text-slate-200 font-bold">{bed.vitals.bp}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">SpO2</span>
                        <span className="text-emerald-400 font-bold">{bed.vitals.spo2}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Resp</span>
                        <span className="text-slate-200 font-bold">{bed.vitals.resp}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-slate-600 text-right">No telemetry active</div>
                  )}
                </div>
              );
            })}
          </div>
        </main>

        {/* Right Side: Telemetry Detail & Fast Dispatch Drawer (Fixed 420px) */}
        <aside className="w-[420px] bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between shrink-0 shadow-2xl">
          {selectedBed ? (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Drawer Bed Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black font-mono text-white">{selectedBed.bedId}</span>
                  <span className="text-xs text-slate-400">&bull; {selectedBed.roomName}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    selectedBed.occupied
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {selectedBed.occupied ? 'OCCUPIED' : 'VACANT'}
                </span>
              </div>

              {/* Patient Intake Card */}
              {selectedBed.occupied && selectedBed.patient ? (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedBed.patient.name}</h3>
                      <span className="text-xs font-mono text-slate-400">{selectedBed.patient.uhid} &bull; {selectedBed.patient.gender}/{selectedBed.patient.age}y</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-900 text-sky-200 border border-sky-700">
                      DEAF / ISL
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="text-slate-500 font-mono block text-[10px]">DIAGNOSIS:</span>
                    <span>{selectedBed.patient.diagnosis}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedBed.patient.flags.map((flag, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-amber-300 border border-slate-700">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 italic block mb-2">
                    Bed 12 currently waiting for patient wristband scan.
                  </span>
                  <span className="text-[11px] text-sky-400 font-mono">
                    Open Bedside Tablet (/patient) in another tab and click &quot;Simulate Scan&quot;!
                  </span>
                </div>
              )}

              {/* Active Incoming Alert Card */}
              {activeAlert ? (
                <div className="p-4 rounded-xl bg-red-950/60 border-2 border-red-500/80 shadow-md space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-red-200 font-bold text-xs">
                      <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
                      <span>INCOMING CALL DETECTED</span>
                    </div>
                    <span className="text-xs font-mono text-red-300">{activeAlert.timestamp}</span>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-white">{activeAlert.intent}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeAlert.clinicalStatement}</p>
                  </div>

                  {/* Recognition Metadata */}
                  <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-red-900/60 text-slate-300">
                    <span>Source: {activeAlert.source.toUpperCase()}</span>
                    <span>Confidence: {(activeAlert.confidence * 100).toFixed(1)}%</span>
                  </div>

                  {/* Action Dispatched Banner if Nurse already responded */}
                  {activeAlert.status === 'dispatched' && activeAlert.dispatchAction && (
                    <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Action Sent: {activeAlert.dispatchAction.title}</span>
                      </div>
                      <button
                        onClick={() => handleClearAlert(selectedBed.bedId)}
                        className="text-[10px] font-mono text-slate-300 hover:text-white underline ml-2"
                      >
                        Resolve Alert
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                  No active distress calls for this bed. Telemetry standing by.
                </div>
              )}

              {/* 1-Click Fast Dispatch Response Chips */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  1-Click Instant Dispatch Actions:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      handleFastDispatch(
                        'nurse_en_route',
                        'Nurse En Route — 2 Mins',
                        'Staff nurse is responding to your bedside immediately.',
                        120,
                        '🏃'
                      )
                    }
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-sky-950 border border-slate-800 hover:border-sky-500/60 text-xs font-semibold text-slate-200 transition-all active:scale-95 text-left shadow-2xs"
                  >
                    <span className="block font-bold">🏃 Nurse En Route</span>
                    <span className="text-[10px] text-slate-400 font-mono">2 min ETA</span>
                  </button>

                  <button
                    onClick={() =>
                      handleFastDispatch(
                        'doctor_notified',
                        'Doctor Notified — STAT',
                        'Attending physician paged for urgent consultation.',
                        60,
                        '👨‍⚕️'
                      )
                    }
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-500/60 text-xs font-semibold text-slate-200 transition-all active:scale-95 text-left shadow-2xs"
                  >
                    <span className="block font-bold">🚨 Doctor Notified</span>
                    <span className="text-[10px] text-slate-400 font-mono">STAT cardiac page</span>
                  </button>

                  <button
                    onClick={() =>
                      handleFastDispatch(
                        'remain_in_bed',
                        'Please Remain in Bed',
                        'Fall risk protocol: Orderly en route to assist with transfer.',
                        90,
                        '🛏️'
                      )
                    }
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-amber-950 border border-slate-800 hover:border-amber-500/60 text-xs font-semibold text-slate-200 transition-all active:scale-95 text-left shadow-2xs"
                  >
                    <span className="block font-bold">🛏️ Stay in Bed</span>
                    <span className="text-[10px] text-slate-400 font-mono">Fall risk safety</span>
                  </button>

                  <button
                    onClick={() =>
                      handleFastDispatch(
                        'water_coming',
                        'Water Carafe En Route',
                        'Ward orderly bringing fresh drinking water.',
                        180,
                        '💧'
                      )
                    }
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950 border border-slate-800 hover:border-emerald-500/60 text-xs font-semibold text-slate-200 transition-all active:scale-95 text-left shadow-2xs"
                  >
                    <span className="block font-bold">💧 Water En Route</span>
                    <span className="text-[10px] text-slate-400 font-mono">Orderly assigned</span>
                  </button>
                </div>
              </div>

              {/* Custom Speech / Text Instruction Input */}
              <form onSubmit={handleCustomSend} className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  Custom Staff Instruction:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customReply}
                    onChange={(e) => setCustomReply(e.target.value)}
                    placeholder="Type customized instruction for bedside screen..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-all"
                    title="Send customized visual card"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select a bed from the grid to view live telemetry.
            </div>
          )}

          {/* Drawer Footer Status */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Ward 4B Active Sync</span>
            <span>BroadcastChannel Active</span>
          </div>
        </aside>
      </div>

      {/* A/B Evaluation Modal */}
      <EvaluationModal isOpen={isEvaluationOpen} onClose={() => setIsEvaluationOpen(false)} />
    </div>
  );
}
