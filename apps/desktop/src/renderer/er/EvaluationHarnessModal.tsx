import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart2,
  FileText,
  Camera,
  Award,
} from 'lucide-react';
import { useErKioskStore } from './erKioskStore';

export interface TriageScenarioDef {
  id: string;
  title: string;
  category: string;
  expectedTriageLevel: number;
  scriptedPatientGlosses: string[];
  patientGoalDescription: string;
  nurseTargetAction: string;
}

const SCRIPTED_SCENARIOS: TriageScenarioDef[] = [
  {
    id: 'ACS_CHEST_PAIN',
    title: 'Acute Chest Pain (Rule out ACS)',
    category: 'Cardiovascular (Emergent)',
    expectedTriageLevel: 2,
    scriptedPatientGlosses: ['PAIN', 'CHEST', 'MORNING'],
    patientGoalDescription: 'Sign acute chest pain starting this morning (ESI-2)',
    nurseTargetAction: 'Dispatch wheelchair + Order STAT ECG & heart monitor',
  },
  {
    id: 'ASTHMA_INHALER_MISSING',
    title: 'Asthma Flare without Rescue Inhaler',
    category: 'Respiratory (Emergent)',
    expectedTriageLevel: 2,
    scriptedPatientGlosses: ['BREATHE-DIFFICULT', 'SHARP', 'INHALER-MISSING'],
    patientGoalDescription: 'Communicate severe dyspnea with missing inhaler',
    nurseTargetAction: 'Send to Triage Room 1 + Prepare nebulizer & O2',
  },
  {
    id: 'PENICILLIN_ANAPHYLAXIS',
    title: 'Critical Penicillin Allergy Alert',
    category: 'Clinical Safety Alert',
    expectedTriageLevel: 2,
    scriptedPatientGlosses: ['ALLERGY-PENICILLIN'],
    patientGoalDescription: 'Alert staff to severe penicillin allergy before antibiotic administration',
    nurseTargetAction: 'Attach red allergy band & log EMR contraindication',
  },
  {
    id: 'ACUTE_ABDOMEN_VOMIT',
    title: 'Acute Abdomen with Repeated Vomiting',
    category: 'Gastrointestinal (Urgent)',
    expectedTriageLevel: 3,
    scriptedPatientGlosses: ['ABDOMEN', 'PAIN', 'VOMIT'],
    patientGoalDescription: 'Indicate abdominal pain and emesis (ESI-3)',
    nurseTargetAction: 'Order blood draw + Enforce NPO (no food or water)',
  },
  {
    id: 'FALL_LEG_FRACTURE',
    title: 'Ground-Level Fall with Swollen Leg',
    category: 'Orthopedic (Urgent)',
    expectedTriageLevel: 3,
    scriptedPatientGlosses: ['LEG', 'SWELLING', 'PAIN'],
    patientGoalDescription: 'Communicate fall injury and severe leg swelling',
    nurseTargetAction: 'Order wheelchair transport + X-Ray scan',
  },
];

interface EvaluationHarnessModalProps {
  onOpenSUSModal?: () => void;
}

