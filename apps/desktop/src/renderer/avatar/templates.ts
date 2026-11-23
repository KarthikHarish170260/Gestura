/**
 * Skeletal joint templates for the 3D/2D Avatar Player.
 * Coordinates are normalized in [0, 1] relative to viewport.
 */

export interface AvatarKeyframe {
  timeOffset: number; // 0.0 to 1.0
  pose: number[][];   // 12 joints [x, y, z]
  leftHand: number[][]; // 21 joints [x, y, z]
  rightHand: number[][]; // 21 joints [x, y, z]
}

export interface GlossClip {
  gloss: string;
  durationMs: number;
  keyframes: AvatarKeyframe[];
}

// Generate base neutral rest pose
export function createNeutralPose(): AvatarKeyframe {
  const pose: number[][] = [
    [0.50, 0.22, 0.0], // Nose
    [0.38, 0.35, 0.0], // Left Shoulder
    [0.62, 0.35, 0.0], // Right Shoulder
    [0.34, 0.52, 0.0], // Left Elbow
    [0.66, 0.52, 0.0], // Right Elbow
    [0.36, 0.70, 0.0], // Left Wrist
    [0.64, 0.70, 0.0], // Right Wrist
    [0.42, 0.85, 0.0], // Left Hip
    [0.58, 0.85, 0.0], // Right Hip
    [0.50, 0.35, 0.0], // Mid-Shoulder
    [0.46, 0.20, 0.0], // Left Ear
    [0.54, 0.20, 0.0], // Right Ear
  ];

  // Helper for 21 hand joints starting from wrist
  const makeHand = (wristX: number, wristY: number): number[][] => {
    const hand: number[][] = [[wristX, wristY, 0.0]];
    for (let f = 0; f < 5; f++) {
      const angle = (f - 2) * 0.15;
      for (let j = 1; j <= 4; j++) {
        hand.push([wristX + Math.sin(angle) * (j * 0.015), wristY - Math.cos(angle) * (j * 0.015), 0.0]);
      }
    }
    return hand;
  };

  return {
    timeOffset: 0.0,
    pose,
    leftHand: makeHand(0.36, 0.70),
    rightHand: makeHand(0.64, 0.70),
  };
}

