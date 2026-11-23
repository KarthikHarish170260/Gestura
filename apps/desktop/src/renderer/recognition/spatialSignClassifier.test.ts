import { describe, it, expect } from 'vitest';
import {
  classifySignGesture,
  extractHandFeatures,
  KinematicHoldGater,
} from './spatialSignClassifier';
import { RawLandmark } from '../workers/visionWorker';

/**
 * Helper to build a mock 21-landmark hand
 */
function createMockHand(
  wrist: { x: number; y: number; z?: number },
  extendedFingers: { thumb?: boolean; index?: boolean; middle?: boolean; ring?: boolean; pinky?: boolean } = {}
): RawLandmark[] {
  const lm: RawLandmark[] = Array.from({ length: 21 }, () => ({ x: wrist.x, y: wrist.y, z: wrist.z ?? 0 }));
  lm[0] = { x: wrist.x, y: wrist.y, z: wrist.z ?? 0 };

  // Helper to place finger joints
  const setFinger = (
    baseIdx: number,
    mcpOffset: { x: number; y: number },
    tipOffset: { x: number; y: number },
    isExt = false
  ) => {
    lm[baseIdx] = { x: wrist.x + mcpOffset.x, y: wrist.y + mcpOffset.y, z: 0 };
    lm[baseIdx + 1] = { x: wrist.x + mcpOffset.x * 1.3, y: wrist.y + mcpOffset.y * 1.3, z: 0 };
    lm[baseIdx + 2] = { x: wrist.x + mcpOffset.x * 1.6, y: wrist.y + mcpOffset.y * 1.6, z: 0 };

    if (isExt) {
      lm[baseIdx + 3] = { x: wrist.x + tipOffset.x, y: wrist.y + tipOffset.y, z: 0 };
    } else {
      // Curled in toward palm
      lm[baseIdx + 3] = { x: wrist.x + mcpOffset.x * 0.8, y: wrist.y + mcpOffset.y * 0.8, z: 0 };
    }
  };

  setFinger(1, { x: 0.05, y: -0.05 }, { x: 0.12, y: -0.10 }, extendedFingers.thumb ?? false);
  setFinger(5, { x: 0.03, y: -0.10 }, { x: 0.05, y: -0.25 }, extendedFingers.index ?? false);
  setFinger(9, { x: 0.00, y: -0.11 }, { x: 0.00, y: -0.27 }, extendedFingers.middle ?? false);
  setFinger(13, { x: -0.03, y: -0.10 }, { x: -0.04, y: -0.25 }, extendedFingers.ring ?? false);
  setFinger(17, { x: -0.06, y: -0.08 }, { x: -0.08, y: -0.22 }, extendedFingers.pinky ?? false);

  return lm;
}

/**
 * Standard upper body mock pose
 */
function createMockPose(): RawLandmark[] {
  const pose: RawLandmark[] = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  pose[0] = { x: 0.5, y: 0.22, z: 0 }; // Nose
  pose[9] = { x: 0.48, y: 0.28, z: 0 }; // Left mouth
  pose[10] = { x: 0.52, y: 0.28, z: 0 }; // Right mouth
  pose[11] = { x: 0.35, y: 0.42, z: 0 }; // Left shoulder
  pose[12] = { x: 0.65, y: 0.42, z: 0 }; // Right shoulder
  return pose;
}

