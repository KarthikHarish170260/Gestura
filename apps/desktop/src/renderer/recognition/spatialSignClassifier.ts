import { RawLandmark } from '../workers/visionWorker';

export interface HandPostureFeatures {
  openCount: number;
  isThumbExt: boolean;
  isIndexExt: boolean;
  isMiddleExt: boolean;
  isRingExt: boolean;
  isPinkyExt: boolean;
  isIndexPinch: boolean;
  isMiddlePinch: boolean;
  isFist: boolean;
  isFlatPalm: boolean;
  isVictory: boolean;
  isWHand: boolean;
  isILY: boolean;
  isShaka: boolean;
  isPointing: boolean;
  wristPos: { x: number; y: number; z: number };
  indexTipPos: { x: number; y: number; z: number };
  thumbTipPos: { x: number; y: number; z: number };
}

export interface CandidateScore {
  gloss: string;
  score: number;
}

export interface RecognitionResult {
  candidateGloss: string;
  confidence: number;
  gestureTag: string;
  topCandidates: CandidateScore[];
  isResting: boolean;
}

/**
 * Euclidean distance squared in normalized space
 */
function distSq(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return dx * dx + dy * dy + dz * dz;
}

function dist(p1: { x: number; y: number; z?: number }, p2: { x: number; y: number; z?: number }): number {
  return Math.sqrt(distSq(p1, p2));
}

/**
 * Extract posture features from 21-point hand landmarks
 */
export function extractHandFeatures(lm: RawLandmark[]): HandPostureFeatures | null {
  if (!lm || lm.length < 21) return null;

  const wrist = lm[0];
  const thumbTip = lm[4];
  const indexTip = lm[8];
  const middleTip = lm[12];
  const ringTip = lm[16];
  const pinkyTip = lm[20];

  // Extension: compare distance from wrist to tip vs wrist to PIP joint
  const isThumbExt = distSq(thumbTip, wrist) > distSq(lm[2], wrist) * 1.15;
  const isIndexExt = distSq(indexTip, wrist) > distSq(lm[6], wrist) * 1.25;
  const isMiddleExt = distSq(middleTip, wrist) > distSq(lm[10], wrist) * 1.25;
  const isRingExt = distSq(ringTip, wrist) > distSq(lm[14], wrist) * 1.25;
  const isPinkyExt = distSq(pinkyTip, wrist) > distSq(lm[18], wrist) * 1.25;

  let openCount = 0;
  if (isThumbExt) openCount++;
  if (isIndexExt) openCount++;
  if (isMiddleExt) openCount++;
  if (isRingExt) openCount++;
  if (isPinkyExt) openCount++;

  const isIndexPinch = distSq(thumbTip, indexTip) < 0.004;
  const isMiddlePinch = distSq(thumbTip, middleTip) < 0.004;
  const isFist = openCount === 0 || (openCount === 1 && isThumbExt && distSq(indexTip, lm[5]) < 0.015);
  const isWHand = isIndexExt && isMiddleExt && isRingExt && !isPinkyExt;
  const isFlatPalm = (openCount >= 5) || (openCount === 4 && isPinkyExt && !isWHand);
  const isVictory = openCount === 2 && isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt;
  const isILY = openCount === 3 && isThumbExt && isIndexExt && isPinkyExt && !isMiddleExt && !isRingExt;
  const isShaka = openCount === 2 && isThumbExt && isPinkyExt && !isIndexExt && !isMiddleExt && !isRingExt;
  const isPointing = openCount === 1 && isIndexExt;

  return {
    openCount,
    isThumbExt,
    isIndexExt,
    isMiddleExt,
    isRingExt,
    isPinkyExt,
    isIndexPinch,
    isMiddlePinch,
    isFist,
    isFlatPalm,
    isVictory,
    isWHand,
    isILY,
    isShaka,
    isPointing,
    wristPos: { x: wrist.x, y: wrist.y, z: wrist.z ?? 0 },
    indexTipPos: { x: indexTip.x, y: indexTip.y, z: indexTip.z ?? 0 },
    thumbTipPos: { x: thumbTip.x, y: thumbTip.y, z: thumbTip.z ?? 0 },
  };
}