// Dynamic procedural generator for vocabulary signs
export function getGlossClip(gloss: string): GlossClip {
  const upper = gloss.toUpperCase();
  const rest = createNeutralPose();
  const keyframes: AvatarKeyframe[] = [];

  // Start with rest pose
  keyframes.push({ ...rest, timeOffset: 0.0 });

  if (upper === "HELLO") {
    // Wave hand near temple
    keyframes.push({
      timeOffset: 0.3,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.65, 0.26, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] + 0.01, h[1] - 0.44, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.70, 0.24, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] + 0.06, h[1] - 0.46, h[2]]),
    });
  } else if (upper === "THANK-YOU") {
    // Hand touches chin and moves forward open
    keyframes.push({
      timeOffset: 0.3,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.52, 0.28, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.12, h[1] - 0.42, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.55, 0.40, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.09, h[1] - 0.30, h[2]]),
    });
  } else if (upper === "YES") {
    // Fist nods up and down
    keyframes.push({
      timeOffset: 0.3,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.62, 0.42, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.02, h[1] - 0.28, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.62, 0.48, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.02, h[1] - 0.22, h[2]]),
    });
  } else if (upper === "HELP") {
    // Left hand flat, right fist thumbs-up lifts from left palm
    keyframes.push({
      timeOffset: 0.4,
      pose: rest.pose.map((p, idx) => {
        if (idx === 5) return [0.46, 0.50, 0.0];
        if (idx === 6) return [0.52, 0.48, 0.0];
        return p;
      }),
      leftHand: rest.leftHand.map(h => [h[0] + 0.10, h[1] - 0.20, h[2]]),
      rightHand: rest.rightHand.map(h => [h[0] - 0.12, h[1] - 0.22, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => {
        if (idx === 5) return [0.46, 0.44, 0.0];
        if (idx === 6) return [0.52, 0.38, 0.0];
        return p;
      }),
      leftHand: rest.leftHand.map(h => [h[0] + 0.10, h[1] - 0.26, h[2]]),
      rightHand: rest.rightHand.map(h => [h[0] - 0.12, h[1] - 0.32, h[2]]),
    });
  } else if (upper === "NO") {
    // Index and middle snap to thumb repeatedly
    keyframes.push({
      timeOffset: 0.3,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.60, 0.38, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.04, h[1] - 0.32, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.6,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.60, 0.40, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.04, h[1] - 0.30, h[2]]),
    });
  } else if (upper === "PLEASE") {
    // Flat hand circular motion over chest
    keyframes.push({
      timeOffset: 0.3,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.50, 0.42, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.14, h[1] - 0.28, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.54, 0.42, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.10, h[1] - 0.28, h[2]]),
    });
  } else if (upper === "SORRY") {
    // Fist rubbing circular on chest
    keyframes.push({
      timeOffset: 0.3,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.50, 0.44, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.14, h[1] - 0.26, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.53, 0.44, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.11, h[1] - 0.26, h[2]]),
    });
  } else if (upper === "I" || upper === "ME") {
    // Index finger points to chest
    keyframes.push({
      timeOffset: 0.5,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.50, 0.42, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.14, h[1] - 0.28, h[2]]),
    });
  } else if (upper === "YOU") {
    // Index finger points forward
    keyframes.push({
      timeOffset: 0.5,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.60, 0.40, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.04, h[1] - 0.30, h[2]]),
    });
  } else if (upper === "LOVE") {
    // Both arms crossed over chest
    keyframes.push({
      timeOffset: 0.5,
      pose: rest.pose.map((p, idx) => {
        if (idx === 5) return [0.58, 0.42, 0.0];
        if (idx === 6) return [0.42, 0.42, 0.0];
        return p;
      }),
      leftHand: rest.leftHand.map(h => [h[0] + 0.22, h[1] - 0.28, h[2]]),
      rightHand: rest.rightHand.map(h => [h[0] - 0.22, h[1] - 0.28, h[2]]),
    });
  } else if (upper === "WATER") {
    // W hand taps chin/mouth
    keyframes.push({
      timeOffset: 0.4,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.52, 0.28, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.12, h[1] - 0.42, h[2]]),
    });
    keyframes.push({
      timeOffset: 0.7,
      pose: rest.pose.map((p, idx) => (idx === 6 ? [0.52, 0.26, 0.0] : p)),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.12, h[1] - 0.44, h[2]]),
    });
  } else if (upper === "STOP") {
    // Right hand chops down flat onto left palm
    keyframes.push({
      timeOffset: 0.5,
      pose: rest.pose.map((p, idx) => {
        if (idx === 5) return [0.48, 0.52, 0.0];
        if (idx === 6) return [0.48, 0.50, 0.0];
        return p;
      }),
      leftHand: rest.leftHand.map(h => [h[0] + 0.12, h[1] - 0.18, h[2]]),
      rightHand: rest.rightHand.map(h => [h[0] - 0.16, h[1] - 0.20, h[2]]),
    });
  } else {
    // Generic smooth sign trajectory
    const charCode = upper.charCodeAt(0) || 65;
    const offset = ((charCode % 10) - 5) * 0.03;
    keyframes.push({
      timeOffset: 0.5,
      pose: rest.pose.map((p, idx) => {
        if (idx === 6) return [0.60 + offset, 0.40, 0.0];
        return p;
      }),
      leftHand: rest.leftHand,
      rightHand: rest.rightHand.map(h => [h[0] - 0.04 + offset, h[1] - 0.30, h[2]]),
    });
  }

  // End with rest return
  keyframes.push({ ...rest, timeOffset: 1.0 });

  return {
    gloss: upper,
    durationMs: 800,
    keyframes,
  };
}