export const EvaluationHarnessModal: React.FC<EvaluationHarnessModalProps> = ({ onOpenSUSModal }) => {
  const {
    evaluationHarnessOpen,
    setEvaluationHarnessOpen,
    isBenchmarkActive,
    benchmarkScenario,
    benchmarkMethod,
    startBenchmark,
    finishBenchmark,
    clarificationLoopCount,
    benchmarkLogs,
    clearBenchmarkLogs,
    addSignToSequence,
    submitNurseSpeech,
  } = useErKioskStore();

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCRIPTED_SCENARIOS[0].id);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const selectedScenario =
    SCRIPTED_SCENARIOS.find((s) => s.id === selectedScenarioId) ?? SCRIPTED_SCENARIOS[0];

  // Active stopwatch timer
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isBenchmarkActive) {
      const startTime = performance.now();
      intervalId = setInterval(() => {
        setElapsedSec(Math.round(((performance.now() - startTime) / 1000) * 10) / 10);
      }, 100);
    } else {
      setElapsedSec(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isBenchmarkActive]);

  if (!evaluationHarnessOpen) return null;

  // Auto-simulate scripted patient signs during benchmark
  const handleAutoRunScriptedSigns = () => {
    for (const gloss of selectedScenario.scriptedPatientGlosses) {
      addSignToSequence(gloss, 0.95);
    }
  };

  // Auto-simulate nurse target action
  const handleAutoRunNurseResponse = () => {
    submitNurseSpeech(selectedScenario.nurseTargetAction);
  };

  // Compute comparative summary statistics
  const multimodalLogs = benchmarkLogs.filter((l) => l.method === 'multimodal');
  const textpadLogs = benchmarkLogs.filter((l) => l.method === 'textpad');

  const avgMultimodalTct =
    multimodalLogs.length > 0
      ? Math.round(
          (multimodalLogs.reduce((acc, l) => acc + l.completionTimeSec, 0) /
            multimodalLogs.length) *
            10
        ) / 10
      : 0;

  const avgTextpadTct =
    textpadLogs.length > 0
      ? Math.round(
          (textpadLogs.reduce((acc, l) => acc + l.completionTimeSec, 0) / textpadLogs.length) * 10
        ) / 10
      : 0;

  const speedupFactor =
    avgMultimodalTct > 0 && avgTextpadTct > 0
      ? Math.round((avgTextpadTct / avgMultimodalTct) * 10) / 10
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="flex flex-col h-[90vh] w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Gestura-ER &bull; A/B Clinical Evaluation Harness
              </h2>
              <p className="text-xs text-slate-400">
                Comparative benchmark: Gestura-ER Multimodal (Sign+Speech+Cards) vs. Baseline Textpad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEvaluationHarnessOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col p-6 gap-5 overflow-y-auto">
          {/* Active Benchmark Running HUD */}
          {isBenchmarkActive && (
            <div className="p-4 rounded-xl bg-cyan-950/80 border-2 border-cyan-500 flex items-center justify-between shadow-xl animate-in zoom-in-95">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-mono font-bold animate-pulse">
                  {elapsedSec}s
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                      Scenario Running:
                    </span>
                    <span className="text-sm font-extrabold text-white">{benchmarkScenario}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                    <span>
                      Method:{' '}
                      <strong className="text-cyan-400 uppercase font-mono">{benchmarkMethod}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      Clarification Loops:{' '}
                      <strong className="text-amber-400 font-mono">{clarificationLoopCount}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Running Benchmark */}
              <div className="flex items-center gap-2">
                {benchmarkMethod === 'multimodal' && (
                  <>
                    <button
                      type="button"
                      onClick={handleAutoRunScriptedSigns}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 shadow-sm"
                    >
                      Auto-Emit Patient Signs
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoRunNurseResponse}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold border border-slate-700 shadow-sm"
                    >
                      Auto-Send Nurse Card
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => finishBenchmark(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Complete (Pass)</span>
                </button>

                <button
                  type="button"
                  onClick={() => finishBenchmark(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Fail</span>
                </button>
              </div>
            </div>
          )}

          {/* Scenario Selection Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Scripted Clinical Scenario for Evaluation:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SCRIPTED_SCENARIOS.map((scenario) => {
                const isSelected = selectedScenarioId === scenario.id;
                return (
                  <div
                    key={scenario.id}
                    onClick={() => !isBenchmarkActive && setSelectedScenarioId(scenario.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md ring-1 ring-cyan-400'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                    } ${isBenchmarkActive ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">
                        {scenario.category}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        ESI-{scenario.expectedTriageLevel}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-white mb-1">{scenario.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      Goal: {scenario.patientGoalDescription}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>Signs: [{scenario.scriptedPatientGlosses.join(', ')}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Benchmark Launch Controls */}
          {!isBenchmarkActive && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">
                  Launch Comparative Test for &ldquo;{selectedScenario.title}&rdquo;
                </span>
                <span className="text-xs text-slate-400">
                  Timer will start immediately. Measure Task Completion Time and error rate.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => startBenchmark(selectedScenario.title, 'multimodal')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-600/30 transition-all active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  <span>Start Gestura-ER Multimodal</span>
                </button>

                <button
                  type="button"
                  onClick={() => startBenchmark(selectedScenario.title, 'textpad')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-600/30 transition-all active:scale-95"
                >
                  <FileText className="h-4 w-4" />
                  <span>Start Baseline Textpad</span>
                </button>
              </div>
            </div>
          )}

          {/* Comparative Metrics Dashboard */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Benchmark Run Results &amp; Comparative Summary
                </h3>
              </div>
              {benchmarkLogs.length > 0 && (
                <button
                  type="button"
                  onClick={clearBenchmarkLogs}
                  className="text-[11px] font-mono text-slate-400 hover:text-red-400"
                >
                  Clear Logs
                </button>
              )}
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Gestura-ER Multimodal Mean TCT
                </span>
                <span className="text-lg font-extrabold text-cyan-400">
                  {avgMultimodalTct > 0 ? `${avgMultimodalTct}s` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ({multimodalLogs.length} runs recorded)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Baseline Textpad Mean TCT
                </span>
                <span className="text-lg font-extrabold text-amber-400">
                  {avgTextpadTct > 0 ? `${avgTextpadTct}s` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  ({textpadLogs.length} runs recorded)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-0.5">
                  Comparative Throughput Advantage
                </span>
                <span className="text-lg font-extrabold text-emerald-400">
                  {speedupFactor ? `${speedupFactor}x Faster` : 'Needs both runs'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Emergency queue clearance boost
                </span>
              </div>
            </div>

            {/* Run History Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Scenario</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Completion Time</th>
                    <th className="px-3 py-2">Clarifications</th>
                    <th className="px-3 py-2">Outcome</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {benchmarkLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-slate-500 italic">
                        No benchmark runs recorded yet. Select a scenario above and click Start.
                      </td>
                    </tr>
                  ) : (
                    benchmarkLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 text-white font-semibold">{log.scenario}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              log.method === 'multimodal'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {log.method}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-white">
                          {log.completionTimeSec}s
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300">{log.clarificationLoops}</td>
                        <td className="px-3 py-2">
                          {log.accuracyPass ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" /> Pass
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Fail
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-400">{log.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUS Survey Trigger Footer */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Award className="h-4 w-4 text-indigo-400" />
              <span>Subjective Usability Assessment (System Usability Scale)</span>
            </div>
            {onOpenSUSModal && (
              <button
                type="button"
                onClick={() => {
                  setEvaluationHarnessOpen(false);
                  onOpenSUSModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Launch Standard SUS 10-Item Questionnaire
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
