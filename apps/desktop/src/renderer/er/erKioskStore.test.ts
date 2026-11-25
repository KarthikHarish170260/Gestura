import { describe, it, expect, beforeEach } from 'vitest';
import { useErKioskStore } from './erKioskStore';

describe('Gestura-ER Kiosk Store & State Machine', () => {
  beforeEach(() => {
    useErKioskStore.getState().resetPatientIntake();
    useErKioskStore.getState().clearBenchmarkLogs();
  });

  it('initializes with default multimodal mode and empty intake', () => {
    const state = useErKioskStore.getState();
    expect(state.mode).toBe('multimodal');
    expect(state.signSequence.length).toBe(0);
    expect(state.currentStatement).toBeNull();
    expect(state.isAacAutoExpanded).toBe(false);
  });

  it('gating: high confidence (>= 0.75) commits sign and creates EMR triage statement', () => {
    const store = useErKioskStore.getState();
    store.addSignToSequence('CHEST', 0.95);
    store.addSignToSequence('PAIN', 0.92);
    store.addSignToSequence('MORNING', 0.90);

    const updated = useErKioskStore.getState();
    expect(updated.signSequence).toEqual(['CHEST', 'PAIN', 'MORNING']);
    expect(updated.currentStatement).not.toBeNull();
    expect(updated.currentStatement?.location).toBe('CHEST');
    expect(updated.currentStatement?.esi.level).toBe(2);
    expect(updated.isEmrLogged).toBe(true);
    expect(updated.clarificationPrompt).toBeNull();
  });

  it('gating: moderate confidence (0.45 - 0.74) triggers clarification prompt without committing', () => {
    const store = useErKioskStore.getState();
    store.addSignToSequence('CHEST', 0.60);

    const updated = useErKioskStore.getState();
    expect(updated.signSequence.length).toBe(0); // Not committed yet
    expect(updated.clarificationPrompt).toContain('Did you mean');
    expect(updated.clarificationOptions).not.toBeNull();
  });

  it('resolving clarification prompt commits the confirmed sign', () => {
    const store = useErKioskStore.getState();
    store.addSignToSequence('CHEST', 0.60);
    store.confirmClarification('CHEST');

    const updated = useErKioskStore.getState();
    expect(updated.signSequence).toEqual(['CHEST']);
    expect(updated.clarificationPrompt).toBeNull();
  });

  it('gating: low confidence (< 0.45) twice consecutively auto-expands AAC Fallback Tray', () => {
    const store = useErKioskStore.getState();
    expect(store.isAacAutoExpanded).toBe(false);

    store.addSignToSequence('UNKNOWN_SIGN', 0.30);
    expect(useErKioskStore.getState().isAacAutoExpanded).toBe(false);

    store.addSignToSequence('UNKNOWN_SIGN', 0.35);
    expect(useErKioskStore.getState().isAacAutoExpanded).toBe(true);
  });

  it('one-tap AAC body map selection updates EMR triage statement', () => {
    const store = useErKioskStore.getState();
    store.selectBodyRegion('HEAD');
    store.setPainScale(8);

    const updated = useErKioskStore.getState();
    expect(updated.selectedBodyRegion).toBe('HEAD');
    expect(updated.currentStatement?.location).toBe('HEAD');
    expect(updated.currentStatement?.painScaleEstimated).toBe(8);
  });

  it('staff speech input generates active visual action cards for patient view', () => {
    const store = useErKioskStore.getState();
    store.submitNurseSpeech('Sit in the wheelchair, blood test required');

    const updated = useErKioskStore.getState();
    expect(updated.activeVisualActionCards.length).toBe(2);
    const cardIds = updated.activeVisualActionCards.map((c) => c.id);
    expect(cardIds).toContain('WHEELCHAIR_SEAT');
    expect(cardIds).toContain('BLOOD_SAMPLE');
  });

  it('evaluation harness records benchmark metrics for comparative study', () => {
    const store = useErKioskStore.getState();
    store.startBenchmark('Acute Chest Pain', 'multimodal');

    const runningState = useErKioskStore.getState();
    expect(runningState.isBenchmarkActive).toBe(true);
    expect(runningState.benchmarkScenario).toBe('Acute Chest Pain');

    store.recordClarificationLoop();
    const entry = store.finishBenchmark(true);

    expect(entry).not.toBeNull();
    expect(entry?.scenario).toBe('Acute Chest Pain');
    expect(entry?.clarificationLoops).toBe(1);
    expect(entry?.accuracyPass).toBe(true);
    expect(useErKioskStore.getState().benchmarkLogs.length).toBe(1);
  });
});
