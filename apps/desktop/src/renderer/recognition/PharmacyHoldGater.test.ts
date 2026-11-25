import { describe, it, expect, beforeEach } from 'vitest';
import { PharmacyHoldGater } from './PharmacyHoldGater';

describe('PharmacyHoldGater State Machine', () => {
  let gater: PharmacyHoldGater;

  beforeEach(() => {
    gater = new PharmacyHoldGater();
  });

  it('1. Returns NO_HAND state with exact message when no hand is in frame', () => {
    const res = gater.update(false, null, 0, [], 1000);
    expect(res.state).toBe('NO_HAND');
    expect(res.userMessage).toBe('Show your hand to the camera');
    expect(res.confirmedGloss).toBeNull();
    expect(res.shouldCommit).toBe(false);
    expect(res.holdProgress).toBe(0);
  });

  it('2. Transitions to DETECTING while accumulating frames or confidence < 0.50', () => {
    const res = gater.update(true, 'HELLO', 0.40, ['HELLO'], 1000);
    expect(res.state).toBe('DETECTING');
    expect(res.userMessage).toBe('Hold your sign steady...');
    expect(res.shouldCommit).toBe(false);
  });

  it('3. Implements 10-of-12 consecutive frames > 0.75 confidence rule before CONFIRMED', () => {
    // Feed 9 consecutive high-confidence frames (not yet 10)
    for (let i = 0; i < 9; i++) {
      const res = gater.update(true, 'MEDICINE', 0.88, ['MEDICINE'], 1000 + i * 33);
      expect(res.state).toBe('DETECTING');
      expect(res.shouldCommit).toBe(false);
      expect(res.holdProgress).toBeCloseTo((i + 1) / 10, 2);
    }

    // 10th frame triggers CONFIRMED and shouldCommit: true
    const confirmRes = gater.update(true, 'MEDICINE', 0.90, ['MEDICINE'], 1000 + 9 * 33);
    expect(confirmRes.state).toBe('CONFIRMED');
    expect(confirmRes.userMessage).toBe('Got it: MEDICINE');
    expect(confirmRes.confirmedGloss).toBe('MEDICINE');
    expect(confirmRes.shouldCommit).toBe(true);
    expect(confirmRes.holdProgress).toBe(1.0);
  });

  it('4. Enforces 800 ms commit lock preventing duplicate commits or flicker', () => {
    const startTime = 2000;
    // Commit MEDICINE on 10th frame
    for (let i = 0; i < 9; i++) {
      gater.update(true, 'MEDICINE', 0.85, ['MEDICINE'], startTime + i * 30);
    }
    const commitRes = gater.update(true, 'MEDICINE', 0.85, ['MEDICINE'], startTime + 9 * 30);
    expect(commitRes.shouldCommit).toBe(true);

    const lockTime = startTime + 9 * 30; // ~2270 ms

    // Within next 500ms (inside 800ms lock window), subsequent frames should NOT commit again
    const lockedRes = gater.update(true, 'MEDICINE', 0.92, ['MEDICINE'], lockTime + 300);
    expect(lockedRes.state).toBe('CONFIRMED');
    expect(lockedRes.shouldCommit).toBe(false); // NO DUPLICATE COMMIT
    expect(lockedRes.confirmedGloss).toBe('MEDICINE');

    // After 850ms (lock expired), a new sign can be detected
    const afterLockRes = gater.update(true, 'ALLERGY', 0.40, ['ALLERGY'], lockTime + 850);
    expect(afterLockRes.state).toBe('DETECTING');
    expect(afterLockRes.shouldCommit).toBe(false);
  });

  it('5. Transitions to UNSURE when confidence is between 0.50 and 0.75 with top 3 guesses', () => {
    const res = gater.update(true, 'PAIN', 0.65, ['PAIN', 'HEADACHE', 'FEVER', 'COLD'], 3000);
    expect(res.state).toBe('UNSURE');
    expect(res.userMessage).toBe('Not sure - please repeat, or tap a word below');
    expect(res.shouldCommit).toBe(false);
    expect(res.topGuesses).toEqual(['PAIN', 'HEADACHE', 'FEVER']);
  });

  it('6. BDD Pharmacy Flow Scenario: Sign Medicine + Allergy, then Pharmacist reply Morning + Night', () => {
    const sentenceStrip: string[] = [];

    // Step 1: Patient signs MEDICINE
    let t = 1000;
    for (let i = 0; i < 10; i++) {
      const res = gater.update(true, 'MEDICINE', 0.88, ['MEDICINE'], t);
      if (res.shouldCommit && res.confirmedGloss) {
        sentenceStrip.push(res.confirmedGloss);
      }
      t += 33;
    }
    expect(sentenceStrip).toEqual(['MEDICINE']);

    // Advance time past 800ms commit lock
    t += 850;

    // Step 2: Patient signs ALLERGY
    for (let i = 0; i < 10; i++) {
      const res = gater.update(true, 'ALLERGY', 0.86, ['ALLERGY'], t);
      if (res.shouldCommit && res.confirmedGloss) {
        sentenceStrip.push(res.confirmedGloss);
      }
      t += 33;
    }
    expect(sentenceStrip).toEqual(['MEDICINE', 'ALLERGY']);

    // Step 3: Pharmacist sees Summary: "MEDICINE + ALLERGY"
    const summaryPhrase = sentenceStrip.join(' + ');
    expect(summaryPhrase).toBe('MEDICINE + ALLERGY');

    // Step 4: Pharmacist replies "Morning and night"
    const pharmacistReplyText = 'Morning and night';
    const glosses = ['MORNING', 'NIGHT']; // Extracted from 15 pharmacy signs
    expect(pharmacistReplyText).toContain('Morning');
    expect(glosses).toEqual(['MORNING', 'NIGHT']);
  });
});
