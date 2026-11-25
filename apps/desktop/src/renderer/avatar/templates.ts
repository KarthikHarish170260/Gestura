/**
 * Skeletal joint templates for the 3D/2D Avatar Player.
 * Coordinates are normalized in [0, 1] relative to viewport.
 */

export interface AvatarKeyframe {
  timeOffset: number; // 0.0 to 1.0
  pose: number[][]; // 12 joints [x, y, z]
  leftHand: number[][]; // 21 joints [x, y, z]
  rightHand: number[][]; // 21 joints [x, y, z]
}

export interface GlossClip {
  gloss: string;
  durationMs: number;
  keyframes: AvatarKeyframe[];
}

type FingerFlags = [boolean, boolean, boolean, boolean, boolean]; // [thumb, index, middle, ring, pinky]

/** Build 21-joint hand landmarks anchored at wrist (wx, wy) with per-finger extension and hand tilt. */
function makeHand(
  wristX: number,
  wristY: number,
  fingers: FingerFlags = [true, true, true, true, true],
  tiltRad = 0,
  mirrorX = 1
): number[][] {
  const hand: number[][] = [[wristX, wristY, 0.0]];
  const baseAngles = [-0.48, -0.18, 0.0, 0.18, 0.36];

  for (let f = 0; f < 5; f++) {
    const extended = fingers[f];
    const angle = baseAngles[f] * mirrorX + tiltRad;
    const stepLen = extended ? (f === 0 ? 0.015 : 0.019) : 0.0055;
    for (let j = 1; j <= 4; j++) {
      // Curled fingers fold slightly inward/downward after MCP joint
      const curlBend = !extended && j >= 2 ? 0.008 * (j - 1) : 0;
      const dist = j * stepLen;
      const px = wristX + Math.sin(angle) * dist;
      const py = wristY - Math.cos(angle) * dist + curlBend;
      hand.push([
        Math.max(0.02, Math.min(0.98, px)),
        Math.max(0.02, Math.min(0.98, py)),
        0.0,
      ]);
    }
  }
  return hand;
}

// Generate base neutral rest pose
export function createNeutralPose(): AvatarKeyframe {
  const pose: number[][] = [
    [0.5, 0.22, 0.0], // 0: Nose / Head center
    [0.36, 0.36, 0.0], // 1: Left Shoulder
    [0.64, 0.36, 0.0], // 2: Right Shoulder
    [0.31, 0.54, 0.0], // 3: Left Elbow
    [0.69, 0.54, 0.0], // 4: Right Elbow
    [0.35, 0.72, 0.0], // 5: Left Wrist
    [0.65, 0.72, 0.0], // 6: Right Wrist
    [0.42, 0.86, 0.0], // 7: Left Hip
    [0.58, 0.86, 0.0], // 8: Right Hip
    [0.5, 0.36, 0.0], // 9: Mid-Shoulder
    [0.46, 0.2, 0.0], // 10: Left Ear
    [0.54, 0.2, 0.0], // 11: Right Ear
  ];

  return {
    timeOffset: 0.0,
    pose,
    leftHand: makeHand(0.35, 0.72, [true, true, true, true, true], 0, 1),
    rightHand: makeHand(0.65, 0.72, [true, true, true, true, true], 0, -1),
  };
}

interface ArmTarget {
  leftWrist?: [number, number];
  leftElbow?: [number, number];
  leftFingers?: FingerFlags;
  leftTilt?: number;
  rightWrist?: [number, number];
  rightElbow?: [number, number];
  rightFingers?: FingerFlags;
  rightTilt?: number;
}

function buildKeyframe(rest: AvatarKeyframe, timeOffset: number, target: ArmTarget): AvatarKeyframe {
  const pose = rest.pose.map((p, idx) => {
    if (idx === 3 && target.leftElbow) return [target.leftElbow[0], target.leftElbow[1], 0.0];
    if (idx === 4 && target.rightElbow) return [target.rightElbow[0], target.rightElbow[1], 0.0];
    if (idx === 5 && target.leftWrist) return [target.leftWrist[0], target.leftWrist[1], 0.0];
    if (idx === 6 && target.rightWrist) return [target.rightWrist[0], target.rightWrist[1], 0.0];
    return p;
  });

  const lw = target.leftWrist ?? [rest.pose[5][0], rest.pose[5][1]];
  const rw = target.rightWrist ?? [rest.pose[6][0], rest.pose[6][1]];

  return {
    timeOffset,
    pose,
    leftHand: target.leftWrist
      ? makeHand(lw[0], lw[1], target.leftFingers ?? [true, true, true, true, true], target.leftTilt ?? 0, 1)
      : rest.leftHand,
    rightHand: target.rightWrist
      ? makeHand(rw[0], rw[1], target.rightFingers ?? [true, true, true, true, true], target.rightTilt ?? 0, -1)
      : rest.rightHand,
  };
}

