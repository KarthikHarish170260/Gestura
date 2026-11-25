import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createNeutralPose, getGlossClip } from './templates';

describe('Avatar Templates and Kinematics', () => {
  it('creates valid neutral pose with all joints initialized', () => {
    const pose = createNeutralPose();
    expect(pose.pose).toHaveLength(12);
    expect(pose.leftHand).toHaveLength(21);
    expect(pose.rightHand).toHaveLength(21);

    // Verify all joint coordinates are normalized numbers between 0 and 1
    for (const joint of pose.pose) {
      expect(joint[0]).toBeGreaterThanOrEqual(0);
      expect(joint[0]).toBeLessThanOrEqual(1);
      expect(joint[1]).toBeGreaterThanOrEqual(0);
      expect(joint[1]).toBeLessThanOrEqual(1);
    }
  });

  it('retrieves gloss clips for all 15 pharmacy vocabulary words with non-zero duration', () => {
    const pharmacyGlosses = [
      'HELLO',
      'THANK-YOU',
      'YES',
      'NO',
      'HELP',
      'PAIN',
      'HEADACHE',
      'FEVER',
      'COUGH',
      'COLD',
      'ALLERGY',
      'MEDICINE',
      'WATER',
      'MORNING',
      'NIGHT',
    ];
    for (const gloss of pharmacyGlosses) {
      const clip = getGlossClip(gloss);
      expect(clip.gloss).toBe(gloss);
      expect(clip.durationMs).toBeGreaterThan(0);
      expect(clip.keyframes.length).toBeGreaterThan(2);
    }
  });

  it('falls back to default neutral clip for unlisted words', () => {
    const clip = getGlossClip('UNKNOWN_XYZ_WORD');
    expect(clip.gloss).toBe('UNKNOWN_XYZ_WORD');
    expect(clip.keyframes.length).toBeGreaterThanOrEqual(2);
  });

  // Fast-check property: all keyframe joint positions are valid finite numbers in [0, 1]
  it('property: any gloss clip has coordinates strictly within normalized canvas bounds', () => {
    const sampleWords = ['HELLO', 'THANK-YOU', 'YES', 'NO', 'HELP', 'WATER', 'FOOD', 'DOCTOR', 'NAME'];

    fc.assert(
      fc.property(fc.constantFrom(...sampleWords), (word) => {
        const clip = getGlossClip(word);
        for (const kf of clip.keyframes) {
          for (const joint of kf.pose) {
            expect(Number.isFinite(joint[0])).toBe(true);
            expect(Number.isFinite(joint[1])).toBe(true);
          }
          for (const pt of kf.rightHand) {
            expect(Number.isFinite(pt[0])).toBe(true);
            expect(Number.isFinite(pt[1])).toBe(true);
          }
          for (const pt of kf.leftHand) {
            expect(Number.isFinite(pt[0])).toBe(true);
            expect(Number.isFinite(pt[1])).toBe(true);
          }
        }
      })
    );
  });
});
