'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  Activity,
  Zap,
  FlipHorizontal,
  Eye,
  EyeOff,
  Hand,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Volume2,
  Send,
  Sparkles,
} from 'lucide-react';
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { matchBedsideSignSequence } from '../lib/bedsideOntology';
import {
  classifySignGesture,
  KinematicHoldGater,
  RawLandmark,
} from '../recognition/spatialSignClassifier';

interface BedsideVisionTrackerProps {
  onSequenceDetected?: (
    tokens: string[],
    intent: string,
    clinicalStatement: string,
    esiLevel: 1 | 2 | 3 | 4 | 5
  ) => void;
  onClearSequence?: () => void;
}

// MediaPipe 21 Hand Landmark Bones Connections
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

// Upper Body Pose Connections
const UPPER_POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
];

// 16 Categorized Sign Simulator Chips
const VOCABULARY_SIGN_CHIPS = [
  { gloss: 'HELLO', label: '👋 Hello', category: 'Greeting' },
  { gloss: 'THANK-YOU', label: '🙏 Thank You', category: 'Greeting' },
  { gloss: 'HELP', label: '🆘 Help Me', category: 'Emergency' },
  { gloss: 'EMERGENCY', label: '🚨 Emergency', category: 'Emergency' },
  { gloss: 'PAIN', label: '⚡ Pain', category: 'Symptom' },
  { gloss: 'CHEST', label: '🫀 Chest', category: 'Anatomy' },
  { gloss: 'STOMACH', label: '🤢 Stomach', category: 'Anatomy' },
  { gloss: 'HEAD', label: '🧠 Head', category: 'Anatomy' },
  { gloss: 'BREATHE', label: '🫁 Breathe', category: 'Symptom' },
  { gloss: 'DIFFICULT', label: '⚠️ Difficult', category: 'Symptom' },
  { gloss: 'WATER', label: '💧 Water', category: 'Need' },
  { gloss: 'MEDICINE', label: '💊 Medicine', category: 'Medical' },
  { gloss: 'DOCTOR', label: '👨‍⚕️ Doctor', category: 'Medical' },
  { gloss: 'NURSE', label: '👩‍⚕️ Nurse', category: 'Medical' },
  { gloss: 'BATHROOM', label: '🚽 Restroom', category: 'Need' },
  { gloss: 'ALLERGY', label: '🛡️ Allergy', category: 'Medical' },
];

