import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, Eye, EyeOff, Sun, RefreshCw } from 'lucide-react';
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { PharmacyHoldGater, StateMachineOutput, RecognitionState } from '../../recognition/PharmacyHoldGater';
import { classifySignGesture } from '../../recognition/spatialSignClassifier';
import { RawLandmark } from '../../workers/visionWorker';

interface PharmacyCameraViewProps {
  onConfirmSign: (gloss: string) => void;
  onStateUpdate: (stateOutput: StateMachineOutput) => void;
  isMirrored?: boolean;
}

export const PharmacyCameraView: React.FC<PharmacyCameraViewProps> = ({
  onConfirmSign,
  onStateUpdate,
  isMirrored = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [isLowLight, setIsLowLight] = useState<boolean>(false);

  // State machine output displayed over video
  const [machineState, setMachineState] = useState<StateMachineOutput>({
    state: 'NO_HAND',
    userMessage: 'Show your hand to the camera',
    confirmedGloss: null,
    shouldCommit: false,
    holdProgress: 0,
    confidence: 0,
    topGuesses: [],
  });

  const holdGaterRef = useRef<PharmacyHoldGater>(new PharmacyHoldGater(10, 6, 0.60));
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // 1. Initialize MediaPipe Live AI Landmarkers from local models/wasm
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipeVision() {
      try {
        const wasmUrls = [
          new URL('./wasm', window.location.href).href.replace(/\/$/, ''),
          './wasm',
          '/wasm',
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        ];

        let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;
        for (const url of wasmUrls) {
          try {
            vision = await FilesetResolver.forVisionTasks(url);
            if (vision) break;
          } catch {
            // try next url
          }
        }

        if (!vision) {
          throw new Error('Unable to resolve MediaPipe Vision WASM tasks bundle');
        }

        if (isCancelled) return;

        // Load Hand Landmarker
        const handModelPaths = [
          new URL('./models/hand_landmarker.task', window.location.href).href,
          './models/hand_landmarker.task',
          '/models/hand_landmarker.task',
        ];

        let handLm: HandLandmarker | null = null;
        for (const p of handModelPaths) {
          for (const delegate of ['GPU', 'CPU'] as const) {
            try {
              handLm = await HandLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: p, delegate },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: 0.25,
                minHandPresenceConfidence: 0.25,
                minTrackingConfidence: 0.25,
              });
              if (handLm) break;
            } catch {
              // try next
            }
          }
          if (handLm) break;
        }

        if (isCancelled) {
          if (handLm) handLm.close();
          return;
        }
        handLandmarkerRef.current = handLm;

        // Load Pose Landmarker
        const poseModelPaths = [
          new URL('./models/pose_landmarker_lite.task', window.location.href).href,
          './models/pose_landmarker_lite.task',
          '/models/pose_landmarker_lite.task',
        ];

        let poseLm: PoseLandmarker | null = null;
        for (const p of poseModelPaths) {
          for (const delegate of ['GPU', 'CPU'] as const) {
            try {
              poseLm = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: p, delegate },
                runningMode: 'VIDEO',
                minPoseDetectionConfidence: 0.25,
                minPosePresenceConfidence: 0.25,
                minTrackingConfidence: 0.25,
              });
              if (poseLm) break;
            } catch {
              // try next
            }
          }
          if (poseLm) break;
        }

        if (isCancelled) {
          if (poseLm) poseLm.close();
          return;
        }
        poseLandmarkerRef.current = poseLm;
      } catch (err: unknown) {
        console.warn('Vision models loading notice:', err);
      }
    }

    initMediaPipeVision();

    return () => {
      isCancelled = true;
      if (handLandmarkerRef.current) handLandmarkerRef.current.close();
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
    };
  }, []);

  // 2. Start Camera Feed
  const startCamera = useCallback(async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setHasPermission(true);
        };
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage('Camera access was denied or no camera device is available.');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // 3. Render and Recognition Loop
  useEffect(() => {
    let lastVideoTime = -1;
    let lastBrightnessCheck = 0;
    let lastDetectTime = 0;

    const cachedHands = {
      left: null as RawLandmark[] | null,
      right: null as RawLandmark[] | null,
      pose: null as RawLandmark[] | null,
      hasHands: false,
    };

    const drawHand = (ctx: CanvasRenderingContext2D, pts: RawLandmark[], color: string, w: number, h: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = color;

      // Connect finger chains
      const chains = [
        [0, 1, 2, 3, 4],       // Thumb
        [0, 5, 6, 7, 8],       // Index
        [9, 10, 11, 12],       // Middle
        [13, 14, 15, 16],      // Ring
        [0, 17, 18, 19, 20],   // Pinky
        [5, 9, 13, 17],        // Palm knuckle base
      ];

      chains.forEach((chain) => {
        ctx.beginPath();
        for (let i = 0; i < chain.length; i++) {
          const pt = pts[chain[i]];
          const sx = isMirrored ? (1 - pt.x) * w : pt.x * w;
          const sy = pt.y * h;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      });

      // Points
      pts.forEach((pt) => {
        const sx = isMirrored ? (1 - pt.x) * w : pt.x * w;
        const sy = pt.y * h;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      });
    };

    const renderLoop = () => {
      const now = performance.now();
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const w = canvas.width;
          const h = canvas.height;

          // Check brightness every 500ms
          if (now - lastBrightnessCheck > 500) {
            lastBrightnessCheck = now;
            try {
              const sampleCanvas = document.createElement('canvas');
              sampleCanvas.width = 16;
              sampleCanvas.height = 16;
              const sCtx = sampleCanvas.getContext('2d');
              if (sCtx) {
                sCtx.drawImage(video, 0, 0, 16, 16);
                const imgData = sCtx.getImageData(0, 0, 16, 16).data;
                let totalLuma = 0;
                const pixelCount = 16 * 16;
                for (let i = 0; i < imgData.length; i += 4) {
                  totalLuma += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
                }
                const avgLuma = totalLuma / pixelCount;
                setIsLowLight(avgLuma < 40);
              }
            } catch {
              // Ignore cross-origin canvas security if any
            }
          }

          const hl = handLandmarkerRef.current;
          const pl = poseLandmarkerRef.current;

          // Process detection and recognition ONLY ON NEW VIDEO FRAMES
          if (video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const frameTime = Math.max(Math.round(now), lastDetectTime + 1);
            lastDetectTime = frameTime;

            let rawLeftHand: RawLandmark[] | null = null;
            let rawRightHand: RawLandmark[] | null = null;
            let rawPose: RawLandmark[] | null = null;
            let hasAnyHand = false;

            if (hl) {
              try {
                const handRes = hl.detectForVideo(video, frameTime);
                if (handRes && handRes.landmarks && handRes.landmarks.length > 0) {
                  hasAnyHand = true;
                  if (handRes.landmarks.length >= 2) {
                    const h0 = handRes.landmarks[0];
                    const h1 = handRes.landmarks[1];
                    // Hand positions on screen
                    const x0 = isMirrored ? 1 - h0[0].x : h0[0].x;
                    const x1 = isMirrored ? 1 - h1[0].x : h1[0].x;
                    const leftLm = x0 < x1 ? h0 : h1;
                    const rightLm = x0 < x1 ? h1 : h0;
                    rawLeftHand = leftLm.map((p) => ({ x: p.x, y: p.y, z: p.z || 0 }));
                    rawRightHand = rightLm.map((p) => ({ x: p.x, y: p.y, z: p.z || 0 }));
                  } else {
                    // Single hand in view: assign to rightHand (standard dominant hand)
                    rawRightHand = handRes.landmarks[0].map((p) => ({ x: p.x, y: p.y, z: p.z || 0 }));
                    rawLeftHand = null;
                  }
                }
              } catch {
                // Drop frame safely
              }
            }

            if (pl) {
              try {
                const poseRes = pl.detectForVideo(video, frameTime);
                if (poseRes && poseRes.landmarks && poseRes.landmarks.length > 0) {
                  rawPose = poseRes.landmarks[0].map((p) => ({
                    x: p.x,
                    y: p.y,
                    z: p.z || 0,
                    visibility: p.visibility ?? 1.0,
                  }));
                }
              } catch {
                // Drop frame safely
              }
            }

            // Update persistent cached landmarks
            cachedHands.left = rawLeftHand;
            cachedHands.right = rawRightHand;
            cachedHands.pose = rawPose;
            cachedHands.hasHands = hasAnyHand;

            // Run spatial classifier & update PharmacyHoldGater state machine
            if (hasAnyHand) {
              const recog = classifySignGesture(rawLeftHand, rawRightHand, rawPose, !isMirrored);
              const gaterOutput = holdGaterRef.current.update(
                true,
                recog.candidateGloss,
                recog.confidence,
                recog.topCandidates.map((c) => c.gloss),
                now
              );

              setMachineState(gaterOutput);
              onStateUpdate(gaterOutput);

              if (gaterOutput.shouldCommit && gaterOutput.confirmedGloss) {
                onConfirmSign(gaterOutput.confirmedGloss);
              }
            } else {
              const gaterOutput = holdGaterRef.current.update(false, null, 0, [], now);
              setMachineState(gaterOutput);
              onStateUpdate(gaterOutput);
            }
          }

          // Smooth 60 FPS Landmark Drawing on Canvas
          if (showLandmarks && cachedHands.hasHands) {
            if (cachedHands.right) drawHand(ctx, cachedHands.right, '#0F766E', w, h);
            if (cachedHands.left) drawHand(ctx, cachedHands.left, '#0EA5E9', w, h);
          }
        }
      }

      animationFrameId.current = requestAnimationFrame(renderLoop);
    };

    animationFrameId.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [showLandmarks, isMirrored, onConfirmSign, onStateUpdate]);

  // Circular progress calculations for hold ring
  // Circumference = 2 * PI * r (r = 16px -> ~100.5px)
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - machineState.holdProgress * circumference;

  // State badge styling
  const getStateBadgeStyle = (state: RecognitionState) => {
    switch (state) {
      case 'CONFIRMED':
        return 'bg-emerald-600 text-white border-emerald-500 shadow-md';
      case 'UNSURE':
        return 'bg-amber-500 text-white border-amber-400 shadow-sm';
      case 'DETECTING':
        return 'bg-[#0F766E] text-white border-[#0D655E] shadow-sm';
      case 'NO_HAND':
      default:
        return 'bg-slate-900/85 text-slate-200 border-slate-700/50';
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Video Viewport Container */}
      <div className="relative w-full aspect-[4/3] max-h-[460px] bg-slate-900 rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm flex items-center justify-center">
        {/* Camera Feed or Permission Error */}
        {hasPermission === false ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-300 max-w-sm">
            <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Camera Unavailable</h3>
            <p className="text-sm text-slate-300 mb-4">{errorMessage || 'Please enable camera access in your settings.'}</p>
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F766E] text-white font-semibold text-sm hover:bg-[#0D655E] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Camera</span>
            </button>
          </div>
        ) : (
          <>
            {/* Live Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${isMirrored ? '-scale-x-100' : ''}`}
            />

            {/* Landmark Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            {/* Subtle Framing Guide */}
            <div className="absolute inset-6 pointer-events-none border border-white/20 rounded-xl">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#0F766E]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#0F766E]" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#0F766E]" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#0F766E]" />
              <div className="absolute bottom-2 inset-x-0 text-center text-[11px] font-medium text-white/70 tracking-wide">
                Keep your hand inside the frame
              </div>
            </div>

            {/* State Message with Circular Hold Ring at the Top */}
            <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-10 px-4">
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-full border backdrop-blur-md transition-all duration-200 ${getStateBadgeStyle(
                  machineState.state
                )}`}
              >
                {/* Circular Hold Progress Ring */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="opacity-25"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-75 text-white"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-bold">
                    {Math.round(machineState.holdProgress * 100)}%
                  </span>
                </div>

                <span className="text-sm font-semibold tracking-wide">
                  {machineState.userMessage}
                </span>
              </div>
            </div>

            {/* Low-Light Hint Notification */}
            {isLowLight && (
              <div className="absolute top-16 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/90 text-white text-xs font-medium backdrop-blur shadow">
                <Sun className="w-3.5 h-3.5" />
                <span>Move to brighter light</span>
              </div>
            )}

            {/* Camera Overlay Controls (Toggle Landmarks) */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
              <button
                type="button"
                onClick={() => setShowLandmarks((prev) => !prev)}
                title={showLandmarks ? 'Hide Landmarks' : 'Show Landmarks'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-medium border border-white/20 backdrop-blur transition-colors"
              >
                {showLandmarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showLandmarks ? 'Landmarks On' : 'Landmarks Off'}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Slim Confidence Bar Directly Underneath Camera */}
      <div className="w-full mt-2 px-1">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="font-medium">Detection Confidence</span>
          <span className="font-mono font-bold text-[#0F766E]">
            {Math.round(machineState.confidence * 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0F766E] transition-all duration-150 ease-out"
            style={{ width: `${Math.round(machineState.confidence * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