describe('Spatial Sign Classifier', () => {
  it('extracts hand features accurately for flat open palm', () => {
    const hand = createMockHand({ x: 0.5, y: 0.5 }, {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });
    const feat = extractHandFeatures(hand);
    expect(feat).not.toBeNull();
    expect(feat?.openCount).toBe(5);
    expect(feat?.isFlatPalm).toBe(true);
  });

  it('classifies HELLO when flat open palm is at temple/head height', () => {
    const pose = createMockPose();
    // Hand placed at x=0.72, y=0.25 (above shoulder line 0.42, to the side of head)
    const rightHand = createMockHand({ x: 0.72, y: 0.25 }, {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('HELLO');
    expect(result.confidence).toBeGreaterThanOrEqual(0.90);
    expect(result.isResting).toBe(false);
  });

  it('classifies PLEASE when flat open palm is on center chest', () => {
    const pose = createMockPose();
    // Hand placed at x=0.50, y=0.52 (center chest zone)
    const rightHand = createMockHand({ x: 0.50, y: 0.52 }, {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('PLEASE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('classifies THANK-YOU when flat hand is at chin/mouth zone', () => {
    const pose = createMockPose();
    // Hand placed at x=0.50, y=0.30 (mouth is 0.28)
    const rightHand = createMockHand({ x: 0.50, y: 0.30 }, {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('THANK-YOU');
    expect(result.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('classifies SORRY when closed fist is on center chest', () => {
    const pose = createMockPose();
    const rightHand = createMockHand({ x: 0.50, y: 0.50 }, {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('SORRY');
  });

  it('classifies WATER when W-shape hand is near mouth', () => {
    const pose = createMockPose();
    const rightHand = createMockHand({ x: 0.52, y: 0.30 }, {
      thumb: false,
      index: true,
      middle: true,
      ring: true,
      pinky: false,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('WATER');
  });

  it('classifies HELP when one hand is flat and the other is a fist together', () => {
    const pose = createMockPose();
    const leftHand = createMockHand({ x: 0.48, y: 0.50 }, {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });
    const rightHand = createMockHand({ x: 0.50, y: 0.48 }, {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false,
    });

    const result = classifySignGesture(leftHand, rightHand, pose, false);
    expect(result.candidateGloss).toBe('HELP');
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('classifies I when index finger points at center chest', () => {
    const pose = createMockPose();
    const rightHand = createMockHand({ x: 0.50, y: 0.52 }, {
      thumb: false,
      index: true,
      middle: false,
      ring: false,
      pinky: false,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('I');
  });

  it('rejects low/resting hands as SEARCHING and isResting=true', () => {
    const pose = createMockPose();
    // Hand placed at x=0.50, y=0.88 (way down below waist/shoulders)
    const rightHand = createMockHand({ x: 0.50, y: 0.88 }, {
      thumb: true,
      index: true,
      middle: true,
      ring: true,
      pinky: true,
    });

    const result = classifySignGesture(null, rightHand, pose, false);
    expect(result.candidateGloss).toBe('SEARCHING');
    expect(result.isResting).toBe(true);
  });
});

describe('KinematicHoldGater Loop Prevention', () => {
  it('does NOT commit on rapid fluctuating candidate switches', () => {
    const gater = new KinematicHoldGater(350, 10, 0.70);

    // Alternate HELLO and GOOD every frame
    for (let f = 0; f < 30; f++) {
      const gloss = f % 2 === 0 ? 'HELLO' : 'GOOD';
      const res = gater.update(gloss, 0.95, false, f * 33);
      expect(res.shouldCommit).toBe(false);
    }
  });

  it('commits exactly ONCE after being held stably for required duration', () => {
    const gater = new KinematicHoldGater(350, 10, 0.70);

    let committedCount = 0;
    let committedWord = '';

    for (let f = 0; f < 25; f++) {
      const now = f * 40; // 40ms per frame
      const res = gater.update('HELLO', 0.95, false, now);
      if (res.shouldCommit) {
        committedCount++;
        committedWord = res.committedGloss ?? '';
      }
    }

    // Should commit exactly once at around frame 10 (400ms)
    expect(committedCount).toBe(1);
    expect(committedWord).toBe('HELLO');
  });

  it('NEVER loops or re-commits if the user continues holding the same sign', () => {
    const gater = new KinematicHoldGater(350, 10, 0.70);

    let commitCount = 0;
    // Simulate user holding HELLO for 200 frames (8 seconds)
    for (let f = 0; f < 200; f++) {
      const now = f * 40;
      const res = gater.update('HELLO', 0.95, false, now);
      if (res.shouldCommit) {
        commitCount++;
      }
    }

    // Must be strictly 1 commit, preventing the HELLO GOOD HELLO GOOD loop bug!
    expect(commitCount).toBe(1);
  });

  it('allows a new sign to commit after releasing or switching', () => {
    const gater = new KinematicHoldGater(350, 10, 0.70);

    // 1. Hold HELLO for 12 frames -> commits HELLO
    let helloCommitted = false;
    for (let f = 0; f < 12; f++) {
      const res = gater.update('HELLO', 0.95, false, f * 40);
      if (res.shouldCommit && res.committedGloss === 'HELLO') helloCommitted = true;
    }
    expect(helloCommitted).toBe(true);

    // 2. Switch to HELP and hold for 12 frames -> commits HELP
    let helpCommitted = false;
    for (let f = 12; f < 25; f++) {
      const res = gater.update('HELP', 0.96, false, f * 40);
      if (res.shouldCommit && res.committedGloss === 'HELP') helpCommitted = true;
    }
    expect(helpCommitted).toBe(true);
  });
});