export const BedsideVisionTracker: React.FC<BedsideVisionTrackerProps> = ({
  onSequenceDetected,
  onClearSequence,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // MediaPipe AI models ref
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

  // States
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(30);
  const [latencyMs, setLatencyMs] = useState<number>(6);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [handsCount, setHandsCount] = useState<number>(0);
  const [poseLocked, setPoseLocked] = useState<boolean>(false);

  // Sign Translation States
  const [detectedGestureTag, setDetectedGestureTag] = useState<string>('SEARCHING FOR SIGN...');
  const [topCandidates, setTopCandidates] = useState<{ gloss: string; score: number }[]>([
    { gloss: 'SEARCHING', score: 0.95 },
    { gloss: 'HELLO', score: 0.03 },
    { gloss: 'HELP', score: 0.02 },
  ]);
  const [sequenceTokens, setSequenceTokens] = useState<string[]>([]);
  const [translatedSentence, setTranslatedSentence] = useState<string>('');
  const [lastCommitNotification, setLastCommitNotification] = useState<string | null>(null);

  // Hold Gater
  const holdGaterRef = useRef<KinematicHoldGater>(new KinematicHoldGater(380, 10, 0.70));
  const lastCommitTimeRef = useRef<number>(0);
  const lastCommittedGlossRef = useRef<string>('');

  // Natural Language Translation helper from Gloss tokens
  const translateGlossesToSentence = useCallback((tokens: string[]): { sentence: string; esi: 1 | 2 | 3 | 4 | 5 } => {
    if (tokens.length === 0) return { sentence: '', esi: 4 };

    // Check ontology match first
    const match = matchBedsideSignSequence(tokens);
    if (match) {
      return { sentence: match.clinicalStatement, esi: match.esiLevel };
    }

    // Heuristic multi-gloss rules
    const tokenSet = new Set(tokens);

    if (tokenSet.has('PAIN') && tokenSet.has('CHEST')) {
      return { sentence: 'Patient reports acute chest pain; urgent evaluation needed.', esi: 2 };
    }
    if (tokenSet.has('PAIN') && tokenSet.has('STOMACH')) {
      return { sentence: 'Patient reports severe abdominal/stomach pain.', esi: 3 };
    }
    if (tokenSet.has('PAIN') && tokenSet.has('HEAD')) {
      return { sentence: 'Patient reports severe throbbing head pain/headache.', esi: 3 };
    }
    if (tokenSet.has('BREATHE') && tokenSet.has('DIFFICULT')) {
      return { sentence: 'Patient experiencing severe shortness of breath.', esi: 1 };
    }
    if (tokenSet.has('NEED') && tokenSet.has('WATER') || tokenSet.has('WATER')) {
      return { sentence: 'Patient requesting drinking water assistance.', esi: 4 };
    }
    if (tokenSet.has('NEED') && tokenSet.has('MEDICINE') || tokenSet.has('MEDICINE')) {
      return { sentence: 'Patient requesting scheduled/pain relief medication.', esi: 3 };
    }
    if (tokenSet.has('BATHROOM')) {
      return { sentence: 'Patient requesting assistance to the restroom.', esi: 3 };
    }
    if (tokenSet.has('HELP') || tokenSet.has('EMERGENCY')) {
      return { sentence: 'Emergency alert: Patient requesting immediate medical assistance!', esi: 1 };
    }
    if (tokenSet.has('HELLO')) {
      return { sentence: 'Hello, good morning! Patient is greeting staff.', esi: 5 };
    }
    if (tokenSet.has('THANK-YOU')) {
      return { sentence: 'Thank you very much for your care and help.', esi: 5 };
    }

    // Fallback: join glosses into readable sentence
    return {
      sentence: `Patient signed: "${tokens.join(' ')}". Immediate attention requested.`,
      esi: 3,
    };
  }, []);

  // Text to Speech playback
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window && text.trim()) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Commit Gloss Token
  const appendGlossToken = useCallback(
    (gloss: string) => {
      const now = Date.now();
      if (now - lastCommitTimeRef.current < 750 && lastCommittedGlossRef.current === gloss) {
        return; // debounce duplicate bounce
      }
      lastCommitTimeRef.current = now;
      lastCommittedGlossRef.current = gloss;

      setSequenceTokens((prev) => {
        const next = [...prev, gloss].slice(-6); // Keep last 6 tokens
        const translation = translateGlossesToSentence(next);
        setTranslatedSentence(translation.sentence);

        if (onSequenceDetected) {
          onSequenceDetected(next, `Sign: ${gloss}`, translation.sentence, translation.esi);
        }

        setLastCommitNotification(`Captured Sign: [${gloss}]`);
        setTimeout(() => setLastCommitNotification(null), 2500);

        return next;
      });
    },
    [translateGlossesToSentence, onSequenceDetected]
  );

  // Clear Sequence Buffer
  const handleClear = useCallback(() => {
    setSequenceTokens([]);
    setTranslatedSentence('');
    setLastCommitNotification(null);
    onClearSequence?.();
  }, [onClearSequence]);

  // Transmit Sentence Now
  const handleTransmit = useCallback(() => {
    if (translatedSentence && onSequenceDetected) {
      const translation = translateGlossesToSentence(sequenceTokens);
      onSequenceDetected(sequenceTokens, 'Sign Language Translation', translation.sentence, translation.esi);
      speakText(translatedSentence);
      setLastCommitNotification('Sentence Spoken & Transmitted to Nurse Station!');
      setTimeout(() => setLastCommitNotification(null), 3000);
    }
  }, [translatedSentence, onSequenceDetected, sequenceTokens, translateGlossesToSentence, speakText]);

  // 1. Initialize MediaPipe Live Vision Models
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipeVision() {
      try {
        const wasmUrls = [
          '/wasm',
          new URL('./wasm', window.location.href).href.replace(/\/$/, ''),
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',
        ];

        let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;
        for (const url of wasmUrls) {
          try {
            vision = await FilesetResolver.forVisionTasks(url);
            if (vision) break;
          } catch {
            // Next
          }
        }

        if (!vision || isCancelled) return;

        // Load Hand Landmarker
        const handModelPaths = [
          '/models/hand_landmarker.task',
          new URL('./models/hand_landmarker.task', window.location.href).href,
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
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
              // Next
            }
          }
          if (handLm) break;
        }

        if (isCancelled) {
          handLm?.close();
          return;
        }
        handLandmarkerRef.current = handLm;

        // Load Pose Landmarker
        const poseModelPaths = [
          '/models/pose_landmarker_lite.task',
          new URL('./models/pose_landmarker_lite.task', window.location.href).href,
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
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
              // Next
            }
          }
          if (poseLm) break;
        }

        if (isCancelled) {
          poseLm?.close();
          return;
        }
        poseLandmarkerRef.current = poseLm;
      } catch (err) {
        console.warn('MediaPipe initialization fallback to visual tracking:', err);
      }
    }

    initMediaPipeVision();

    return () => {
      isCancelled = true;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, []);

  // 2. Start Camera Feed
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;

    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
            audio: false,
          });

          if (isMounted && videoRef.current) {
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setHasCamera(true);
            setCameraError(null);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setHasCamera(false);
          setCameraError(err instanceof Error ? err.message : 'Camera access denied');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // 3. Main Recognition & Canvas Landmark Rendering Loop
  useEffect(() => {
    let animId: number;
    let frameCount = 0;
    let fpsTimer = performance.now();

    const loop = (timestamp: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const w = canvas.width;
          const h = canvas.height;

          ctx.save();
          if (isMirrored) {
            ctx.scale(-1, 1);
            ctx.translate(-w, 0);
          }

          let rawLeftHand: RawLandmark[] | null = null;
          let rawRightHand: RawLandmark[] | null = null;
          let rawPose: RawLandmark[] | null = null;

          const startDetect = performance.now();

          // A. Hand Landmark Detection
          if (handLandmarkerRef.current) {
            try {
              const handResults = handLandmarkerRef.current.detectForVideo(video, timestamp);
              if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
                setHandsCount(handResults.landmarks.length);

                for (let i = 0; i < handResults.landmarks.length; i++) {
                  const handLms = handResults.landmarks[i];
                  const handedness = handResults.handednesses?.[i]?.[0]?.categoryName;

                  const rawLms: RawLandmark[] = handLms.map((lm) => ({
                    x: lm.x,
                    y: lm.y,
                    z: lm.z ?? 0,
                    visibility: lm.visibility,
                  }));

                  if (handedness === 'Left') {
                    rawLeftHand = rawLms;
                  } else {
                    rawRightHand = rawLms;
                  }

                  // Render Hand Skeleton
                  if (showOverlay) {
                    ctx.strokeStyle = '#06B6D4'; // Vibrant Cyan
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
                      const p1 = handLms[startIdx];
                      const p2 = handLms[endIdx];
                      if (p1 && p2) {
                        ctx.beginPath();
                        ctx.moveTo(p1.x * w, p1.y * h);
                        ctx.lineTo(p2.x * w, p2.y * h);
                        ctx.stroke();
                      }
                    }

                    for (let j = 0; j < handLms.length; j++) {
                      const pt = handLms[j];
                      const isTip = j === 4 || j === 8 || j === 12 || j === 16 || j === 20;

                      ctx.fillStyle = isTip ? '#22D3EE' : '#10B981';
                      ctx.beginPath();
                      ctx.arc(pt.x * w, pt.y * h, isTip ? 5 : 3.5, 0, Math.PI * 2);
                      ctx.fill();

                      ctx.strokeStyle = '#FFFFFF';
                      ctx.lineWidth = 1;
                      ctx.stroke();
                    }
                  }
                }
              } else {
                setHandsCount(0);
              }
            } catch {
              // Skip
            }
          }

          // B. Pose Landmark Detection
          if (poseLandmarkerRef.current) {
            try {
              const poseResults = poseLandmarkerRef.current.detectForVideo(video, timestamp);
              if (poseResults && poseResults.landmarks && poseResults.landmarks.length > 0) {
                setPoseLocked(true);
                const poseLms = poseResults.landmarks[0];
                rawPose = poseLms.map((lm) => ({
                  x: lm.x,
                  y: lm.y,
                  z: lm.z ?? 0,
                  visibility: lm.visibility,
                }));

                if (showOverlay) {
                  ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
                  ctx.lineWidth = 2;

                  for (const [startIdx, endIdx] of UPPER_POSE_CONNECTIONS) {
                    const p1 = poseLms[startIdx];
                    const p2 = poseLms[endIdx];
                    if (p1 && p2 && (p1.visibility ?? 1) > 0.4 && (p2.visibility ?? 1) > 0.4) {
                      ctx.beginPath();
                      ctx.moveTo(p1.x * w, p1.y * h);
                      ctx.lineTo(p2.x * w, p2.y * h);
                      ctx.stroke();
                    }
                  }
                }
              } else {
                setPoseLocked(false);
              }
            } catch {
              // Skip
            }
          }

          ctx.restore();

          // C. Corner Brackets
          if (showOverlay) {
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2;
            const bLen = 24;
            const pad = 16;

            ctx.beginPath();
            ctx.moveTo(pad, pad + bLen);
            ctx.lineTo(pad, pad);
            ctx.lineTo(pad + bLen, pad);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(w - pad - bLen, pad);
            ctx.lineTo(w - pad, pad);
            ctx.lineTo(w - pad, pad + bLen);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pad, h - pad - bLen);
            ctx.lineTo(pad, h - pad);
            ctx.lineTo(pad + bLen, h - pad);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(w - pad - bLen, h - pad);
            ctx.lineTo(w - pad, h - pad);
            ctx.lineTo(w - pad, h - pad - bLen);
            ctx.stroke();
          }

          const detectEnd = performance.now();
          setLatencyMs(Math.round(detectEnd - startDetect));

          // D. Classify Sign Gestures & Gate Hold Commit
          const recognition = classifySignGesture(rawLeftHand, rawRightHand, rawPose, isMirrored);

          setDetectedGestureTag(recognition.gestureTag);
          setTopCandidates(recognition.topCandidates);

          const gated = holdGaterRef.current.update(
            recognition.candidateGloss,
            recognition.confidence,
            recognition.isResting,
            timestamp
          );

          if (gated.shouldCommit && gated.committedGloss) {
            appendGlossToken(gated.committedGloss);
          }
        }
      }

      frameCount++;
      const now = performance.now();
      if (now - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [showOverlay, isMirrored, appendGlossToken]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 border-b border-slate-800 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-mono text-xs font-bold">
            <Hand className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
            <span>AI SIGN-TO-TEXT CONVERTER</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
              handsCount > 0
                ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {handsCount > 0 ? `✋ ${handsCount} HAND(S) TRACKED` : 'SEARCHING'}
          </span>
          <span
            className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
              poseLocked
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            POSE: {poseLocked ? 'LOCKED' : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mr-2">
            <span className="flex items-center gap-1 text-emerald-400">
              <Zap className="h-3 w-3" /> {fps} FPS
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-sky-400">{latencyMs}ms</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMirrored((prev) => !prev)}
            title="Mirror Camera View"
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
              isMirrored
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowOverlay((prev) => !prev)}
            title="Toggle Skeleton Overlay"
            className={`p-1.5 rounded-lg border text-xs font-mono transition-colors ${
              showOverlay
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Camera Viewport with Top Candidates HUD */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[220px]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform ${
            isMirrored ? 'scale-x-[-1]' : ''
          }`}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {!hasCamera && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-10">
            <Camera className="h-10 w-10 text-sky-400 mb-2 animate-bounce" />
            <h3 className="text-sm font-bold text-white mb-1">Webcam Feed Initializing</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-3">
              {cameraError || 'Hold your hands in camera frame to translate sign language in real time.'}
            </p>
          </div>
        )}

        {/* Top Candidates Floating HUD (Top Right) */}
        <div className="absolute top-3 right-3 bg-slate-950/85 border border-slate-800 backdrop-blur-md rounded-xl p-2.5 shadow-2xl w-44 pointer-events-none z-10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Top Candidates
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div className="space-y-1.5">
            {topCandidates.slice(0, 3).map((cand, idx) => {
              const pct = Math.round(cand.score * 100);
              const isTop = idx === 0 && cand.score > 0.4;
              return (
                <div key={cand.gloss} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={isTop ? 'font-bold text-cyan-300' : 'text-slate-300'}>
                      {cand.gloss}
                    </span>
                    <span className={isTop ? 'font-bold text-cyan-400' : 'text-slate-400'}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 rounded-full ${
                        isTop ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Detected Sign Floating Badge (Bottom Left) */}
        <div className="absolute bottom-3 left-3 bg-slate-950/85 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg z-10">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              handsCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-xs font-mono font-extrabold text-white tracking-wide">
            {detectedGestureTag}
          </span>
        </div>

        {/* Notification Toast */}
        {lastCommitNotification && (
          <div className="absolute top-3 left-3 bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-xl animate-in fade-in z-20">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{lastCommitNotification}</span>
          </div>
        )}
      </div>

      {/* Live Sign Language Sequence Ribbon & Translation */}
      <div className="bg-slate-950 border-t border-slate-800 p-3 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-mono font-bold text-slate-300">
            LIVE SIGN LANGUAGE SEQUENCE BUFFER:
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Gloss Chips Ribbon */}
        <div className="min-h-[40px] bg-slate-900 border border-slate-800 rounded-xl p-2 flex items-center gap-2 flex-wrap mb-2">
          {sequenceTokens.length === 0 ? (
            <span className="text-xs text-slate-500 font-mono italic">
              Sign in camera frame or tap sign chips below to build sentence...
            </span>
          ) : (
            sequenceTokens.map((tok, i) => (
              <div
                key={`${tok}-${i}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-950 border border-sky-500 text-sky-200 text-xs font-mono font-extrabold shadow-sm animate-in fade-in"
              >
                <span>[{tok}]</span>
                {i < sequenceTokens.length - 1 && (
                  <span className="text-sky-400 font-bold">&rarr;</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Translated English Clinical Sentence Box */}
        {translatedSentence && (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-sky-950/80 to-slate-900 border border-sky-600/80 flex items-center justify-between gap-3 shadow-md animate-in fade-in">
            <div className="flex-1">
              <span className="text-[10px] font-mono text-sky-400 uppercase font-bold block mb-0.5">
                Translated English Sentence:
              </span>
              <p className="text-xs font-bold text-white tracking-wide">
                &ldquo;{translatedSentence}&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => speakText(translatedSentence)}
                title="Speak translated sentence aloud"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Speak</span>
              </button>
              <button
                type="button"
                onClick={handleTransmit}
                title="Transmit to Nurse Station"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Sign Simulator Chips */}
      <div className="bg-slate-950/95 border-t border-slate-800/80 px-3 py-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Quick Sign Simulator Chips (Tap to Translate)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">1-Click Sign Input</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
          {VOCABULARY_SIGN_CHIPS.map((chip) => (
            <button
              key={chip.gloss}
              type="button"
              onClick={() => appendGlossToken(chip.gloss)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-sky-600 hover:text-white border border-slate-700 text-slate-200 text-xs font-mono font-bold transition-all whitespace-nowrap active:scale-95 shadow-sm"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
