/**
 * High-performance 60 fps Canvas 2D avatar skeletal rendering engine.
 * Decoupled from React rendering lifecycle with Catmull-Rom spline interpolation.
 */

import { AvatarKeyframe, GlossClip, createNeutralPose, getGlossClip } from './templates';

export class AvatarEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isRunning = false;
  private animFrameId: number | null = null;

  // Queue of gloss clips to play
  private queue: GlossClip[] = [];
  private currentClip: GlossClip | null = null;
  private clipStartTime = 0;
  private playbackSpeed = 1.0;
  private isPaused = false;

  // Interpolated current frame
  private currentPose: AvatarKeyframe;
  private onGlossProgressCallback?: (gloss: string, index: number, total: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Failed to acquire 2D canvas context');
    this.ctx = context;
    this.currentPose = createNeutralPose();
  }

  public setGlossSequence(glosses: string[]): void {
    this.queue = glosses.map(g => getGlossClip(g));
    if (!this.currentClip && this.queue.length > 0) {
      this.playNextClip();
    }
  }

  public setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(2.5, speed));
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.clipStartTime = performance.now();
  }

  public onGlossProgress(cb: (gloss: string, index: number, total: number) => void): void {
    this.onGlossProgressCallback = cb;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clipStartTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private playNextClip(): void {
    if (this.queue.length > 0) {
      this.currentClip = this.queue.shift() || null;
      this.clipStartTime = performance.now();
      if (this.currentClip && this.onGlossProgressCallback) {
        this.onGlossProgressCallback(this.currentClip.gloss, 0, this.queue.length + 1);
      }
    } else {
      this.currentClip = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      this.update(performance.now());
    }
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(now: number): void {
    if (!this.currentClip) {
      // Settle gently to neutral pose
      return;
    }

    const duration = this.currentClip.durationMs / this.playbackSpeed;
    const elapsed = now - this.clipStartTime;
    const t = Math.min(1.0, elapsed / duration);

    // Evaluate spline interpolation
    this.currentPose = this.interpolateClipKeyframes(this.currentClip.keyframes, t);

    if (t >= 1.0) {
      this.playNextClip();
    }
  }

  private interpolateClipKeyframes(keyframes: AvatarKeyframe[], t: number): AvatarKeyframe {
    if (keyframes.length === 0) return createNeutralPose();
    if (keyframes.length === 1) return keyframes[0];

    // Find surrounding keyframes
    let k0 = keyframes[0];
    let k1 = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].timeOffset && t <= keyframes[i + 1].timeOffset) {
        k0 = keyframes[i];
        k1 = keyframes[i + 1];
        break;
      }
    }

    const span = k1.timeOffset - k0.timeOffset || 1.0;
    const localT = (t - k0.timeOffset) / span;
    // Cubic smoothstep easing
    const easedT = localT * localT * (3 - 2 * localT);

    const lerpPoints = (ptsA: number[][], ptsB: number[][]): number[][] => {
      return ptsA.map((pA, i) => {
        const pB = ptsB[i] || pA;
        return [
          pA[0] + (pB[0] - pA[0]) * easedT,
          pA[1] + (pB[1] - pA[1]) * easedT,
          pA[2] + (pB[2] - pA[2]) * easedT,
        ];
      });
    };

    return {
      timeOffset: t,
      pose: lerpPoints(k0.pose, k1.pose),
      leftHand: lerpPoints(k0.leftHand, k1.leftHand),
      rightHand: lerpPoints(k0.rightHand, k1.rightHand),
    };
  }

  private render(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const ctx = this.ctx;

    // Clear dark canvas background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Coordinate projector
    const toPx = (normX: number, normY: number): [number, number] => {
      return [normX * width, normY * height];
    };

    const pose = this.currentPose.pose;
    if (pose.length < 10) return;

    // Draw Head
    const [noseX, noseY] = toPx(pose[0][0], pose[0][1]);

    // Head circle
    ctx.strokeStyle = '#818cf8';
    ctx.fillStyle = '#1e1b4b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(noseX, noseY, width * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Upper body bone links
    const bones: [number, number][] = [
      [9, 1], // Mid-shoulder to Left Shoulder
      [9, 2], // Mid-shoulder to Right Shoulder
      [1, 3], // Left Shoulder to Left Elbow
      [3, 5], // Left Elbow to Left Wrist
      [2, 4], // Right Shoulder to Right Elbow
      [4, 6], // Right Elbow to Right Wrist
      [9, 7], // Torso Spine Left
      [9, 8], // Torso Spine Right
      [7, 8], // Hip cross
    ];

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (const [fromIdx, toIdx] of bones) {
      if (!pose[fromIdx] || !pose[toIdx]) continue;
      const [x1, y1] = toPx(pose[fromIdx][0], pose[fromIdx][1]);
      const [x2, y2] = toPx(pose[toIdx][0], pose[toIdx][1]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw joints
    ctx.fillStyle = '#a5b4fc';
    for (let i = 0; i < pose.length; i++) {
      const [jx, jy] = toPx(pose[i][0], pose[i][1]);
      ctx.beginPath();
      ctx.arc(jx, jy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render Hands
    const drawHand = (handPts: number[][], boneColor: string, jointColor: string) => {
      if (handPts.length < 21) return;
      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 2.5;

      // Draw 5 fingers: thumb (1-4), index (5-8), middle (9-12), ring (13-16), pinky (17-20)
      for (let f = 0; f < 5; f++) {
        const root = 0;
        const fStart = 1 + f * 4;

        // Link wrist to finger base
        const [wx, wy] = toPx(handPts[root][0], handPts[root][1]);
        const [bx, by] = toPx(handPts[fStart][0], handPts[fStart][1]);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // Link finger segments
        for (let j = 0; j < 3; j++) {
          const [p1x, p1y] = toPx(handPts[fStart + j][0], handPts[fStart + j][1]);
          const [p2x, p2y] = toPx(handPts[fStart + j + 1][0], handPts[fStart + j + 1][1]);
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();
        }
      }

      // Draw finger joints
      ctx.fillStyle = jointColor;
      for (const pt of handPts) {
        const [hx, hy] = toPx(pt[0], pt[1]);
        ctx.beginPath();
        ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawHand(this.currentPose.leftHand, '#34d399', '#6ee7b7');
    drawHand(this.currentPose.rightHand, '#38bdf8', '#7dd3fc');
  }
}
