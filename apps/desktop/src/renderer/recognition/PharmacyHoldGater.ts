/**
 * Pharmacy Recognition State Machine & Hold Gater
 * Implements Module I exact specification:
 * - 4 States: NO_HAND, DETECTING, CONFIRMED, UNSURE
 * - 10 of 12 consecutive frames > 0.75 confidence rule
 * - 800 ms commit lock preventing duplicate flickers
 * - Top 3 guesses in UNSURE (0.50 - 0.75 confidence)
 */

export type RecognitionState = 'NO_HAND' | 'DETECTING' | 'CONFIRMED' | 'UNSURE';

export interface StateMachineOutput {
  state: RecognitionState;
  userMessage: string;
  confirmedGloss: string | null;
  shouldCommit: boolean;
  holdProgress: number; // 0.0 to 1.0 for circular progress ring
  confidence: number;
  topGuesses: string[];
}

export class PharmacyHoldGater {
  private frameWindow: Array<{ gloss: string; confidence: number; timestamp: number }> = [];
  private windowSize: number;
  private minConfirmFrames: number;
  private confidenceThreshold: number;
  private unsureLowerThreshold: number;
  private lockDurationMs: number;

  constructor(
    windowSize = 12,
    minConfirmFrames = 10,
    confidenceThreshold = 0.75,
    unsureLowerThreshold = 0.50,
    lockDurationMs = 800
  ) {
    this.windowSize = windowSize;
    this.minConfirmFrames = minConfirmFrames;
    this.confidenceThreshold = confidenceThreshold;
    this.unsureLowerThreshold = unsureLowerThreshold;
    this.lockDurationMs = lockDurationMs;
  }

  private lockUntil = 0;
  private lastConfirmedGloss = '';
  private currentState: RecognitionState = 'NO_HAND';

  public getCurrentState(): RecognitionState {
    return this.currentState;
  }

  /**
   * Process a single detection frame
   */
  public update(
    hasHand: boolean,
    candidateGloss: string | null,
    confidence: number,
    topCandidates: string[],
    now: number
  ): StateMachineOutput {
    // 1. If currently in 800ms commit lock
    if (now < this.lockUntil && this.lastConfirmedGloss) {
      return {
        state: 'CONFIRMED',
        userMessage: `Got it: ${this.lastConfirmedGloss}`,
        confirmedGloss: this.lastConfirmedGloss,
        shouldCommit: false, // Already committed at start of lock
        holdProgress: 1.0,
        confidence: 1.0,
        topGuesses: [],
      };
    }

    // 2. NO_HAND state
    if (!hasHand || !candidateGloss || candidateGloss === 'SEARCHING' || candidateGloss === 'NO_HAND') {
      this.frameWindow = [];
      this.currentState = 'NO_HAND';
      return {
        state: 'NO_HAND',
        userMessage: 'Show your hand to the camera',
        confirmedGloss: null,
        shouldCommit: false,
        holdProgress: 0,
        confidence: 0,
        topGuesses: [],
      };
    }

    // 3. Add to sliding window of 12 frames
    this.frameWindow.push({ gloss: candidateGloss, confidence, timestamp: now });
    if (this.frameWindow.length > this.windowSize) {
      this.frameWindow.shift();
    }

    // Count consecutive / occurrences of candidate in window with conf > 0.75
    const matchingHighConfFrames = this.frameWindow.filter(
      (f) => f.gloss === candidateGloss && f.confidence >= this.confidenceThreshold
    ).length;

    const holdProgress = Math.min(1.0, matchingHighConfFrames / this.minConfirmFrames);

    // 4. CONFIRMED state: 10 of 12 consecutive frames above 0.75
    if (matchingHighConfFrames >= this.minConfirmFrames) {
      this.currentState = 'CONFIRMED';
      this.lastConfirmedGloss = candidateGloss;
      this.lockUntil = now + this.lockDurationMs;
      this.frameWindow = [];

      return {
        state: 'CONFIRMED',
        userMessage: `Got it: ${candidateGloss}`,
        confirmedGloss: candidateGloss,
        shouldCommit: true,
        holdProgress: 1.0,
        confidence,
        topGuesses: [],
      };
    }

    // 5. UNSURE state: confidence is between 0.50 and 0.75
    if (confidence >= this.unsureLowerThreshold && confidence < this.confidenceThreshold) {
      this.currentState = 'UNSURE';
      const guesses = topCandidates.filter((c) => c !== 'SEARCHING').slice(0, 3);
      return {
        state: 'UNSURE',
        userMessage: 'Not sure - please repeat, or tap a word below',
        confirmedGloss: null,
        shouldCommit: false,
        holdProgress,
        confidence,
        topGuesses: guesses.length > 0 ? guesses : [candidateGloss],
      };
    }

    // 6. DETECTING state: below 0.50 or building up hold
    this.currentState = 'DETECTING';
    return {
      state: 'DETECTING',
      userMessage: 'Hold your sign steady...',
      confirmedGloss: null,
      shouldCommit: false,
      holdProgress,
      confidence,
      topGuesses: [],
    };
  }

  public reset(): void {
    this.frameWindow = [];
    this.lockUntil = 0;
    this.lastConfirmedGloss = '';
    this.currentState = 'NO_HAND';
  }
}
