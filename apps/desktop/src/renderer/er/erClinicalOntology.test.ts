import { describe, it, expect } from 'vitest';
import {
  ER_50_CONCEPTS,
  parseGlossSequenceToClinicalStatement,
  parseStaffSpeechToVisualCards,
} from './erClinicalOntology';

describe('ER Clinical Ontology & 50 Bounded Concepts', () => {
  it('contains exactly 50 core concepts spanning all 5 clinical categories', () => {
    expect(ER_50_CONCEPTS.length).toBe(50);

    const categories = new Set(ER_50_CONCEPTS.map((c) => c.category));
    expect(categories.has('anatomy')).toBe(true);
    expect(categories.has('symptom')).toBe(true);
    expect(categories.has('temporal')).toBe(true);
    expect(categories.has('alert')).toBe(true);
    expect(categories.has('need')).toBe(true);

    const anatomyCount = ER_50_CONCEPTS.filter((c) => c.category === 'anatomy').length;
    const symptomCount = ER_50_CONCEPTS.filter((c) => c.category === 'symptom').length;
    const temporalCount = ER_50_CONCEPTS.filter((c) => c.category === 'temporal').length;
    const alertCount = ER_50_CONCEPTS.filter((c) => c.category === 'alert').length;
    const needCount = ER_50_CONCEPTS.filter((c) => c.category === 'need').length;

    expect(anatomyCount).toBe(10);
    expect(symptomCount).toBe(10);
    expect(temporalCount).toBe(6);
    expect(alertCount).toBe(12);
    expect(needCount).toBe(12);
  });
});

describe('Gloss-to-Clinical-Text Engine & ESI Assessment', () => {
  it('correctly maps [PAIN, CHEST, MORNING] to ESI-2 Acute Chest Pain', () => {
    const result = parseGlossSequenceToClinicalStatement(['PAIN', 'CHEST', 'MORNING']);
    expect(result.location).toBe('CHEST');
    expect(result.esi.level).toBe(2);
    expect(result.chiefComplaint).toContain('Chest Pain');
    expect(result.narrativeSpeech).toContain('started this morning');
    expect(result.painScaleEstimated).toBeGreaterThanOrEqual(8);
  });

  it('correctly maps [BREATHE-DIFFICULT, SHARP, INHALER-MISSING] to ESI-2 Dyspnea Alert', () => {
    const result = parseGlossSequenceToClinicalStatement(['BREATHE-DIFFICULT', 'SHARP', 'INHALER-MISSING']);
    expect(result.esi.level).toBe(2);
    expect(result.narrativeSpeech).toContain('inhaler is missing');
    expect(result.chiefComplaint).toContain('Asthma');
  });

  it('correctly flags [ALLERGY-PENICILLIN] as critical safety alert', () => {
    const result = parseGlossSequenceToClinicalStatement(['ALLERGY-PENICILLIN']);
    expect(result.esi.level).toBe(2);
    expect(result.narrativeSpeech).toContain('penicillin allergy');
  });

  it('correctly maps [BREATHE-DIFFICULT, SUDDEN] to ESI-1 Resuscitation', () => {
    const result = parseGlossSequenceToClinicalStatement(['BREATHE-DIFFICULT', 'SUDDEN']);
    expect(result.esi.level).toBe(1);
    expect(result.esi.title).toContain('Resuscitation');
  });

  it('correctly maps [ABDOMEN, PAIN, VOMIT] to ESI-3 Urgent', () => {
    const result = parseGlossSequenceToClinicalStatement(['ABDOMEN', 'PAIN', 'VOMIT']);
    expect(result.esi.level).toBe(3);
    expect(result.chiefComplaint).toContain('Abdominal Pain');
  });

  it('correctly maps [SKIN, BURNING, DAYS] to ESI-4 Less Urgent', () => {
    const result = parseGlossSequenceToClinicalStatement(['SKIN', 'BURNING', 'DAYS']);
    expect(result.esi.level).toBe(4);
  });

  it('correctly maps [BACK, PAIN, CHRONIC] to ESI-5 Routine / Non-urgent', () => {
    const result = parseGlossSequenceToClinicalStatement(['BACK', 'PAIN', 'CHRONIC']);
    expect(result.esi.level).toBe(5);
  });
});

describe('Staff-to-Patient Intent Parser & Visual Action Cards', () => {
  it('parses nurse speech with wheelchair and blood test into matching visual action cards', () => {
    const speech = 'Sit in the red wheelchair; we need blood tests first, then Doctor room 2.';
    const cards = parseStaffSpeechToVisualCards(speech);

    expect(cards.length).toBeGreaterThanOrEqual(2);
    const cardIds = cards.map((c) => c.id);
    expect(cardIds).toContain('WHEELCHAIR_SEAT');
    expect(cardIds).toContain('BLOOD_SAMPLE');
    expect(cardIds).toContain('DOCTOR_ROOM_2');
  });

  it('parses NPO instruction into Do Not Eat or Drink visual card', () => {
    const speech = 'Please do not eat or drink anything before your CT scan.';
    const cards = parseStaffSpeechToVisualCards(speech);

    const cardIds = cards.map((c) => c.id);
    expect(cardIds).toContain('NO_FOOD_WATER');
    expect(cardIds).toContain('XRAY_SCAN');
  });

  it('falls back to WAIT_CHAIR card when speech is unstructured', () => {
    const speech = 'Hello good afternoon.';
    const cards = parseStaffSpeechToVisualCards(speech);
    expect(cards.length).toBe(1);
    expect(cards[0].id).toBe('WAIT_CHAIR');
  });
});
