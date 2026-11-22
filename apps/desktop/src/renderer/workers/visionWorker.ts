/**
 * Vision Web Worker.
 * Processes camera frames, normalizes landmarks to shoulder-midpoint origin,
 * and scales by inter-shoulder distance with zero-fill presence masks.
 */

export interface RawLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface VisionWorkerInput {
  type: 'process_frame';
  leftHand: RawLandmark[] | null;
  rightHand: RawLandmark[] | null;
  pose: RawLandmark[] | null;
  timestampMs: number;
  leftHanded?: boolean;
}

export interface VisionWorkerOutput {
  type: 'landmarks_extracted';
  landmarks: number[]; // 162 normalized coordinates
  timestampMs: number;
  leftHandPresent: boolean;
  rightHandPresent: boolean;
  shoulderWidth: number;
}

/**
 * Coordinate-invariant normalization matching Python LandmarkNormalizer:
 * 1. Calculate shoulder midpoint as origin (0, 0, 0).
 * 2. Calculate Euclidean inter-shoulder distance as scale.
 * 3. Translate all landmarks to origin and scale to unit shoulder width.
 */
export function normalizeLandmarks(
  leftHand: RawLandmark[] | null,
  rightHand: RawLandmark[] | null,
  pose: RawLandmark[] | null,
  leftHanded = false
): { landmarks: number[]; shoulderWidth: number } {
  // 54 landmarks * 3 coords = 162 elements
  const coords = new Array(162).fill(0.0);

  // Left hand: indices 0..62 (21 landmarks * 3)
  const leftPresent = leftHand && leftHand.length === 21;
  if (leftPresent) {
    for (let i = 0; i < 21; i++) {
      coords[i * 3] = leftHand[i].x;
      coords[i * 3 + 1] = leftHand[i].y;
      coords[i * 3 + 2] = leftHand[i].z;
    }
  }

  // Right hand: indices 63..125 (21 landmarks * 3)
  const rightPresent = rightHand && rightHand.length === 21;
  if (rightPresent) {
    for (let i = 0; i < 21; i++) {
      coords[63 + i * 3] = rightHand[i].x;
      coords[63 + i * 3 + 1] = rightHand[i].y;
      coords[63 + i * 3 + 2] = rightHand[i].z;
    }
  }

  // Pose 12 upper-body subset: indices 126..161 (12 landmarks * 3)
  // Index 11/12 in MediaPipe pose are left and right shoulders (126..131)
  let shoulderMidX = 0.0;
  let shoulderMidY = 0.0;
  let shoulderMidZ = 0.0;
  let shoulderWidth = 1.0;

  if (pose && pose.length >= 12) {
    for (let i = 0; i < 12; i++) {
      coords[126 + i * 3] = pose[i].x;
      coords[126 + i * 3 + 1] = pose[i].y;
      coords[126 + i * 3 + 2] = pose[i].z;
    }

    const leftShoulder = pose[11] || pose[0];
    const rightShoulder = pose[12] || pose[1];

    shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2.0;
    shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2.0;
    shoulderMidZ = (leftShoulder.z + rightShoulder.z) / 2.0;

    const dx = rightShoulder.x - leftShoulder.x;
    const dy = rightShoulder.y - leftShoulder.y;
    const dz = rightShoulder.z - leftShoulder.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > 1e-4) {
      shoulderWidth = dist;
    }
  }

  // Normalization pass
  const scale = 1.0 / shoulderWidth;
  for (let i = 0; i < 54; i++) {
    const idx = i * 3;
    // Only translate and scale if hand or pose was present (non-zero)
    if (coords[idx] !== 0 || coords[idx + 1] !== 0) {
      let x = (coords[idx] - shoulderMidX) * scale;
      if (leftHanded) {
        x = -x; // Mirror flip for left-handed signers
      }
      coords[idx] = x;
      coords[idx + 1] = (coords[idx + 1] - shoulderMidY) * scale;
      coords[idx + 2] = (coords[idx + 2] - shoulderMidZ) * scale;
    }
  }

  return { landmarks: coords, shoulderWidth };
}

// Worker message listener
if (typeof self !== 'undefined' && 'addEventListener' in self) {
  self.addEventListener('message', (e: MessageEvent<VisionWorkerInput>) => {
    const data = e.data;
    if (data.type === 'process_frame') {
      const { landmarks, shoulderWidth } = normalizeLandmarks(
        data.leftHand,
        data.rightHand,
        data.pose,
        data.leftHanded
      );

      const response: VisionWorkerOutput = {
        type: 'landmarks_extracted',
        landmarks,
        timestampMs: data.timestampMs,
        leftHandPresent: !!(data.leftHand && data.leftHand.length === 21),
        rightHandPresent: !!(data.rightHand && data.rightHand.length === 21),
        shoulderWidth,
      };

      postMessage(response);
    }
  });
}
