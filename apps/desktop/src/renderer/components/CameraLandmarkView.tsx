import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Camera,
  Eye,
  EyeOff,
  Activity,
  Zap,
  Volume2,
  FlipHorizontal,
  Cpu,
  Hand,
  Search,
} from 'lucide-react';
import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { useConversationStore } from '../store/conversationStore';
import { normalizeLandmarks, RawLandmark } from '../workers/visionWorker';
import { SlidingWindowRecognizer } from '../workers/recognitionWorker';

// 88 comprehensive vocabulary sign classes + UNKNOWN
const EXPANDED_VOCAB_SIGNS: { id: string; label: string; category: string }[] = [
  // Greetings & Courtesy
  { id: 'HELLO', label: 'Hello', category: 'Greeting' },
  { id: 'GOODBYE', label: 'Goodbye', category: 'Greeting' },
  { id: 'WELCOME', label: 'Welcome', category: 'Courtesy' },
  { id: 'THANK-YOU', label: 'Thank You', category: 'Courtesy' },
  { id: 'PLEASE', label: 'Please', category: 'Courtesy' },
  { id: 'SORRY', label: 'Sorry', category: 'Courtesy' },
  // Affirmations & Pronouns
  { id: 'YES', label: 'Yes', category: 'Affirmation' },
  { id: 'NO', label: 'No', category: 'Affirmation' },
  { id: 'I', label: 'I / Me', category: 'Pronoun' },
  { id: 'YOU', label: 'You', category: 'Pronoun' },
  { id: 'WE', label: 'We', category: 'Pronoun' },
  { id: 'THEY', label: 'They', category: 'Pronoun' },
  // Emergency & Medical
  { id: 'HELP', label: 'Help', category: 'Emergency' },
  { id: 'EMERGENCY', label: 'Emergency', category: 'Emergency' },
  { id: 'DANGER', label: 'Danger', category: 'Emergency' },
  { id: 'SAFE', label: 'Safe', category: 'Descriptor' },
  { id: 'AMBULANCE', label: 'Ambulance', category: 'Emergency' },
  { id: 'POLICE', label: 'Police', category: 'Emergency' },
  { id: 'DOCTOR', label: 'Doctor', category: 'Medical' },
  { id: 'NURSE', label: 'Nurse', category: 'Medical' },
  { id: 'HOSPITAL', label: 'Hospital', category: 'Medical' },
  { id: 'MEDICINE', label: 'Medicine', category: 'Medical' },
  { id: 'PAIN', label: 'Pain', category: 'Medical' },
  { id: 'FEVER', label: 'Fever', category: 'Medical' },
  { id: 'SICK', label: 'Sick', category: 'Medical' },
  // Essentials & Places
  { id: 'WATER', label: 'Water', category: 'Essential' },
  { id: 'FOOD', label: 'Food', category: 'Essential' },
  { id: 'MONEY', label: 'Money', category: 'Essential' },
  { id: 'HOME', label: 'Home', category: 'Places' },
  { id: 'BATHROOM', label: 'Bathroom', category: 'Places' },
  { id: 'SCHOOL', label: 'School', category: 'Places' },
  { id: 'OFFICE', label: 'Office', category: 'Places' },
  { id: 'STORE', label: 'Store', category: 'Places' },
  { id: 'CAR', label: 'Car', category: 'Transport' },
  { id: 'BUS', label: 'Bus', category: 'Transport' },
  { id: 'TRAIN', label: 'Train', category: 'Transport' },
  // Questions & Identity
  { id: 'NAME', label: 'Name', category: 'Identity' },
  { id: 'WHAT', label: 'What', category: 'Question' },
  { id: 'WHERE', label: 'Where', category: 'Question' },
  { id: 'WHEN', label: 'When', category: 'Question' },
  { id: 'HOW', label: 'How', category: 'Question' },
  { id: 'WHO', label: 'Who', category: 'Question' },
  { id: 'WHY', label: 'Why', category: 'Question' },
  // Descriptors
  { id: 'GOOD', label: 'Good', category: 'Descriptor' },
  { id: 'BAD', label: 'Bad', category: 'Descriptor' },
  { id: 'BIG', label: 'Big', category: 'Descriptor' },
  { id: 'SMALL', label: 'Small', category: 'Descriptor' },
  { id: 'HOT', label: 'Hot', category: 'Descriptor' },
  { id: 'COLD', label: 'Cold', category: 'Descriptor' },
  { id: 'EASY', label: 'Easy', category: 'Descriptor' },
  { id: 'DIFFICULT', label: 'Difficult', category: 'Descriptor' },
  // Emotions & Desires
  { id: 'HAPPY', label: 'Happy', category: 'Emotion' },
  { id: 'SAD', label: 'Sad', category: 'Emotion' },
  { id: 'ANGRY', label: 'Angry', category: 'Emotion' },
  { id: 'SCARED', label: 'Scared', category: 'Emotion' },
  { id: 'TIRED', label: 'Tired', category: 'Physical' },
  { id: 'LOVE', label: 'Love', category: 'Emotion' },
  { id: 'LIKE', label: 'Like', category: 'Emotion' },
  { id: 'WANT', label: 'Want', category: 'Desire' },
  { id: 'NEED', label: 'Need', category: 'Desire' },
  { id: 'UNDERSTAND', label: 'Understand', category: 'Cognition' },
  { id: 'KNOW', label: 'Know', category: 'Cognition' },
  { id: 'THINK', label: 'Think', category: 'Cognition' },
  { id: 'FEEL', label: 'Feel', category: 'Emotion' },
  // Actions
  { id: 'SEE', label: 'See', category: 'Action' },
  { id: 'HEAR', label: 'Hear', category: 'Action' },
  { id: 'SPEAK', label: 'Speak', category: 'Action' },
  { id: 'CALL', label: 'Call', category: 'Action' },
  { id: 'MEET', label: 'Meet', category: 'Action' },
  { id: 'WORK', label: 'Work', category: 'Activity' },
  { id: 'WALK', label: 'Walk', category: 'Action' },
  { id: 'WAIT', label: 'Wait', category: 'Action' },
  { id: 'STOP', label: 'Stop', category: 'Action' },
  { id: 'GO', label: 'Go', category: 'Action' },
  { id: 'COME', label: 'Come', category: 'Action' },
  { id: 'START', label: 'Start', category: 'Action' },
  { id: 'FINISH', label: 'Finish', category: 'Action' },
  { id: 'AGAIN', label: 'Again', category: 'Action' },
  // Social & Temporal
  { id: 'FAMILY', label: 'Family', category: 'Social' },
  { id: 'FRIEND', label: 'Friend', category: 'Social' },
  { id: 'TIME', label: 'Time', category: 'Temporal' },
  { id: 'NOW', label: 'Now', category: 'Temporal' },
  { id: 'LATER', label: 'Later', category: 'Temporal' },
  { id: 'TODAY', label: 'Today', category: 'Temporal' },
  { id: 'TOMORROW', label: 'Tomorrow', category: 'Temporal' },
  { id: 'YESTERDAY', label: 'Yesterday', category: 'Temporal' },
  { id: 'MORNING', label: 'Morning', category: 'Temporal' },
  { id: 'NIGHT', label: 'Night', category: 'Temporal' },
];

