'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Wifi,
  ShieldAlert,
  Droplets,
  HelpCircle,
  Zap,
  Activity,
  HeartPulse,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  FileText,
  Video,
  LogOut,
  User,
  Sparkles,
  Flame,
  Radio,
  Send,
  Bed,
  Bell,
  Hand,
  Mic,
  Play,
  Languages,
} from 'lucide-react';
import { BedsideVisionTracker } from '../../components/BedsideVisionTracker';
import { AvatarCanvas } from '../../avatar/AvatarCanvas';
import {
  telemetryBridge,
  DEFAULT_PATIENT_RAJESH,
} from '../../lib/telemetryChannel';
import { clinicalAudio } from '../../lib/audioAlerts';
import { PatientProfile, TelemetryAlert, VisualActionResponse } from '../../types/telemetry';

const PAIN_SCALE_FACES = [
  { val: 2, emoji: '😃', label: '1-2 Mild', color: 'hover:border-emerald-500 hover:bg-emerald-950/40 text-emerald-300' },
  { val: 4, emoji: '🙂', label: '3-4 Moderate', color: 'hover:border-lime-500 hover:bg-lime-950/40 text-lime-300' },
  { val: 6, emoji: '😐', label: '5-6 Severe', color: 'hover:border-amber-500 hover:bg-amber-950/40 text-amber-300' },
  { val: 8, emoji: '😣', label: '7-8 Intense', color: 'hover:border-orange-500 hover:bg-orange-950/40 text-orange-300' },
  { val: 10, emoji: '😭', label: '9-10 Worst', color: 'hover:border-red-500 hover:bg-red-950/40 text-red-300' },
];

const PRESET_STAFF_PHRASES = [
  { text: 'Nurse is coming to your bed', glosses: ['NURSE', 'COME', 'HELP'] },
  { text: 'Please drink water', glosses: ['PLEASE', 'WATER', 'DRINK'] },
  { text: 'Doctor will see you now', glosses: ['DOCTOR', 'MEET', 'NOW'] },
  { text: 'Please stay in bed', glosses: ['PLEASE', 'BED', 'WAIT'] },
  { text: 'Taking blood test first', glosses: ['HELP', 'MEDICINE', 'NOW'] },
];

