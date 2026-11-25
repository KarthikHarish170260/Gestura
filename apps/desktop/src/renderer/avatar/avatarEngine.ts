/**
 * High-performance 60 fps Canvas 2D avatar skeletal rendering engine.
 * Decoupled from React rendering lifecycle with smoothstep spline interpolation.
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
  private totalClips = 0;
  private currentIndex = -1;
  private clipStartTime = 0;
  private playbackSpeed = 1.0;
  private isPaused = false;

  // Interpolated current frame
  private currentPose: AvatarKeyframe;
  private onGlossProgressCallback?: (gloss: string, index: number, total: number) => void;
  private onSequenceCompleteCallback?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Failed to acquire 2D canvas context');
    this.ctx = context;
    this.currentPose = createNeutralPose();
  }

  /** Replace active sequence and start playing from the first gloss immediately. */
  public setGlossSequence(glosses: string[]): void {
    this.queue = glosses.map((g) => getGlossClip(g));
    this.totalClips = this.queue.length;
    this.currentIndex = -1;
    this.currentClip = null;
    this.isPaused = false;
    if (this.queue.length > 0) {
      this.playNextClip();
    } else {
      this.currentPose = createNeutralPose();
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

  public onSequenceComplete(cb: () => void): void {
    this.onSequenceCompleteCallback = cb;
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
      this.currentIndex += 1;
      this.clipStartTime = performance.now();
      if (this.currentClip && this.onGlossProgressCallback) {
        this.onGlossProgressCallback(this.currentClip.gloss, this.currentIndex, this.totalClips);
      }
    } else {
      this.currentClip = null;
      this.currentPose = createNeutralPose();
      if (this.onSequenceCompleteCallback) {
        this.onSequenceCompleteCallback();
      }
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
      return;
    }

    const duration = this.currentClip.durationMs / this.playbackSpeed;
    const elapsed = now - this.clipStartTime;
    const t = Math.min(1.0, elapsed / duration);

    this.currentPose = this.interpolateClipKeyframes(this.currentClip.keyframes, t);

    if (t >= 1.0) {
      this.playNextClip();
    }
  }

  private interpolateClipKeyframes(keyframes: AvatarKeyframe[], t: number): AvatarKeyframe {
    if (keyframes.length === 0) return createNeutralPose();
    if (keyframes.length === 1) return keyframes[0];

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

    // Clean clinical slate-navy stage background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Subtle radial highlight behind signer
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.45, 20, width * 0.5, height * 0.45, width * 0.55);
    grad.addColorStop(0, 'rgba(20, 184, 166, 0.14)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const toPx = (normX: number, normY: number): [number, number] => [normX * width, normY * height];

    const pose = this.currentPose.pose;
    if (pose.length < 10) return;

    // Torso silhouette fill for clear body reference (forehead, chest, shoulders)
    const [lsX, lsY] = toPx(pose[1][0], pose[1][1]);
    const [rsX, rsY] = toPx(pose[2][0], pose[2][1]);
    const [lhX, lhY] = toPx(pose[7][0], pose[7][1]);
    const [rhX, rhY] = toPx(pose[8][0], pose[8][1]);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
    ctx.beginPath();
    ctx.moveTo(lsX, lsY);
    ctx.lineTo(rsX, rsY);
    ctx.lineTo(rhX, rhY);
    ctx.lineTo(lhX, lhY);
    ctx.closePath();
    ctx.fill();

    // Draw Head + subtle facial cues (eyes & chin line help read chin/forehead signs)
    const [noseX, noseY] = toPx(pose[0][0], pose[0][1]);
    const headR = width * 0.075;

    ctx.strokeStyle = '#2DD4BF';
    ctx.fillStyle = '#1E293B';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(noseX, noseY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eyes & calm smile
    ctx.fillStyle = '#99F6E4';
    ctx.beginPath();
    ctx.arc(noseX - headR * 0.34, noseY - headR * 0.14, 3, 0, Math.PI * 2);
    ctx.arc(noseX + headR * 0.34, noseY - headR * 0.14, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#5EEAD4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(noseX, noseY + headR * 0.18, headR * 0.32, 0.2, Math.PI - 0.2);
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

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 5;
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
    ctx.fillStyle = '#BAE6FD';
    for (let i = 0; i < pose.length; i++) {
      const [jx, jy] = toPx(pose[i][0], pose[i][1]);
      ctx.beginPath();
      ctx.arc(jx, jy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render Hands
    const drawHand = (handPts: number[][], boneColor: string, jointColor: string) => {
      if (handPts.length < 21) return;
      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 3;

      for (let f = 0; f < 5; f++) {
        const root = 0;
        const fStart = 1 + f * 4;

        const [wx, wy] = toPx(handPts[root][0], handPts[root][1]);
        const [bx, by] = toPx(handPts[fStart][0], handPts[fStart][1]);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(bx, by);
        ctx.stroke();

        for (let j = 0; j < 3; j++) {
          const [p1x, p1y] = toPx(handPts[fStart + j][0], handPts[fStart + j][1]);
          const [p2x, p2y] = toPx(handPts[fStart + j + 1][0], handPts[fStart + j + 1][1]);
          ctx.beginPath();
          ctx.moveTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = jointColor;
      for (const pt of handPts) {
        const [hx, hy] = toPx(pt[0], pt[1]);
        ctx.beginPath();
        ctx.arc(hx, hy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawHand(this.currentPose.leftHand, '#34D399', '#A7F3D0');
    drawHand(this.currentPose.rightHand, '#2DD4BF', '#99F6E4');
  }
}