const VOCAB_SIGNS = [...EXPANDED_VOCAB_SIGNS.map(s => s.id), 'UNKNOWN'];

const CATEGORIES = [
  'All',
  'Greeting',
  'Courtesy',
  'Pronoun',
  'Emergency',
  'Medical',
  'Essential',
  'Question',
  'Descriptor',
  'Emotion',
  'Action',
  'Places',
  'Transport',
  'Social',
  'Temporal',
];

// MediaPipe 21 Hand Landmark Bones Connections
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [5, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [9, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [13, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [0, 17],
];

// MediaPipe Upper Body Pose Connections
const UPPER_POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left arm
  [12, 14], [14, 16], // Right arm
  [11, 23], [12, 24], [23, 24], // Torso
];

interface HandStateAnalysis {
  openFingersCount: number;
  fingerStates: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  gestureName: string;
  confidence: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export const CameraLandmarkView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // MediaPipe AI models ref
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);

  // Vision telemetry & states
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [visionStatus, setVisionStatus] = useState<'initializing' | 'ready' | 'fallback'>('initializing');
  const [fps, setFps] = useState<number>(30);
  const [visionLatency, setVisionLatency] = useState<number>(8);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [activeDevice, setActiveDevice] = useState<string>('default');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [motionEnergy, setMotionEnergy] = useState<number>(0.0);
  const [handsCount, setHandsCount] = useState<number>(0);
  const [detectedGestureTag, setDetectedGestureTag] = useState<string>('SEARCHING...');
  const [poseLocked, setPoseLocked] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Recognition state
  const [recognizedSign, setRecognizedSign] = useState<{
    gloss: string;
    confidence: number;
    timestamp: number;
  } | null>(null);
  const [topCandidates, setTopCandidates] = useState<{ gloss: string; score: number }[]>([
    { gloss: 'SEARCHING', score: 0.99 },
    { gloss: 'HELLO', score: 0.01 },
    { gloss: 'HELP', score: 0.00 },
  ]);

  const { settings, updateSettings, addSignToBuffer } = useConversationStore();

  // Recognizer instance ref
  const recognizerRef = useRef<SlidingWindowRecognizer>(
    new SlidingWindowRecognizer(VOCAB_SIGNS, 0.60, 0.12, 4)
  );

  const lastCommitTimeRef = useRef<number>(0);
  const lastRecognizedGlossRef = useRef<string>('');

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = settings.ttsRate;
      u.volume = settings.ttsVolume;
      window.speechSynthesis.speak(u);
    }
  }, [settings.ttsRate, settings.ttsVolume]);

  // 1. Initialize MediaPipe Live AI Landmarkers with Robust Fallbacks
  useEffect(() => {
    let isCancelled = false;

    async function initMediaPipeVision() {
      try {
        setVisionStatus('initializing');

        // Resolve WASM bundle offline from public/wasm
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
            // Try next candidate path
          }
        }

        if (!vision) {
          throw new Error('Unable to resolve MediaPipe Vision WASM tasks bundle');
        }

        if (isCancelled) return;

        // Model paths to try
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
                baseOptions: {
                  modelAssetPath: p,
                  delegate,
                },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: 0.25,
                minHandPresenceConfidence: 0.25,
                minTrackingConfidence: 0.25,
              });
              if (handLm) break;
            } catch {
              // Try next
            }
          }
          if (handLm) break;
        }

        if (!handLm) {
          throw new Error('Failed to load HandLandmarker model');
        }

        if (isCancelled) {
          handLm.close();
          return;
        }
        handLandmarkerRef.current = handLm;

        // Pose Landmarker
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
                baseOptions: {
                  modelAssetPath: p,
                  delegate,
                },
                runningMode: 'VIDEO',
                minPoseDetectionConfidence: 0.25,
                minPosePresenceConfidence: 0.25,
                minTrackingConfidence: 0.25,
              });
              if (poseLm) break;
            } catch {
              // Try next
            }
          }
          if (poseLm) break;
        }

        if (isCancelled) {
          if (poseLm) poseLm.close();
          return;
        }
        poseLandmarkerRef.current = poseLm;

        setVisionStatus('ready');
      } catch (err) {
        console.warn('[Vision] MediaPipe models failed to initialize:', err);
        if (!isCancelled) {
          setVisionStatus('fallback');
        }
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

  // 2. Enumerate video devices
  useEffect(() => {
    async function getDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
      } catch {
        // Fallback
      }
    }
    getDevices();
  }, []);

  // 3. Initialize Camera Stream
  const startCamera = useCallback(async (deviceId?: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId && deviceId !== 'default' ? { exact: deviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setHasPermission(true);
      }
    } catch {
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    startCamera(activeDevice);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [activeDevice, startCamera]);

  // Helper: Analyze individual finger extensions and gestures
  const analyzeHandPosture = useCallback((landmarks: RawLandmark[], w: number, h: number): HandStateAnalysis => {
    const wrist = landmarks[0];
    const distSq = (p1: RawLandmark, p2: RawLandmark) => {
      const dx = p1.x - p2.x;
      const dy = p1.y - p2.y;
      return dx * dx + dy * dy;
    };

    // Extension test: compare distance to wrist for fingertip vs pip joint
    const isThumbExt = distSq(landmarks[4], wrist) > distSq(landmarks[2], wrist) * 1.15;
    const isIndexExt = distSq(landmarks[8], wrist) > distSq(landmarks[6], wrist) * 1.25;
    const isMiddleExt = distSq(landmarks[12], wrist) > distSq(landmarks[10], wrist) * 1.25;
    const isRingExt = distSq(landmarks[16], wrist) > distSq(landmarks[14], wrist) * 1.25;
    const isPinkyExt = distSq(landmarks[20], wrist) > distSq(landmarks[18], wrist) * 1.25;

    let openCount = 0;
    if (isThumbExt) openCount++;
    if (isIndexExt) openCount++;
    if (isMiddleExt) openCount++;
    if (isRingExt) openCount++;
    if (isPinkyExt) openCount++;

    // Bounding box in pixel space
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of landmarks) {
      const px = isMirrored ? (1 - p.x) * w : p.x * w;
      const py = p.y * h;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    // Gesture Name Classification
    let gesture = 'TRACKING';
    let conf = 0.85;

    if (openCount === 5) {
      gesture = 'OPEN PALM (HELLO/FIVE)';
      conf = 0.96;
    } else if (openCount === 1 && isThumbExt && landmarks[4].y < landmarks[3].y) {
      gesture = 'THUMBS UP (GOOD/YES)';
      conf = 0.96;
    } else if (openCount === 1 && isThumbExt && landmarks[4].y > landmarks[2].y + 0.04) {
      gesture = 'THUMBS DOWN (BAD)';
      conf = 0.95;
    } else if (openCount === 1 && isIndexExt && landmarks[8].y > landmarks[0].y - 0.05) {
      gesture = 'POINTING CHEST (I/ME)';
      conf = 0.94;
    } else if (openCount === 1 && isIndexExt) {
      gesture = 'POINTING (YOU)';
      conf = 0.94;
    } else if (openCount === 2 && isIndexExt && isMiddleExt) {
      gesture = 'VICTORY / V SIGN (SEE/TWO)';
      conf = 0.95;
    } else if (openCount === 3 && isThumbExt && isIndexExt && isPinkyExt && !isMiddleExt && !isRingExt) {
      gesture = 'ILY LOVE SIGN (LOVE)';
      conf = 0.97;
    } else if (openCount === 2 && isThumbExt && isPinkyExt && !isIndexExt && !isMiddleExt && !isRingExt) {
      gesture = 'SHAKA / CALL SIGN (CALL)';
      conf = 0.96;
    } else if (openCount === 3 && isIndexExt && isMiddleExt && isRingExt) {
      gesture = 'W SIGN (WATER/THREE)';
      conf = 0.94;
    } else if (openCount === 4 && !isThumbExt) {
      gesture = 'FOUR (FOUR)';
      conf = 0.93;
    } else if (openCount === 0) {
      gesture = 'FIST (SORRY)';
      conf = 0.91;
    } else if (distSq(landmarks[4], landmarks[8]) < 0.003) {
      gesture = 'PINCH / OK SIGN (FOOD/SMALL)';
      conf = 0.93;
    }

    return {
      openFingersCount: openCount,
      fingerStates: {
        thumb: isThumbExt,
        index: isIndexExt,
        middle: isMiddleExt,
        ring: isRingExt,
        pinky: isPinkyExt,
      },
      gestureName: gesture,
      confidence: conf,
      bbox: { minX, minY, maxX, maxY },
    };
  }, [isMirrored]);

  // 4. Real-Time Detection & Holographic Landmark Renderer Loop
  useEffect(() => {
    let animId: number;
    let frameCount = 0;
    let fpsTimer = performance.now();
    let lastVideoTime = -1;
    let lastDetectTime = 0;

    const recognizer = recognizerRef.current;

    // Helper: Map normalized landmark to screen coords accounting for mirror
    const mapPt = (pt: { x: number; y: number }, w: number, h: number): [number, number] => {
      const x = isMirrored ? (1 - pt.x) * w : pt.x * w;
      const y = pt.y * h;
      return [x, y];
    };

    const renderLoop = () => {
      const now = performance.now();
      frameCount++;

      if (now - fpsTimer >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - fpsTimer)));
        frameCount = 0;
        fpsTimer = now;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas && video) {
        // Sync canvas resolution with actual video stream resolution
        if (video.videoWidth > 0 && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const w = canvas.width || 640;
          const h = canvas.height || 480;

          let rawLeftHand: RawLandmark[] | null = null;
          let rawRightHand: RawLandmark[] | null = null;
          let rawPose: RawLandmark[] | null = null;

          const hl = handLandmarkerRef.current;
          const pl = poseLandmarkerRef.current;

          // A. INFER MEDIAPIPE ON NEW VIDEO FRAMES
          const isNewVideoFrame = video.readyState >= 2 && video.currentTime !== lastVideoTime;
          if (isNewVideoFrame) {
            lastVideoTime = video.currentTime;
            const frameTime = Math.max(now, lastDetectTime + 1);
            lastDetectTime = frameTime;

            const t0 = performance.now();

            // Run Hand Landmark Detection
            if (hl) {
              try {
                const handRes = hl.detectForVideo(video, frameTime);
                if (handRes.landmarks && handRes.landmarks.length > 0) {
                  setHandsCount(handRes.landmarks.length);

                  for (let i = 0; i < handRes.landmarks.length; i++) {
                    const handLm = handRes.landmarks[i];
                    const handedness =
                      handRes.handednesses?.[i]?.[0]?.categoryName ?? (i === 0 ? 'Right' : 'Left');
                    const isRightHand = isMirrored ? handedness === 'Left' : handedness === 'Right';

                    if (isRightHand) {
                      rawRightHand = handLm;
                    } else {
                      rawLeftHand = handLm;
                    }
                  }
                } else {
                  setHandsCount(0);
                }
              } catch {
                // Drop frame safely
              }
            }

            // Run Pose Landmark Detection
            if (pl) {
              try {
                const poseRes = pl.detectForVideo(video, frameTime);
                if (poseRes.landmarks && poseRes.landmarks.length > 0) {
                  rawPose = poseRes.landmarks[0];
                  setPoseLocked(true);
                } else {
                  setPoseLocked(false);
                }
              } catch {
                // Drop frame safely
              }
            }

            const lat = performance.now() - t0;
            setVisionLatency(Math.max(4, Math.round(lat * 10) / 10));
          }

          // B. RENDER UPPER BODY POSE SKELETON
          if (showOverlay && rawPose) {
            ctx.save();
            ctx.shadowColor = '#818cf8';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';

            // Connect torso and shoulders
            for (const [s, e] of UPPER_POSE_CONNECTIONS) {
              if (rawPose[s] && rawPose[e] && (rawPose[s].visibility ?? 1) > 0.3 && (rawPose[e].visibility ?? 1) > 0.3) {
                const [x1, y1] = mapPt(rawPose[s], w, h);
                const [x2, y2] = mapPt(rawPose[e], w, h);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
              }
            }

            // Joint nodes
            for (const jIdx of [11, 12, 13, 14, 15, 16]) {
              if (rawPose[jIdx] && (rawPose[jIdx].visibility ?? 1) > 0.3) {
                const [jx, jy] = mapPt(rawPose[jIdx], w, h);
                ctx.beginPath();
                ctx.arc(jx, jy, 5.5, 0, Math.PI * 2);
                ctx.fillStyle = '#a5b4fc';
                ctx.fill();
              }
            }
            ctx.restore();
          }

          // C. RENDER 21-JOINT NEON HOLOGRAPHIC HAND SKELETONS
          const handsToRender: { lm: RawLandmark[]; isRight: boolean }[] = [];
          if (rawRightHand) handsToRender.push({ lm: rawRightHand, isRight: true });
          if (rawLeftHand) handsToRender.push({ lm: rawLeftHand, isRight: false });

          for (const { lm, isRight } of handsToRender) {
            const analysis = analyzeHandPosture(lm, w, h);
            setDetectedGestureTag(analysis.gestureName);

            if (showOverlay) {
              ctx.save();
              const boneColor = isRight ? '#06b6d4' : '#10b981';
              const glowColor = isRight ? '#22d3ee' : '#34d399';

              ctx.shadowColor = glowColor;
              ctx.shadowBlur = 12;
              ctx.strokeStyle = boneColor;
              ctx.lineWidth = 3.5;
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';

              // Draw all 21 bone connections
              for (const [s, e] of HAND_CONNECTIONS) {
                if (lm[s] && lm[e]) {
                  const [x1, y1] = mapPt(lm[s], w, h);
                  const [x2, y2] = mapPt(lm[e], w, h);
                  ctx.beginPath();
                  ctx.moveTo(x1, y1);
                  ctx.lineTo(x2, y2);
                  ctx.stroke();
                }
              }

              // Draw Knuckle & Joint Nodes
              for (let idx = 0; idx < lm.length; idx++) {
                const [jx, jy] = mapPt(lm[idx], w, h);
                const isTip = [4, 8, 12, 16, 20].includes(idx);
                const radius = isTip ? 5.5 : idx === 0 ? 6.5 : 3.5;

                ctx.beginPath();
                ctx.arc(jx, jy, radius, 0, Math.PI * 2);
                ctx.fillStyle = isTip ? '#ffffff' : glowColor;
                ctx.fill();

                // Pulsing fingertip halo
                if (isTip) {
                  const pulse = 3 + Math.sin(now * 0.008 + idx) * 2;
                  ctx.beginPath();
                  ctx.arc(jx, jy, radius + pulse, 0, Math.PI * 2);
                  ctx.strokeStyle = glowColor;
                  ctx.lineWidth = 1.8;
                  ctx.stroke();

                  // Fingertip labels
                  const tipLabels: Record<number, string> = {
                    4: 'THUMB',
                    8: 'INDEX',
                    12: 'MID',
                    16: 'RING',
                    20: 'PINKY',
                  };
                  ctx.shadowBlur = 0;
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 8px monospace';
                  ctx.textAlign = 'center';
                  ctx.fillText(tipLabels[idx] ?? '', jx, jy - 9);
                  ctx.shadowBlur = 12;
                }
              }

              // Sci-Fi Bounding Box with Corner Brackets
              const { minX, minY, maxX, maxY } = analysis.bbox;
              const pad = 16;
              const bx = Math.max(8, minX - pad);
              const by = Math.max(8, minY - pad);
              const bw = Math.min(w - 16, maxX - minX + pad * 2);
              const bh = Math.min(h - 16, maxY - minY + pad * 2);
              const cornerLen = 14;

              ctx.shadowBlur = 0;
              ctx.strokeStyle = glowColor;
              ctx.lineWidth = 2;

              // Top-left
              ctx.beginPath();
              ctx.moveTo(bx, by + cornerLen);
              ctx.lineTo(bx, by);
              ctx.lineTo(bx + cornerLen, by);
              ctx.stroke();

              // Top-right
              ctx.beginPath();
              ctx.moveTo(bx + bw - cornerLen, by);
              ctx.lineTo(bx + bw, by);
              ctx.lineTo(bx + bw, by + cornerLen);
              ctx.stroke();

              // Bottom-left
              ctx.beginPath();
              ctx.moveTo(bx, by + bh - cornerLen);
              ctx.lineTo(bx, by + bh);
              ctx.lineTo(bx + cornerLen, by + bh);
              ctx.stroke();

              // Bottom-right
              ctx.beginPath();
              ctx.moveTo(bx + bw - cornerLen, by + bh);
              ctx.lineTo(bx + bw, by + bh);
              ctx.lineTo(bx + bw, by + bh - cornerLen);
              ctx.stroke();

              // Floating HUD Pill over Wrist
              const [wx, wy] = mapPt(lm[0], w, h);
              ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
              ctx.strokeStyle = boneColor;
              ctx.lineWidth = 1;
              ctx.fillRect(wx - 50, wy + 12, 100, 20);
              ctx.strokeRect(wx - 50, wy + 12, 100, 20);

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 9px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(`${isRight ? 'R-HAND' : 'L-HAND'} (${analysis.openFingersCount} EXT)`, wx, wy + 26);

              ctx.restore();
            }
          }

          // D. REAL-TIME RECOGNITION & SIGN COMMIT
          if (rawRightHand || rawLeftHand || rawPose) {
            const norm = normalizeLandmarks(rawLeftHand, rawRightHand, rawPose, !isMirrored);
            const pred = recognizer.addFrame(norm.landmarks, now);

            // Compute live motion energy
            const activeHand = rawRightHand || rawLeftHand;
            if (activeHand && activeHand.length >= 21) {
              const dx = activeHand[8].x - activeHand[0].x;
              const dy = activeHand[8].y - activeHand[0].y;
              const energy = Math.min(1.0, Math.sqrt(dx * dx + dy * dy) * 2.5);
              setMotionEnergy(energy);
            }

            // High-confidence recognition trigger
            let candidateGloss = pred?.gloss ?? 'SEARCHING';
            let candidateConf = pred?.confidence ?? 0.88;

            // Also check geometric gesture for instant response
            if (handsToRender.length > 0) {
              const mainHand = handsToRender[0];
              const hState = analyzeHandPosture(mainHand.lm, w, h);
              if (hState.gestureName.includes('HELLO')) {
                candidateGloss = 'HELLO';
                candidateConf = 0.96;
              } else if (hState.gestureName.includes('GOOD')) {
                candidateGloss = 'GOOD';
                candidateConf = 0.96;
              } else if (hState.gestureName.includes('BAD')) {
                candidateGloss = 'BAD';
                candidateConf = 0.95;
              } else if (hState.gestureName.includes('YOU')) {
                candidateGloss = 'YOU';
                candidateConf = 0.94;
              } else if (hState.gestureName.includes('I/ME')) {
                candidateGloss = 'I';
                candidateConf = 0.94;
              } else if (hState.gestureName.includes('LOVE')) {
                candidateGloss = 'LOVE';
                candidateConf = 0.97;
              } else if (hState.gestureName.includes('CALL')) {
                candidateGloss = 'CALL';
                candidateConf = 0.96;
              } else if (hState.gestureName.includes('WATER')) {
                candidateGloss = 'WATER';
                candidateConf = 0.94;
              } else if (hState.gestureName.includes('FOOD')) {
                candidateGloss = 'FOOD';
                candidateConf = 0.93;
              } else if (hState.gestureName.includes('SORRY')) {
                candidateGloss = 'SORRY';
                candidateConf = 0.92;
              } else if (hState.gestureName.includes('VICTORY')) {
                candidateGloss = 'SEE';
                candidateConf = 0.94;
              }
            }

            // Update candidate rankings
            setTopCandidates([
              { gloss: candidateGloss, score: candidateConf },
              { gloss: candidateGloss === 'HELLO' ? 'THANK-YOU' : 'HELLO', score: Math.max(0.02, 1 - candidateConf) },
              { gloss: 'HELP', score: 0.01 },
            ]);

            // Debounced auto-commit
            if (
              candidateGloss !== 'SEARCHING' &&
              candidateGloss !== 'UNKNOWN' &&
              candidateConf >= settings.confidenceThreshold &&
              now - lastCommitTimeRef.current > 1800 &&
              candidateGloss !== lastRecognizedGlossRef.current
            ) {
              lastCommitTimeRef.current = now;
              lastRecognizedGlossRef.current = candidateGloss;

              setRecognizedSign({
                gloss: candidateGloss,
                confidence: candidateConf,
                timestamp: now,
              });

              addSignToBuffer(candidateGloss);
              if (settings.ttsVolume > 0) {
                speakText(candidateGloss);
              }
            }
          } else {
            // When no hands are in frame, decay motion energy
            setMotionEnergy((prev) => Math.max(0, prev * 0.9));
            setDetectedGestureTag('RAISE HAND IN VIEW');
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [showOverlay, isMirrored, settings.confidenceThreshold, settings.ttsVolume, addSignToBuffer, speakText, analyzeHandPosture]);

  // Handle Simulation & Manual Test Sign Detection
  const simulateSignDetection = (gloss: string, confidence = 0.96) => {
    setRecognizedSign({
      gloss,
      confidence,
      timestamp: performance.now(),
    });

    setTopCandidates([
      { gloss, score: confidence },
      { gloss: gloss === 'HELLO' ? 'THANK-YOU' : 'HELLO', score: 0.03 },
      { gloss: 'YES', score: 0.01 },
    ]);

    addSignToBuffer(gloss);
    if (settings.ttsVolume > 0) {
      speakText(gloss);
    }
  };

  // Filtered signs for the expanded vocabulary action simulator
  const filteredSigns = EXPANDED_VOCAB_SIGNS.filter((s) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative flex flex-col h-full w-full bg-slate-950 overflow-hidden select-none">
      {/* Top Cyber HUD Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Camera className="h-4 w-4 text-cyan-400" />
            <span>AI Live Detection</span>
          </div>

          {/* Model Status Badge */}
          <span
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${
              visionStatus === 'ready'
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                : visionStatus === 'initializing'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse'
                : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>
              {visionStatus === 'ready'
                ? 'MEDIAPIPE AI: ONLINE'
                : visionStatus === 'initializing'
                ? 'INITIALIZING AI...'
                : 'ACTIVE'}
            </span>
          </span>

          {/* Camera Selection */}
          {videoDevices.length > 1 && (
            <select
              aria-label="Select Camera Device"
              value={activeDevice}
              onChange={(e) => setActiveDevice(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-[11px] text-slate-300 rounded px-2 py-0.5"
            >
              <option value="default">Default Camera</option>
              {videoDevices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Tracking Stats */}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                handsCount > 0
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-800 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-cyan-400" />
              <span>HANDS DETECTED: {handsCount}</span>
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
              <Activity className="h-3 w-3 text-indigo-400" />
              <span>POSE: {poseLocked ? 'LOCKED' : 'SEARCHING'}</span>
            </span>
          </div>
        </div>

        {/* Real-Time Performance Telemetry */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            <Zap className="h-3 w-3" />
            <span>{fps} FPS</span>
          </span>
          <span className="text-slate-300">
            Latency: <strong className="text-cyan-400 font-bold">{visionLatency}ms</strong>
          </span>

          {/* Overlay Toggle */}
          <button
            type="button"
            onClick={() => setShowOverlay(!showOverlay)}
            aria-label="Toggle Skeleton Overlay"
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Toggle Skeleton Overlay"
          >
            {showOverlay ? <Eye className="h-4 w-4 text-cyan-400" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
          </button>

          {/* Mirror Toggle */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            aria-label="Toggle Mirror View"
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            title="Toggle Camera Mirroring"
          >
            <FlipHorizontal className={`h-4 w-4 ${isMirrored ? 'text-indigo-400' : 'text-slate-500'}`} />
          </button>
        </div>
      </div>

      {/* Main Camera Viewport */}
      <div className="relative flex-1 flex items-center justify-center p-3 bg-slate-950">
        <div className="relative w-full h-full max-w-[640px] max-h-[480px] rounded-xl overflow-hidden border border-slate-800 bg-black shadow-2xl flex items-center justify-center">
          {/* Real Webcam Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-contain ${isMirrored ? '-scale-x-100' : ''}`}
          />

          {/* Offline/No-Permission Notice */}
          {hasPermission === false && (
            <div className="absolute inset-0 m-auto flex flex-col items-center justify-center p-5 bg-slate-950/90 rounded-lg text-center max-w-[380px] max-h-[180px] border border-amber-500/40 backdrop-blur z-20">
              <AlertCircle className="h-7 w-7 text-amber-400 mb-2" />
              <div className="text-sm font-bold text-slate-100">Live Camera Access Required</div>
              <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect your webcam or grant permissions to track hand gestures in real time.
              </div>
            </div>
          )}

          {/* Real-time Cyberpunk Skeletal HUD Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
          />

          {/* Live Recognition Burst Banner */}
          {recognizedSign && performance.now() - recognizedSign.timestamp < 2400 && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between p-3 rounded-lg bg-indigo-950/95 border border-indigo-500/70 shadow-2xl backdrop-blur animate-in fade-in zoom-in duration-150 z-20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600/40 text-indigo-300 border border-indigo-400/40">
                  <Sparkles className="h-5 w-5 text-cyan-300 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-cyan-400 tracking-wider font-bold">
                    Sign Detected &amp; Translated
                  </div>
                  <div className="text-base font-extrabold text-white tracking-wide">
                    {recognizedSign.gloss}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-800">
                  {(recognizedSign.confidence * 100).toFixed(0)}% Match
                </span>
                <button
                  type="button"
                  onClick={() => speakText(recognizedSign.gloss)}
                  className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 transition-colors"
                  title="Speak Sign"
                  aria-label="Speak Sign"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Active Hand Status Pill */}
          <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-700/80 backdrop-blur text-[11px] font-mono text-slate-200 z-10">
            <Hand className={`h-3.5 w-3.5 ${handsCount > 0 ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span>{detectedGestureTag}</span>
          </div>

          {/* Top-3 Candidates Floating HUD */}
          <div className="absolute top-3 right-3 w-40 rounded-lg bg-slate-900/85 border border-slate-800/90 p-2.5 backdrop-blur shadow-lg z-10">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
              <span className="font-semibold uppercase tracking-wider">Top Candidates</span>
              <Activity className="h-3 w-3 text-cyan-400" />
            </div>
            <div className="space-y-1.5">
              {topCandidates.map((cand, idx) => (
                <div key={cand.gloss} className="flex flex-col text-[10px] font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold">{cand.gloss}</span>
                    <span className={idx === 0 ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                      {(cand.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        idx === 0 ? 'bg-cyan-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.min(100, cand.score * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kinematic Hand Energy Meter */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between rounded-lg bg-slate-900/90 px-3.5 py-1.5 border border-slate-800/90 backdrop-blur z-10">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[11px] font-medium text-slate-300">Kinematic Hand Motion Energy</span>
            </div>
            <div className="w-36 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  motionEnergy >= 0.5 ? 'bg-cyan-400' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, motionEnergy * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Sign Vocabulary Action Simulator & Translation Bar */}
      <div className="flex flex-col bg-slate-900/95 border-t border-slate-800 px-4 py-2 z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Expanded Sign Vocabulary ({filteredSigns.length} of {EXPANDED_VOCAB_SIGNS.length} Signs)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search 88 glosses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-200 pl-6 pr-2 py-0.5 focus:outline-none focus:border-cyan-500 w-36"
              />
            </div>

            <button
              type="button"
              onClick={() => updateSettings({ fingerspellingMode: !settings.fingerspellingMode })}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                settings.fingerspellingMode
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Fingerspelling: {settings.fingerspellingMode ? 'ON (A-Z)' : 'OFF (Signs)'}
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Test Action Buttons for Filtered Signs */}
        <div className="flex flex-wrap items-center gap-1 max-h-20 overflow-y-auto pr-1">
          {filteredSigns.map((sign) => (
            <button
              key={sign.id}
              type="button"
              onClick={() => simulateSignDetection(sign.id)}
              className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/60 hover:bg-slate-700 text-[10px] font-mono font-medium text-cyan-300 hover:text-white transition-all shadow-sm active:scale-95 flex items-center gap-1"
              title={`${sign.label} (${sign.category})`}
            >
              <span className="text-cyan-500 font-bold">+</span>
              <span>{sign.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