export default function PatientBedsidePage() {
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [mode, setMode] = useState<'multimodal' | 'textpad'>('multimodal');

  // Active Alert & Staff Response States
  const [activeAlert, setActiveAlert] = useState<TelemetryAlert | null>(null);
  const [activeResponse, setActiveResponse] = useState<VisualActionResponse | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [textpadContent, setTextpadContent] = useState<string>('');
  const [quickConfirmation, setQuickConfirmation] = useState<string | null>(null);

  // Avatar Signer States (Speech / Text -> Sign Language)
  const [staffInputText, setStaffInputText] = useState<string>('');
  const [avatarGlossSequence, setAvatarGlossSequence] = useState<string[]>(['HELLO']);

  // Synchronize with telemetry bridge
  useEffect(() => {
    const wardState = telemetryBridge.getWardState();
    const bed12 = wardState.beds.find((b) => b.bedId === 'BED-12');
    if (bed12 && bed12.occupied && bed12.patient) {
      setIsAdmitted(true);
      setPatient(bed12.patient);
      if (bed12.activeAlert) {
        setActiveAlert(bed12.activeAlert);
        if (bed12.activeAlert.dispatchAction) {
          setActiveResponse(bed12.activeAlert.dispatchAction);
          setRemainingSeconds(bed12.activeAlert.dispatchAction.timerSeconds);
        }
      }
    }

    const unsubscribe = telemetryBridge.subscribe((msg) => {
      if (msg.bedId === 'BED-12') {
        if (msg.type === 'PATIENT_BIND') {
          setIsAdmitted(true);
          setPatient(msg.payload.patient);
        } else if (msg.type === 'PATIENT_UNBIND') {
          setIsAdmitted(false);
          setPatient(null);
          setActiveAlert(null);
          setActiveResponse(null);
        } else if (msg.type === 'STAFF_DISPATCH') {
          const dispatch: VisualActionResponse = msg.payload.dispatch;
          setActiveResponse(dispatch);
          setRemainingSeconds(dispatch.timerSeconds);
          clinicalAudio.playDispatchConfirmationChime();

          // Animate avatar to match staff dispatch
          if (dispatch.actionType === 'water_coming') {
            setAvatarGlossSequence(['WATER', 'PLEASE', 'WAIT']);
          } else if (dispatch.actionType === 'remain_in_bed') {
            setAvatarGlossSequence(['PLEASE', 'WAIT']);
          } else {
            setAvatarGlossSequence(['HELP', 'NURSE', 'COME']);
          }
        } else if (msg.type === 'CLEAR_ALERT') {
          setActiveAlert(null);
          setActiveResponse(null);
          setRemainingSeconds(0);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Countdown timer effect for nurse response
  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSeconds]);

  // Handle Wristband Scan Simulation
  const handleSimulateScan = () => {
    setIsScanning(true);
    clinicalAudio.playLaserScanSound();

    setTimeout(() => {
      setIsScanning(false);
      setIsAdmitted(true);
      setPatient(DEFAULT_PATIENT_RAJESH);
      telemetryBridge.bindPatientToBed('BED-12', DEFAULT_PATIENT_RAJESH);
    }, 1000);
  };

  // Discharge / Unbind Patient
  const handleDischarge = () => {
    setIsAdmitted(false);
    setPatient(null);
    setActiveAlert(null);
    setActiveResponse(null);
    telemetryBridge.unbindPatientFromBed('BED-12');
  };

  // Trigger Sign Language Translation Alert
  const handleSequenceDetected = (
    tokens: string[],
    intent: string,
    clinicalStatement: string,
    esiLevel: 1 | 2 | 3 | 4 | 5
  ) => {
    const alert: TelemetryAlert = {
      id: `sign-${Date.now()}`,
      bedId: 'BED-12',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent,
      clinicalStatement,
      sequenceTokens: tokens,
      confidence: 0.96,
      esiLevel,
      status: 'active',
      source: 'sign_camera',
    };

    setActiveAlert(alert);
    telemetryBridge.triggerAlert(alert);
    clinicalAudio.playNurseAlertChime();

    setQuickConfirmation(`Sign Translated & Sent: "${intent}"`);
    setTimeout(() => setQuickConfirmation(null), 4000);
  };

  // Convert Staff English Text into Sign Language Avatar Animation
  const handleStaffConvertToSign = (text: string, customGlosses?: string[]) => {
    if (!text.trim() && (!customGlosses || customGlosses.length === 0)) return;

    let glosses: string[] = customGlosses || [];
    if (glosses.length === 0) {
      // Simple word to gloss mapper
      const words = text.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/);
      const supported = ['HELLO', 'THANK-YOU', 'HELP', 'EMERGENCY', 'PAIN', 'WATER', 'DOCTOR', 'NURSE', 'PLEASE', 'WAIT'];
      glosses = words.filter((w) => supported.includes(w));
      if (glosses.length === 0) {
        glosses = ['PLEASE', 'HELP'];
      }
    }

    setAvatarGlossSequence(glosses);
    setStaffInputText('');
    setQuickConfirmation(`English translated into Sign Language! (${glosses.join(' ' )})`);
    setTimeout(() => setQuickConfirmation(null), 3000);
  };

  // Trigger Alert from AAC Quick-Tap Chip
  const handleAacChipTrigger = (label: string, category: 'emergency' | 'urgent' | 'assistance') => {
    const alert: TelemetryAlert = {
      id: `aac-${Date.now()}`,
      bedId: 'BED-12',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: `Assistance Requested: ${label}`,
      clinicalStatement: `Patient pressed bedside tactile emergency chip: ${label}.`,
      sequenceTokens: [label.toUpperCase()],
      confidence: 1.0,
      esiLevel: category === 'emergency' ? 1 : category === 'urgent' ? 2 : 4,
      status: 'active',
      source: 'aac_chip',
    };

    setActiveAlert(alert);
    telemetryBridge.triggerAlert(alert);
    clinicalAudio.playNurseAlertChime();

    setQuickConfirmation(`Call Transmitted: "${label}"`);
    setTimeout(() => setQuickConfirmation(null), 4000);
  };

  // Trigger Pain Level from Visual Faces
  const handlePainRating = (score: number, desc: string) => {
    handleSequenceDetected(['PAIN', `LEVEL_${score}`], `Acute Pain Level ${score}/10 (${desc})`, `Patient reported pain score ${score}/10 on visual scale. Immediate analgesia assessment needed.`, score >= 8 ? 2 : score >= 5 ? 3 : 4);
  };

  // Critical Panic Button
  const handlePanicTrigger = () => {
    const alert: TelemetryAlert = {
      id: `panic-${Date.now()}`,
      bedId: 'BED-12',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      intent: 'EMERGENCY CODE PANIC: Bedside Distress',
      clinicalStatement:
        'CRITICAL ALERT: Patient pressed 1-tap red emergency panic button. Immediate nurse triage response mandated.',
      sequenceTokens: ['EMERGENCY', 'PANIC'],
      confidence: 1.0,
      esiLevel: 1,
      status: 'active',
      source: 'panic_button',
    };

    setActiveAlert(alert);
    telemetryBridge.triggerAlert(alert);
    clinicalAudio.playNurseAlertChime();

    setQuickConfirmation('CRITICAL: Emergency Alert Dispatched to Central Nurse Station!');
    setTimeout(() => setQuickConfirmation(null), 5000);
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-950 flex flex-col font-sans select-none text-slate-100 selection:bg-cyan-500 selection:text-white">
      {/* Pre-Admission State (Modal: Scan Hospital Wristband) */}
      {!isAdmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 mb-4">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>BED 12 · UNASSIGNED TERMINAL</span>
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Scan Patient Wristband
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-6 max-w-xs mx-auto">
              Scan barcode or UHID QR code to bind patient profile and activate Gestura bi-directional
              sign language bridge.
            </p>

            <div className="relative w-64 h-44 mx-auto bg-slate-950 rounded-2xl border-2 border-slate-700 overflow-hidden flex flex-col items-center justify-center mb-6 shadow-inner">
              <QrCode className="h-20 w-20 text-slate-600 opacity-60" />

              {isScanning ? (
                <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_16px_#ef4444] animate-pulse" />
              ) : (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/40" />
              )}

              <span className="absolute bottom-2 text-[10px] font-mono text-slate-400">
                {isScanning ? 'READING WRISTBAND DATA...' : 'ALIGN WRISTBAND IN FRAME'}
              </span>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-sky-900/40 transition-all flex items-center justify-center gap-2"
            >
              <QrCode className="h-4 w-4" />
              <span>
                {isScanning ? 'Scanning Wristband...' : 'Simulate Wristband Scan (Rajesh K.)'}
              </span>
            </button>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <Link href="/" className="hover:text-slate-300 underline">
                &larr; Return to Ward Portal
              </Link>
              <span className="font-mono text-slate-500">Ward 4B Intake</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Clinical Navigation Bar */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-base font-extrabold text-white tracking-tight">GESTURA</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
              SIGN LANGUAGE CONVERTER
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700">
            <span className="text-xs font-mono font-extrabold text-sky-400">BED 12</span>
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              Bi-Directional Tele-Bridge
            </span>
          </div>
        </div>

        {/* Patient Profile Chip */}
        {patient && (
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700">
            <User className="h-3.5 w-3.5 text-sky-400" />
            <div className="text-xs">
              <span className="font-bold text-white">{patient.name}</span>
              <span className="text-[11px] font-mono text-slate-400 ml-1.5">({patient.uhid})</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
              Primary ISL
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
              Penicillin Allergy
            </span>
          </div>
        )}

        {/* Right Status & Mode Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
            <Wifi className="h-3 w-3 animate-pulse" />
            <span>Nurse Station Synced</span>
          </div>

          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setMode('multimodal')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                mode === 'multimodal'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Converter
            </button>
            <button
              onClick={() => setMode('textpad')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                mode === 'textpad'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Textpad
            </button>
          </div>

          <button
            onClick={handleDischarge}
            title="Discharge patient and reset bed"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Quick Confirmation Banner */}
      <AnimatePresence>
        {quickConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-lg z-20 shrink-0"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{quickConfirmation}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Two-Column Stage */}
      <main className="flex-1 p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 overflow-hidden">
        {/* Left Column: Signer Camera (Sign -> Speech & Text Converter) (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
          {mode === 'multimodal' ? (
            <BedsideVisionTracker
              onSequenceDetected={handleSequenceDetected}
              onClearSequence={() => setActiveAlert(null)}
            />
          ) : (
            /* Baseline Textpad View */
            <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Emergency Baseline Textpad
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Direct Patient Typing Mode
                </span>
              </div>

              <textarea
                value={textpadContent}
                onChange={(e) => setTextpadContent(e.target.value)}
                placeholder="Type your emergency symptoms or request here for the nursing staff..."
                className="flex-1 mt-3 w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none font-medium"
              />

              <div className="flex items-center justify-between pt-3">
                <button
                  onClick={() => setTextpadContent('')}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Clear Notes
                </button>
                <button
                  onClick={() => {
                    if (textpadContent.trim()) {
                      handleSequenceDetected(['TEXTPAD_INPUT'], textpadContent, textpadContent, 3);
                      setTextpadContent('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send to Nurse Station</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Avatar Signer (Speech/Text -> Sign Converter & Nurse Telemetry) (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-y-auto space-y-3 pr-1">
          {/* Active Nurse Response State */}
          <AnimatePresence mode="wait">
            {activeResponse ? (
              <motion.div
                key="response"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="p-4 bg-gradient-to-b from-sky-950/80 to-slate-900 border-2 border-sky-500 rounded-2xl shadow-2xl shrink-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-600 text-white uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Staff Dispatched &bull; En Route
                  </span>
                  <span className="text-xs font-mono text-sky-400">{activeResponse.dispatchedAt}</span>
                </div>

                <div className="flex items-center gap-3 my-2">
                  <div className="w-14 h-14 rounded-2xl bg-sky-900/60 border border-sky-400 shadow-md flex items-center justify-center text-3xl shrink-0">
                    {activeResponse.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-tight">
                      {activeResponse.title}
                    </h3>
                    <p className="text-xs text-sky-200/90 font-medium">
                      {activeResponse.subtitle}
                    </p>
                  </div>
                </div>

                {/* Countdown Timer Display */}
                <div className="p-3 rounded-xl bg-slate-950 border border-sky-800 shadow-inner flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-400" />
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Estimated Arrival
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {activeResponse.staffName}
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl font-black font-mono text-cyan-400 tabular-nums">
                    {formatTimer(remainingSeconds)}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* 1. AVATAR SIGNER (SPEECH / TEXT -> SIGN LANGUAGE CONVERTER) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Avatar Signer (Speech &rarr; Sign Language)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                60 FPS ANIMATION
              </span>
            </div>

            {/* Avatar Canvas Player */}
            <div className="h-48 w-full bg-black rounded-xl border border-slate-800 overflow-hidden mb-3">
              <AvatarCanvas glossSequence={avatarGlossSequence} />
            </div>

            {/* Staff English Input to Convert to Sign */}
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="text"
                value={staffInputText}
                onChange={(e) => setStaffInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStaffConvertToSign(staffInputText);
                }}
                placeholder="Type or speak English to animate avatar sign..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                type="button"
                onClick={() => handleStaffConvertToSign(staffInputText)}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
              >
                <span>Convert</span>
              </button>
            </div>

            {/* Preset Staff Instructions to Sign */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
              {PRESET_STAFF_PHRASES.map((phrase, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleStaffConvertToSign(phrase.text, phrase.glosses)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-indigo-950 hover:border-indigo-500 border border-slate-800 text-[11px] font-mono text-indigo-300 transition-all whitespace-nowrap active:scale-95"
                >
                  &ldquo;{phrase.text}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* 2. TACTILE EMERGENCY AAC NEED CHIPS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                Emergency AAC Quick-Tap Chips
              </span>
              <span className="text-[10px] text-slate-500 font-mono">1-Tap Backup</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAacChipTrigger('Drinking Water', 'assistance')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-sky-950 hover:border-sky-500 border border-slate-800 text-xs font-bold text-sky-300 transition-all active:scale-95"
              >
                <Droplets className="h-4 w-4 text-sky-400" />
                <span>💧 Water Request</span>
              </button>

              <button
                onClick={() => handleAacChipTrigger('Restroom Assistance', 'urgent')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-amber-950 hover:border-amber-500 border border-slate-800 text-xs font-bold text-amber-300 transition-all active:scale-95"
              >
                <span>🚽 Restroom Help</span>
              </button>

              <button
                onClick={() => handleAacChipTrigger('Acute Pain Relief', 'emergency')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950 hover:border-rose-500 border border-slate-800 text-xs font-bold text-rose-300 transition-all active:scale-95"
              >
                <Zap className="h-4 w-4 text-rose-400" />
                <span>⚡ Severe Pain</span>
              </button>

              <button
                onClick={() => handleAacChipTrigger('Bleeding / IV Line Check', 'emergency')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-red-950 hover:border-red-500 border border-slate-800 text-xs font-bold text-red-300 transition-all active:scale-95"
              >
                <span>🩸 IV / Bleeding</span>
              </button>

              <button
                onClick={() => handleAacChipTrigger('Nausea / Vomiting', 'urgent')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950 hover:border-emerald-500 border border-slate-800 text-xs font-bold text-emerald-300 transition-all active:scale-95"
              >
                <span>🤢 Nausea / Vomiting</span>
              </button>

              <button
                onClick={() => handleAacChipTrigger('Blanket / Cold Chills', 'assistance')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 hover:bg-cyan-950 hover:border-cyan-500 border border-slate-800 text-xs font-bold text-cyan-300 transition-all active:scale-95"
              >
                <span>❄️ Blanket Needed</span>
              </button>
            </div>
          </div>

          {/* 3. VISUAL PAIN SCALE (Wong-Baker 1-10) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                Visual Pain Assessment (1-Tap Transmission)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Wong-Baker Scale</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {PAIN_SCALE_FACES.map((face) => (
                <button
                  key={face.val}
                  type="button"
                  onClick={() => handlePainRating(face.val, face.label)}
                  className={`p-2 rounded-xl bg-slate-950 border border-slate-800 text-center transition-all active:scale-90 ${face.color}`}
                >
                  <span className="text-xl block mb-0.5">{face.emoji}</span>
                  <span className="text-[10px] font-mono font-bold block">
                    {face.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. 1-TAP RED EMERGENCY PANIC BUTTON */}
          <button
            onClick={handlePanicTrigger}
            type="button"
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-extrabold text-sm shadow-xl shadow-red-950/60 border border-red-400 transition-all flex items-center justify-center gap-2 shrink-0 animate-pulse"
          >
            <ShieldAlert className="h-5 w-5 text-white" />
            <span>🚨 EMERGENCY CODE PANIC (1-TAP DISPATCH)</span>
          </button>
        </div>
      </main>
    </div>
  );
}