// Dynamic procedural generator for pharmacy & core vocabulary signs
export function getGlossClip(gloss: string): GlossClip {
  const upper = gloss.toUpperCase();
  const rest = createNeutralPose();
  const keyframes: AvatarKeyframe[] = [{ ...rest, timeOffset: 0.0 }];
  let durationMs = 1150;

  switch (upper) {
    case 'HELLO': {
      // Open hand raised near right temple, waving outward twice
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          rightElbow: [0.74, 0.45],
          rightWrist: [0.64, 0.25],
          rightTilt: 0.15,
        }),
        buildKeyframe(rest, 0.5, {
          rightElbow: [0.76, 0.43],
          rightWrist: [0.71, 0.23],
          rightTilt: 0.45,
        }),
        buildKeyframe(rest, 0.75, {
          rightElbow: [0.74, 0.45],
          rightWrist: [0.64, 0.25],
          rightTilt: 0.15,
        })
      );
      break;
    }

    case 'THANK-YOU': {
      // Flat open palm touches chin and sweeps smoothly forward/downward
      keyframes.push(
        buildKeyframe(rest, 0.3, {
          rightElbow: [0.67, 0.48],
          rightWrist: [0.51, 0.28],
          rightTilt: -0.25,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.66, 0.54],
          rightWrist: [0.54, 0.42],
          rightTilt: 0.4,
        })
      );
      break;
    }

    case 'YES': {
      // Closed fist nods up and down at shoulder level twice
      const fist: FingerFlags = [false, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          rightElbow: [0.69, 0.50],
          rightWrist: [0.62, 0.39],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.45, {
          rightElbow: [0.69, 0.53],
          rightWrist: [0.62, 0.47],
          rightFingers: fist,
          rightTilt: 0.35,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.69, 0.50],
          rightWrist: [0.62, 0.39],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.82, {
          rightElbow: [0.69, 0.53],
          rightWrist: [0.62, 0.47],
          rightFingers: fist,
          rightTilt: 0.35,
        })
      );
      break;
    }

    case 'NO': {
      // Index + middle + thumb pinch/snap twice near right shoulder
      const openPinch: FingerFlags = [true, true, true, false, false];
      const closedPinch: FingerFlags = [false, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          rightElbow: [0.68, 0.50],
          rightWrist: [0.59, 0.38],
          rightFingers: openPinch,
        }),
        buildKeyframe(rest, 0.45, {
          rightElbow: [0.68, 0.51],
          rightWrist: [0.59, 0.41],
          rightFingers: closedPinch,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.68, 0.50],
          rightWrist: [0.59, 0.38],
          rightFingers: openPinch,
        }),
        buildKeyframe(rest, 0.82, {
          rightElbow: [0.68, 0.51],
          rightWrist: [0.59, 0.41],
          rightFingers: closedPinch,
        })
      );
      break;
    }

    case 'HELP': {
      // Left flat palm + right thumbs-up fist lifting upward together
      const thumbUp: FingerFlags = [true, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.35, {
          leftElbow: [0.34, 0.56],
          leftWrist: [0.46, 0.53],
          leftTilt: 1.35,
          rightElbow: [0.67, 0.55],
          rightWrist: [0.52, 0.50],
          rightFingers: thumbUp,
        }),
        buildKeyframe(rest, 0.75, {
          leftElbow: [0.34, 0.48],
          leftWrist: [0.46, 0.41],
          leftTilt: 1.35,
          rightElbow: [0.67, 0.47],
          rightWrist: [0.52, 0.38],
          rightFingers: thumbUp,
        })
      );
      break;
    }

    case 'PAIN': {
      // Both index fingers pointing toward each other over chest/abdomen, pulsing inward twice
      const idxOnly: FingerFlags = [false, true, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          leftElbow: [0.32, 0.55],
          leftWrist: [0.41, 0.51],
          leftFingers: idxOnly,
          leftTilt: 1.3,
          rightElbow: [0.68, 0.55],
          rightWrist: [0.59, 0.51],
          rightFingers: idxOnly,
          rightTilt: -1.3,
        }),
        buildKeyframe(rest, 0.45, {
          leftElbow: [0.33, 0.55],
          leftWrist: [0.46, 0.51],
          leftFingers: idxOnly,
          leftTilt: 1.3,
          rightElbow: [0.67, 0.55],
          rightWrist: [0.54, 0.51],
          rightFingers: idxOnly,
          rightTilt: -1.3,
        }),
        buildKeyframe(rest, 0.65, {
          leftElbow: [0.32, 0.55],
          leftWrist: [0.41, 0.51],
          leftFingers: idxOnly,
          leftTilt: 1.3,
          rightElbow: [0.68, 0.55],
          rightWrist: [0.59, 0.51],
          rightFingers: idxOnly,
          rightTilt: -1.3,
        }),
        buildKeyframe(rest, 0.82, {
          leftElbow: [0.33, 0.55],
          leftWrist: [0.46, 0.51],
          leftFingers: idxOnly,
          leftTilt: 1.3,
          rightElbow: [0.67, 0.55],
          rightWrist: [0.54, 0.51],
          rightFingers: idxOnly,
          rightTilt: -1.3,
        })
      );
      break;
    }

    case 'HEADACHE': {
      // Index/open fingertips tap near right temple twice
      const idxOnly: FingerFlags = [false, true, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          rightElbow: [0.73, 0.44],
          rightWrist: [0.60, 0.23],
          rightFingers: idxOnly,
          rightTilt: -0.5,
        }),
        buildKeyframe(rest, 0.45, {
          rightElbow: [0.72, 0.43],
          rightWrist: [0.55, 0.20],
          rightFingers: idxOnly,
          rightTilt: -0.6,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.73, 0.44],
          rightWrist: [0.60, 0.23],
          rightFingers: idxOnly,
          rightTilt: -0.5,
        }),
        buildKeyframe(rest, 0.82, {
          rightElbow: [0.72, 0.43],
          rightWrist: [0.55, 0.20],
          rightFingers: idxOnly,
          rightTilt: -0.6,
        })
      );
      break;
    }

    case 'FEVER': {
      // Flat hand lifts to rest across forehead
      keyframes.push(
        buildKeyframe(rest, 0.3, {
          rightElbow: [0.70, 0.42],
          rightWrist: [0.54, 0.20],
          rightTilt: -1.15,
        }),
        buildKeyframe(rest, 0.72, {
          rightElbow: [0.70, 0.41],
          rightWrist: [0.52, 0.19],
          rightTilt: -1.25,
        })
      );
      break;
    }

    case 'COUGH': {
      // Curved fist rises to mouth and pulses slightly forward twice
      const fist: FingerFlags = [false, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          rightElbow: [0.67, 0.48],
          rightWrist: [0.52, 0.27],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.45, {
          rightElbow: [0.67, 0.50],
          rightWrist: [0.53, 0.31],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.67, 0.48],
          rightWrist: [0.52, 0.27],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.82, {
          rightElbow: [0.67, 0.50],
          rightWrist: [0.53, 0.31],
          rightFingers: fist,
        })
      );
      break;
    }

    case 'COLD': {
      // Both fists curl near upper chest and shiver side-to-side
      const fist: FingerFlags = [false, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.22, {
          leftElbow: [0.31, 0.53],
          leftWrist: [0.43, 0.42],
          leftFingers: fist,
          rightElbow: [0.69, 0.53],
          rightWrist: [0.57, 0.42],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.42, {
          leftElbow: [0.33, 0.53],
          leftWrist: [0.45, 0.42],
          leftFingers: fist,
          rightElbow: [0.71, 0.53],
          rightWrist: [0.59, 0.42],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.62, {
          leftElbow: [0.29, 0.53],
          leftWrist: [0.41, 0.42],
          leftFingers: fist,
          rightElbow: [0.67, 0.53],
          rightWrist: [0.55, 0.42],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.8, {
          leftElbow: [0.32, 0.53],
          leftWrist: [0.44, 0.42],
          leftFingers: fist,
          rightElbow: [0.70, 0.53],
          rightWrist: [0.58, 0.42],
          rightFingers: fist,
        })
      );
      break;
    }

    case 'ALLERGY': {
      // Left forearm held out horizontally while right index scratches along it twice
      const idxOnly: FingerFlags = [false, true, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          leftElbow: [0.33, 0.53],
          leftWrist: [0.48, 0.50],
          leftTilt: 1.35,
          rightElbow: [0.66, 0.52],
          rightWrist: [0.46, 0.46],
          rightFingers: idxOnly,
          rightTilt: -1.1,
        }),
        buildKeyframe(rest, 0.45, {
          leftElbow: [0.33, 0.53],
          leftWrist: [0.48, 0.50],
          leftTilt: 1.35,
          rightElbow: [0.66, 0.50],
          rightWrist: [0.39, 0.49],
          rightFingers: idxOnly,
          rightTilt: -1.2,
        }),
        buildKeyframe(rest, 0.65, {
          leftElbow: [0.33, 0.53],
          leftWrist: [0.48, 0.50],
          leftTilt: 1.35,
          rightElbow: [0.66, 0.52],
          rightWrist: [0.46, 0.46],
          rightFingers: idxOnly,
          rightTilt: -1.1,
        }),
        buildKeyframe(rest, 0.82, {
          leftElbow: [0.33, 0.53],
          leftWrist: [0.48, 0.50],
          leftTilt: 1.35,
          rightElbow: [0.66, 0.50],
          rightWrist: [0.39, 0.49],
          rightFingers: idxOnly,
          rightTilt: -1.2,
        })
      );
      break;
    }

    case 'MEDICINE': {
      // Left palm open at chest, right middle finger taps/circles left palm twice
      const medFinger: FingerFlags = [false, false, true, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.46, 0.50],
          leftTilt: 1.2,
          rightElbow: [0.66, 0.52],
          rightWrist: [0.51, 0.44],
          rightFingers: medFinger,
          rightTilt: -0.9,
        }),
        buildKeyframe(rest, 0.45, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.46, 0.50],
          leftTilt: 1.2,
          rightElbow: [0.66, 0.54],
          rightWrist: [0.48, 0.49],
          rightFingers: medFinger,
          rightTilt: -1.1,
        }),
        buildKeyframe(rest, 0.65, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.46, 0.50],
          leftTilt: 1.2,
          rightElbow: [0.66, 0.52],
          rightWrist: [0.51, 0.44],
          rightFingers: medFinger,
          rightTilt: -0.9,
        }),
        buildKeyframe(rest, 0.82, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.46, 0.50],
          leftTilt: 1.2,
          rightElbow: [0.66, 0.54],
          rightWrist: [0.48, 0.49],
          rightFingers: medFinger,
          rightTilt: -1.1,
        })
      );
      break;
    }

    case 'WATER': {
      // Classic "W" handshape (index, middle, ring extended; pinky & thumb curled) tapping chin twice
      const wHand: FingerFlags = [false, true, true, true, false];
      keyframes.push(
        buildKeyframe(rest, 0.25, {
          rightElbow: [0.68, 0.49],
          rightWrist: [0.52, 0.29],
          rightFingers: wHand,
        }),
        buildKeyframe(rest, 0.45, {
          rightElbow: [0.68, 0.47],
          rightWrist: [0.51, 0.26],
          rightFingers: wHand,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.68, 0.49],
          rightWrist: [0.52, 0.29],
          rightFingers: wHand,
        }),
        buildKeyframe(rest, 0.82, {
          rightElbow: [0.68, 0.47],
          rightWrist: [0.51, 0.26],
          rightFingers: wHand,
        })
      );
      break;
    }

    case 'MORNING': {
      // Left horizontal base arm + right flat palm rising upward like sunrise
      durationMs = 1300;
      keyframes.push(
        buildKeyframe(rest, 0.22, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.48, 0.52],
          leftTilt: 1.45,
          rightElbow: [0.68, 0.60],
          rightWrist: [0.54, 0.62],
        }),
        buildKeyframe(rest, 0.55, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.48, 0.52],
          leftTilt: 1.45,
          rightElbow: [0.68, 0.50],
          rightWrist: [0.54, 0.42],
        }),
        buildKeyframe(rest, 0.82, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.48, 0.52],
          leftTilt: 1.45,
          rightElbow: [0.68, 0.43],
          rightWrist: [0.54, 0.28],
        })
      );
      break;
    }

    case 'NIGHT': {
      // Left horizontal base arm + right curved hand arcing downward over left wrist (sunset)
      durationMs = 1300;
      keyframes.push(
        buildKeyframe(rest, 0.22, {
          leftElbow: [0.33, 0.55],
          leftWrist: [0.48, 0.52],
          leftTilt: 1.45,
          rightElbow: [0.70, 0.45],
          rightWrist: [0.56, 0.34],
          rightTilt: -0.4,
        }),
        buildKeyframe(rest, 0.55, {
          leftElbow: [0.33, 0.55],
          leftWrist: [0.48, 0.52],
          leftTilt: 1.45,
          rightElbow: [0.67, 0.48],
          rightWrist: [0.51, 0.43],
          rightTilt: -0.9,
        }),
        buildKeyframe(rest, 0.82, {
          leftElbow: [0.33, 0.55],
          leftWrist: [0.48, 0.52],
          leftTilt: 1.45,
          rightElbow: [0.65, 0.52],
          rightWrist: [0.47, 0.52],
          rightTilt: -1.3,
        })
      );
      break;
    }

    case 'PLEASE': {
      // Flat hand circular motion over chest
      keyframes.push(
        buildKeyframe(rest, 0.3, {
          rightElbow: [0.66, 0.53],
          rightWrist: [0.50, 0.42],
          rightTilt: -0.4,
        }),
        buildKeyframe(rest, 0.55, {
          rightElbow: [0.68, 0.54],
          rightWrist: [0.54, 0.45],
          rightTilt: -0.4,
        }),
        buildKeyframe(rest, 0.78, {
          rightElbow: [0.65, 0.52],
          rightWrist: [0.49, 0.44],
          rightTilt: -0.4,
        })
      );
      break;
    }

    case 'SORRY': {
      // Fist rubbing circularly over chest
      const fist: FingerFlags = [false, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.3, {
          rightElbow: [0.66, 0.53],
          rightWrist: [0.50, 0.44],
          rightFingers: fist,
        }),
        buildKeyframe(rest, 0.65, {
          rightElbow: [0.68, 0.54],
          rightWrist: [0.53, 0.46],
          rightFingers: fist,
        })
      );
      break;
    }

    case 'FOOD': {
      // Bundled fingertips tap mouth twice
      const flatO: FingerFlags = [true, false, false, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.28, {
          rightElbow: [0.67, 0.48],
          rightWrist: [0.52, 0.28],
          rightFingers: flatO,
        }),
        buildKeyframe(rest, 0.5, {
          rightElbow: [0.67, 0.46],
          rightWrist: [0.51, 0.25],
          rightFingers: flatO,
        }),
        buildKeyframe(rest, 0.72, {
          rightElbow: [0.67, 0.48],
          rightWrist: [0.52, 0.28],
          rightFingers: flatO,
        })
      );
      break;
    }

    case 'DOCTOR': {
      // Right fingertips tap left wrist pulse twice
      const flat: FingerFlags = [false, true, true, false, false];
      keyframes.push(
        buildKeyframe(rest, 0.3, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.46, 0.52],
          leftTilt: 1.3,
          rightElbow: [0.66, 0.52],
          rightWrist: [0.47, 0.48],
          rightFingers: flat,
        }),
        buildKeyframe(rest, 0.55, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.46, 0.52],
          leftTilt: 1.3,
          rightElbow: [0.66, 0.50],
          rightWrist: [0.47, 0.45],
          rightFingers: flat,
        })
      );
      break;
    }

    case 'STOP': {
      // Right hand chops down flat onto left palm
      keyframes.push(
        buildKeyframe(rest, 0.3, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.47, 0.52],
          leftTilt: 1.4,
          rightElbow: [0.67, 0.46],
          rightWrist: [0.50, 0.38],
        }),
        buildKeyframe(rest, 0.6, {
          leftElbow: [0.33, 0.54],
          leftWrist: [0.47, 0.52],
          leftTilt: 1.4,
          rightElbow: [0.67, 0.53],
          rightWrist: [0.48, 0.50],
        })
      );
      break;
    }

    default: {
      // Generic smooth sign trajectory
      const charCode = upper.charCodeAt(0) || 65;
      const offset = ((charCode % 10) - 5) * 0.025;
      keyframes.push(
        buildKeyframe(rest, 0.5, {
          rightElbow: [0.68, 0.49],
          rightWrist: [0.58 + offset, 0.38],
        })
      );
      break;
    }
  }

  // End with rest return
  keyframes.push({ ...rest, timeOffset: 1.0 });

  return {
    gloss: upper,
    durationMs,
    keyframes,
  };
}