/**
 * Classify sign gesture based on multi-feature anatomical and spatial body tracking.
 */
export function classifySignGesture(
  rawLeftHand: RawLandmark[] | null,
  rawRightHand: RawLandmark[] | null,
  rawPose: RawLandmark[] | null,
  isMirrored = true
): RecognitionResult {
  const leftFeatures = rawLeftHand ? extractHandFeatures(rawLeftHand) : null;
  const rightFeatures = rawRightHand ? extractHandFeatures(rawRightHand) : null;

  // Determine dominant/active hand (prefer hand that is raised or active)
  let dom = rightFeatures;
  let nonDom = leftFeatures;

  if (!dom && nonDom) {
    dom = nonDom;
    nonDom = null;
  } else if (dom && nonDom) {
    // If both present, the one higher up (smaller y) is considered dominant for 1-hand gestures
    if (nonDom.wristPos.y < dom.wristPos.y - 0.08) {
      dom = leftFeatures;
      nonDom = rightFeatures;
    }
  }

  // If no hands at all, return RESTING / SEARCHING
  if (!dom) {
    return {
      candidateGloss: 'SEARCHING',
      confidence: 0.1,
      gestureTag: 'NO HAND DETECTED',
      topCandidates: [
        { gloss: 'SEARCHING', score: 0.1 },
        { gloss: 'HELLO', score: 0.02 },
        { gloss: 'HELP', score: 0.01 },
      ],
      isResting: true,
    };
  }

  // Body reference anchors from pose
  let nose = { x: 0.5, y: 0.25, z: 0 };
  let mouth = { x: 0.5, y: 0.32, z: 0 };
  let leftShoulder = { x: 0.35, y: 0.45, z: 0 };
  let rightShoulder = { x: 0.65, y: 0.45, z: 0 };
  let chestCenter = { x: 0.5, y: 0.55, z: 0 };
  let shoulderDist = 0.30;

  if (rawPose && rawPose.length >= 13) {
    if (rawPose[0]) nose = rawPose[0];
    if (rawPose[9] && rawPose[10]) {
      mouth = {
        x: (rawPose[9].x + rawPose[10].x) / 2,
        y: (rawPose[9].y + rawPose[10].y) / 2,
        z: ((rawPose[9].z ?? 0) + (rawPose[10].z ?? 0)) / 2,
      };
    } else if (rawPose[0]) {
      mouth = { x: rawPose[0].x, y: rawPose[0].y + 0.07, z: rawPose[0].z ?? 0 };
    }

    if (rawPose[11] && rawPose[12]) {
      leftShoulder = rawPose[11];
      rightShoulder = rawPose[12];
      shoulderDist = Math.max(0.15, dist(leftShoulder, rightShoulder));
      chestCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2 + 0.10,
        z: ((leftShoulder.z ?? 0) + (rightShoulder.z ?? 0)) / 2,
      };
    }
  }

  // Account for mirror flip when comparing horizontal x
  const flipX = (x: number) => (isMirrored ? 1.0 - x : x);

  const domWrist = {
    x: flipX(dom.wristPos.x),
    y: dom.wristPos.y,
    z: dom.wristPos.z,
  };
  const domTip = {
    x: flipX(dom.indexTipPos.x),
    y: dom.indexTipPos.y,
    z: dom.indexTipPos.z,
  };

  const normMouth = { x: flipX(mouth.x), y: mouth.y, z: mouth.z };
  const normChest = { x: flipX(chestCenter.x), y: chestCenter.y, z: chestCenter.z };
  const normNose = { x: flipX(nose.x), y: nose.y, z: nose.z };
  const normLShoulder = { x: flipX(leftShoulder.x), y: leftShoulder.y, z: leftShoulder.z };
  const normRShoulder = { x: flipX(rightShoulder.x), y: rightShoulder.y, z: rightShoulder.z };

  const avgShoulderY = (normLShoulder.y + normRShoulder.y) / 2;

  // Spatial Zone Classification for Dominant Hand:
  // 1. Temple / Head zone: wrist above shoulder line and to lateral side of head
  const isNearTemple = domWrist.y < avgShoulderY && Math.abs(domWrist.x - normNose.x) > 0.12 * shoulderDist;

  // 2. Mouth / Chin zone: wrist is near chin/neck level (above shoulder) AND fingertips are near mouth
  const isNearMouth =
    domWrist.y < avgShoulderY + 0.04 &&
    (dist(domTip, normMouth) < 0.14 || dist(domWrist, normMouth) < 0.16);

  // 3. Forehead / Temple zone: fingertips near forehead above eyes
  const isNearForehead = domTip.y < normNose.y + 0.03 && dist(domTip, normNose) < 0.18;

  // 4. Center chest zone: wrist is between shoulders and belly, centered horizontally
  const isChestCenter =
    domWrist.y >= avgShoulderY - 0.02 &&
    domWrist.y <= avgShoulderY + 0.32 &&
    Math.abs(domWrist.x - normChest.x) < 0.22;

  // 5. Resting low zone: hand down below chest level with fingers relaxed
  const isRestingLow = domWrist.y > avgShoulderY + 0.35;

  // Two-Hand Coordination Features
  const twoHandsPresent = dom !== null && nonDom !== null;
  let handsDistance = 999.0;
  if (twoHandsPresent && nonDom) {
    const nonDomWrist = {
      x: flipX(nonDom.wristPos.x),
      y: nonDom.wristPos.y,
      z: nonDom.wristPos.z,
    };
    handsDistance = dist(domWrist, nonDomWrist);
  }

  // -------------------------------------------------------------
  // RULE-BASED ANATOMICAL & SPATIAL CLASSIFICATION
  // -------------------------------------------------------------
  const candidateMap: Record<string, number> = {};

  // 1. HELLO / GREETING:
  // Requires open flat palm near the temple/ear/head zone
  if (dom.isFlatPalm && isNearTemple && domWrist.y < avgShoulderY) {
    candidateMap['HELLO'] = 0.95;
    candidateMap['GOODBYE'] = 0.82;
  }

  // 2. GOODBYE:
  // Flat open palm waving high above shoulder
  if (dom.isFlatPalm && domWrist.y < avgShoulderY - 0.05 && Math.abs(domWrist.x - normNose.x) > 0.2) {
    candidateMap['GOODBYE'] = Math.max(candidateMap['GOODBYE'] ?? 0, 0.92);
    candidateMap['HELLO'] = Math.max(candidateMap['HELLO'] ?? 0, 0.88);
  }

  // 3. THANK-YOU:
  // Flat hand starting at lips/chin or moving forward from mouth toward chest
  if (dom.isFlatPalm && (isNearMouth || (domTip.y < avgShoulderY && domWrist.y < avgShoulderY + 0.10 && !isNearTemple))) {
    candidateMap['THANK-YOU'] = 0.95;
    candidateMap['GOOD'] = 0.85;
  }

  // 4. PLEASE:
  // Flat hand placed over center chest (palm facing inward)
  if (dom.isFlatPalm && isChestCenter && !isNearTemple && !isNearMouth) {
    candidateMap['PLEASE'] = 0.93;
    candidateMap['SAFE'] = 0.78;
  }

  // 5. SORRY:
  // S-Fist rubbing against center chest
  if (dom.isFist && isChestCenter) {
    candidateMap['SORRY'] = 0.94;
    candidateMap['FEEL'] = 0.76;
  }

  // 6. WATER:
  // W-shape (index, middle, ring extended, pinky curled) anywhere in view or near chin/mouth
  if (dom.isWHand || (dom.isIndexExt && dom.isMiddleExt && dom.isRingExt && !dom.isPinkyExt)) {
    candidateMap['WATER'] = 0.98;
    candidateMap['FOOD'] = 0.70;
  } else if (dom.openCount === 3 && isNearMouth) {
    candidateMap['WATER'] = 0.95;
  }

  // 7. FOOD / EAT:
  // Pinch / O-hand tapping mouth/lips
  if ((dom.isIndexPinch || dom.isMiddlePinch) && isNearMouth) {
    candidateMap['FOOD'] = 0.95;
    candidateMap['WATER'] = 0.72;
  }

  // 8. HELP:
  // Two hands: non-dominant flat palm, dominant fist/thumb-up resting on top
  if (twoHandsPresent && nonDom && handsDistance < 0.30) {
    if (nonDom.isFlatPalm && dom.isFist) {
      candidateMap['HELP'] = 0.98;
      candidateMap['WORK'] = 0.75;
    } else if (dom.isFist && nonDom.isFist) {
      candidateMap['WORK'] = 0.95;
      candidateMap['CAR'] = 0.80;
    } else if (nonDom.isFlatPalm && dom.isFlatPalm) {
      // STOP: dominant hand karate chop on non-dominant palm
      candidateMap['STOP'] = 0.95;
      candidateMap['FINISH'] = 0.82;
    }
  }

  // 9. TIME:
  // Dominant pointing finger tapping non-dominant wrist
  if (twoHandsPresent && nonDom && dom.isPointing && handsDistance < 0.18) {
    candidateMap['TIME'] = 0.96;
    candidateMap['DOCTOR'] = 0.82;
  }

  // 10. DOCTOR:
  // Dominant V-sign or index+middle tapping non-dominant wrist
  if (twoHandsPresent && nonDom && (dom.isVictory || dom.openCount === 2) && handsDistance < 0.18) {
    candidateMap['DOCTOR'] = 0.95;
    candidateMap['HOSPITAL'] = 0.82;
  }

  // 11. YES:
  // Thumbs up or nodding fist (not on center chest, which is SORRY)
  if (dom.openCount === 1 && dom.isThumbExt && dom.thumbTipPos.y < dom.wristPos.y) {
    if (!isRestingLow) {
      candidateMap['YES'] = 0.95;
      candidateMap['GOOD'] = 0.91;
    }
  }

  // 12. NO:
  // Thumbs down or index pointing wagging
  if (dom.openCount === 1 && dom.isThumbExt && dom.thumbTipPos.y > dom.wristPos.y + 0.04) {
    candidateMap['NO'] = 0.94;
    candidateMap['BAD'] = 0.92;
  }

  // 13. I / ME:
  // Index finger pointing directly to one's own center chest
  if (dom.isPointing && isChestCenter) {
    candidateMap['I'] = 0.95;
    candidateMap['YOU'] = 0.65;
  }

  // 14. YOU:
  // Index finger pointing outward toward camera away from chest
  if (dom.isPointing && !isChestCenter && domTip.y > avgShoulderY) {
    candidateMap['YOU'] = 0.94;
    candidateMap['WHERE'] = 0.72;
  }

  // 15. THINK / KNOW / UNDERSTAND:
  // Index finger or hand near forehead/temple
  if (dom.isPointing && isNearForehead) {
    candidateMap['THINK'] = 0.94;
    candidateMap['KNOW'] = 0.88;
    candidateMap['UNDERSTAND'] = 0.82;
  }

  // 16. SEE:
  // Victory / V-sign near eyes pointing forward
  if (dom.isVictory && domTip.y < avgShoulderY + 0.05) {
    candidateMap['SEE'] = 0.95;
    candidateMap['LOOK'] = 0.85;
  }

  // 17. LOVE:
  // Universal ILY sign (Thumb, Index, Pinky extended; Middle, Ring curled)
  if (dom.isILY) {
    candidateMap['LOVE'] = 0.98;
    candidateMap['FRIEND'] = 0.75;
  }

  // 18. CALL:
  // Shaka sign (Thumb and Pinky extended) near ear/jaw
  if (dom.isShaka && isNearTemple) {
    candidateMap['CALL'] = 0.97;
    candidateMap['PHONE'] = 0.90;
  } else if (dom.isShaka) {
    candidateMap['CALL'] = 0.88;
  }

  // 19. WHAT:
  // Two open hands palms facing up side-by-side in front of chest
  if (twoHandsPresent && nonDom && dom.isFlatPalm && nonDom.isFlatPalm && isChestCenter && handsDistance > 0.15) {
    candidateMap['WHAT'] = 0.93;
    candidateMap['WHERE'] = 0.80;
  }

  // 20. CAR:
  // Two fists holding imaginary steering wheel
  if (twoHandsPresent && nonDom && dom.isFist && nonDom.isFist && handsDistance > 0.20 && isChestCenter) {
    candidateMap['CAR'] = 0.94;
    candidateMap['WORK'] = 0.72;
  }

  // 21. EMERGENCY:
  // E-hand (fingertips touching thumb) or rapid vibration in chest zone
  if (dom.isIndexPinch && isChestCenter) {
    candidateMap['EMERGENCY'] = 0.89;
    candidateMap['DANGER'] = 0.82;
  }

  // -------------------------------------------------------------
  // LOCKED 15 PHARMACY SIGNS SPATIAL RECOGNITION RULES
  // -------------------------------------------------------------
  // 22. PAIN (index fingers pointing toward each other or pointing at chest)
  if (twoHandsPresent && nonDom && dom.isPointing && nonDom.isPointing && handsDistance < 0.35) {
    candidateMap['PAIN'] = 0.97;
    candidateMap['HELP'] = 0.70;
  } else if (dom.isPointing && isChestCenter && !isNearForehead) {
    candidateMap['PAIN'] = Math.max(candidateMap['PAIN'] ?? 0, 0.90);
  }

  // 23. HEADACHE (pointing at temple or forehead above shoulder line)
  if (dom.isPointing && (isNearForehead || (isNearTemple && domWrist.y < avgShoulderY))) {
    candidateMap['HEADACHE'] = 0.96;
    candidateMap['PAIN'] = Math.max(candidateMap['PAIN'] ?? 0, 0.88);
  }

  // 24. FEVER (open palm flat against forehead, wrist raised to forehead level)
  if (dom.isFlatPalm && isNearForehead && domWrist.y < normNose.y + 0.08) {
    candidateMap['FEVER'] = 0.96;
    candidateMap['HEADACHE'] = 0.80;
  }

  // 25. COUGH (fist directly over mouth)
  if (dom.isFist && isNearMouth && !twoHandsPresent) {
    candidateMap['COUGH'] = 0.95;
    candidateMap['COLD'] = 0.80;
  }

  // 26. COLD (two fists in front of chest)
  if (twoHandsPresent && nonDom && dom.isFist && nonDom.isFist && handsDistance < 0.35) {
    candidateMap['COLD'] = 0.96;
    candidateMap['COUGH'] = 0.75;
  }

  // 27. ALLERGY (finger touching nose)
  if (dom.isPointing && dist(domTip, normNose) < 0.12) {
    candidateMap['ALLERGY'] = 0.95;
    candidateMap['COLD'] = 0.78;
  }

  // 28. MEDICINE (fingers tapping or rubbing non-dominant open palm, not a fist which is HELP)
  if (twoHandsPresent && nonDom && nonDom.isFlatPalm && !dom.isFlatPalm && !dom.isFist && handsDistance < 0.30) {
    candidateMap['MEDICINE'] = 0.96;
    candidateMap['HELP'] = 0.72;
  } else if ((dom.isIndexPinch || dom.isMiddlePinch) && isNearMouth) {
    candidateMap['MEDICINE'] = Math.max(candidateMap['MEDICINE'] ?? 0, 0.94);
  }

  // 29. MORNING (dominant open hand rising above non-dominant horizontal arm)
  if (twoHandsPresent && nonDom && dom.isFlatPalm && domWrist.y < nonDom.wristPos.y + 0.02 && handsDistance < 0.35) {
    candidateMap['MORNING'] = 0.95;
    candidateMap['HELLO'] = 0.75;
  }

  // 30. NIGHT (dominant hand dropping over non-dominant wrist)
  if (twoHandsPresent && nonDom && domWrist.y >= nonDom.wristPos.y - 0.05 && handsDistance < 0.28) {
    candidateMap['NIGHT'] = 0.94;
    candidateMap['TIME'] = 0.78;
  }

  // Determine top candidates
  const entries = Object.entries(candidateMap).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0 || isRestingLow) {
    return {
      candidateGloss: 'SEARCHING',
      confidence: 0.15,
      gestureTag: dom.isFlatPalm
        ? 'OPEN PALM (NEUTRAL/HOLD)'
        : dom.isFist
        ? 'FIST (IDLE)'
        : dom.isPointing
        ? 'POINTING'
        : 'TRACKING HAND',
      topCandidates: [
        { gloss: 'SEARCHING', score: 0.15 },
        { gloss: 'HELLO', score: 0.05 },
        { gloss: 'HELP', score: 0.02 },
      ],
      isResting: isRestingLow,
    };
  }

  const [topGloss, topScore] = entries[0];
  const topCandidates: CandidateScore[] = entries.slice(0, 3).map(([gloss, score]) => ({
    gloss,
    score: Math.round(score * 100) / 100,
  }));

  // Ensure 3 candidates exist
  if (topCandidates.length < 3) {
    const fallbacks = ['HELLO', 'HELP', 'PLEASE', 'THANK-YOU', 'YES', 'NO'];
    for (const fb of fallbacks) {
      if (!topCandidates.some((c) => c.gloss === fb)) {
        topCandidates.push({ gloss: fb, score: 0.02 });
        if (topCandidates.length >= 3) break;
      }
    }
  }

  return {
    candidateGloss: topGloss,
    confidence: topScore,
    gestureTag: `${topGloss} (${Math.round(topScore * 100)}%)`,
    topCandidates,
    isResting: false,
  };
}

