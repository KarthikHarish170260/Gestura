import { describe, it, expect } from 'vitest';
import { normalizeLandmarks } from './visionWorker';
import { SlidingWindowRecognizer } from './recognitionWorker';

describe('Vision Worker Normalization', () => {
  it('translates landmarks so shoulder midpoint is origin and scales to shoulder width', () => {
    // Left shoulder at (-0.3, 0.4, 0.0), Right shoulder at (0.3, 0.4, 0.0) -> width = 0.6, mid = (0, 0.4, 0)
    const mockPose = Array.from({ length: 13 }, (_, i) => ({
      x: i === 11 ? -0.3 : i === 12 ? 0.3 : 0.0,
      y: 0.4,
      z: 0.0,
    }));

    const mockRightHand = Array.from({ length: 21 }, () => ({
      x: 0.3,
      y: 0.7,
      z: 0.1,
    }));

    const result = normalizeLandmarks(null, mockRightHand, mockPose, false);
    expect(result.shoulderWidth).toBeCloseTo(0.6, 2);

    // Right hand first landmark was (0.3, 0.7, 0.1).
    // After translation: x = (0.3 - 0.0) / 0.6 = 0.5. y = (0.7 - 0.4) / 0.6 = 0.5.
    const normX = result.landmarks[63];
    const normY = result.landmarks[64];
    expect(normX).toBeCloseTo(0.5, 2);
    expect(normY).toBeCloseTo(0.5, 2);
  });

  it('mirrors X coordinates when leftHanded is true', () => {
    const mockPose = Array.from({ length: 13 }, (_, i) => ({
      x: i === 11 ? -0.5 : i === 12 ? 0.5 : 0.0,
      y: 0.0,
      z: 0.0,
    }));
    const mockRightHand = Array.from({ length: 21 }, () => ({
      x: 0.25,
      y: 0.5,
      z: 0.0,
    }));

    const normal = normalizeLandmarks(null, mockRightHand, mockPose, false);
    const mirrored = normalizeLandmarks(null, mockRightHand, mockPose, true);

    expect(mirrored.landmarks[63]).toBeCloseTo(-normal.landmarks[63], 3);
  });

  it('zero-fills missing hand coordinates with 0.0', () => {
    const result = normalizeLandmarks(null, null, null);
    expect(result.landmarks.length).toBe(162);
    expect(result.landmarks.every((v) => v === 0)).toBe(true);
  });
});

describe('Recognition Worker Sliding Window', () => {
  it('correctly calculates motion energy across frames', () => {
    const recognizer = new SlidingWindowRecognizer(['HELLO', 'THANK-YOU', 'UNKNOWN']);
    const frame1 = new Array(162).fill(0.0);
    const frame2 = new Array(162).fill(0.0);

    // Move right hand landmarks by dx=0.1, dy=0.0, dz=0.0
    for (let i = 21; i < 42; i++) {
      frame2[i * 3] = 0.1;
    }

    const energy = recognizer.calculateMotionEnergy(frame1, frame2);
    expect(energy).toBeCloseTo(0.1, 3);
  });

  it('rejects static frames as UNKNOWN', () => {
    const recognizer = new SlidingWindowRecognizer(['HELLO', 'THANK-YOU', 'UNKNOWN']);
    const staticFrame = new Array(162).fill(0.1);

    let pred = null;
    for (let f = 0; f < 32; f++) {
      pred = recognizer.addFrame(staticFrame, f * 33);
    }

    // Static frames have near zero variance -> classified as UNKNOWN -> rejected (returns null)
    expect(pred).toBeNull();
  });
});