/**
 * Kinematic Hold Gater:
 * Requires stable detection of the same sign for minimum duration (e.g. 350ms ~ 11 frames)
 * before triggering commit. Once committed, locks until user releases or switches sign.
 */
export class KinematicHoldGater {
  private currentCandidate = 'SEARCHING';
  private holdStartTimestamp = 0;
  private holdFrameCount = 0;
  private minHoldMs: number;
  private minHoldFrames: number;
  private confidenceThreshold: number;
  private lastCommittedGloss = '';
  private isLocked = false;
  private lastReleaseTimestamp = 0;

  constructor(minHoldMs = 380, minHoldFrames = 10, confidenceThreshold = 0.70) {
    this.minHoldMs = minHoldMs;
    this.minHoldFrames = minHoldFrames;
    this.confidenceThreshold = confidenceThreshold;
  }

  public update(
    gloss: string,
    confidence: number,
    isResting: boolean,
    now: number
  ): { shouldCommit: boolean; committedGloss: string | null; holdProgress: number } {
    // If resting, hands down, or searching
    if (isResting || gloss === 'SEARCHING' || gloss === 'UNKNOWN' || confidence < this.confidenceThreshold) {
      this.currentCandidate = 'SEARCHING';
      this.holdFrameCount = 0;
      this.holdStartTimestamp = 0;

      // Reset lock when user relaxes hands for > 350ms
      if (this.isLocked && now - this.lastReleaseTimestamp > 350) {
        this.isLocked = false;
        this.lastCommittedGloss = '';
      }
      this.lastReleaseTimestamp = now;

      return { shouldCommit: false, committedGloss: null, holdProgress: 0 };
    }

    // If new sign candidate begins
    if (gloss !== this.currentCandidate) {
      this.currentCandidate = gloss;
      this.holdStartTimestamp = now;
      this.holdFrameCount = 1;
      // If switching to a completely new sign, unlock
      if (gloss !== this.lastCommittedGloss) {
        this.isLocked = false;
      }
      return { shouldCommit: false, committedGloss: null, holdProgress: 0.1 };
    }

    // Increment hold
    this.holdFrameCount++;
    const holdDuration = now - this.holdStartTimestamp;
    const holdProgress = Math.min(1.0, Math.max(this.holdFrameCount / this.minHoldFrames, holdDuration / this.minHoldMs));

    // If already locked for this exact sign, do NOT re-commit in a loop!
    if (this.isLocked && gloss === this.lastCommittedGloss) {
      return { shouldCommit: false, committedGloss: null, holdProgress: 1.0 };
    }

    // Trigger commit when hold criteria is met
    if (holdDuration >= this.minHoldMs && this.holdFrameCount >= this.minHoldFrames) {
      this.isLocked = true;
      this.lastCommittedGloss = gloss;
      this.lastReleaseTimestamp = now;
      return { shouldCommit: true, committedGloss: gloss, holdProgress: 1.0 };
    }

    return { shouldCommit: false, committedGloss: null, holdProgress };
  }

  public reset(): void {
    this.currentCandidate = 'SEARCHING';
    this.holdStartTimestamp = 0;
    this.holdFrameCount = 0;
    this.lastCommittedGloss = '';
    this.isLocked = false;
    this.lastReleaseTimestamp = 0;
  }
}
