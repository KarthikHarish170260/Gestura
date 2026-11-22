import { describe, it, expect } from 'vitest';
import {
  SessionSchema,
  UtteranceSchema,
  CreateSampleSchema,
  SystemEventSchema,
  validateContract,
} from './api';

describe('API Contract Zod Schemas', () => {
  it('validates a correct Session payload', () => {
    const raw = {
      id: 'sess-123',
      title: 'Test Session',
      sign_language: 'ISL',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      utterances_count: 5,
    };
    const parsed = validateContract(SessionSchema, raw);
    expect(parsed.id).toBe('sess-123');
    expect(parsed.utterances_count).toBe(5);
  });

  it('rejects an invalid Session payload with missing id', () => {
    const invalid = {
      title: 'Missing ID Session',
      sign_language: 'ISL',
    };
    expect(() => validateContract(SessionSchema, invalid)).toThrowError(
      /API Contract Violation/
    );
  });

  it('validates Utterance payload with token provenance', () => {
    const raw = {
      id: 'utt-1',
      session_id: 'sess-123',
      direction: 'speech_to_sign',
      text: 'hello doctor',
      gloss: 'HELLO DOCTOR',
      confidence: 0.98,
      latency_ms: 25.4,
      token_provenance: [
        { original_word: 'hello', gloss: 'HELLO', provenance: 'lexicon', confidence: 1.0 },
      ],
      timestamp: new Date().toISOString(),
    };
    const parsed = validateContract(UtteranceSchema, raw);
    expect(parsed.gloss).toBe('HELLO DOCTOR');
    expect(parsed.token_provenance?.[0]?.provenance).toBe('lexicon');
  });

  it('enforces 32 frames on CreateSampleSchema', () => {
    const validLandmarks = Array.from({ length: 32 }, () => new Array(162).fill(0));
    const valid = {
      gloss: 'WATER',
      landmark_data: validLandmarks,
      num_frames: 32,
      quality_score: 0.99,
      user_profile: 'default',
    };
    expect(validateContract(CreateSampleSchema, valid).gloss).toBe('WATER');

    const invalid = {
      ...valid,
      landmark_data: Array.from({ length: 15 }, () => new Array(162).fill(0)),
    };
    expect(() => validateContract(CreateSampleSchema, invalid)).toThrowError();
  });

  it('validates discriminated union on SystemEventSchema', () => {
    const event = {
      type: 'training_progress' as const,
      epoch: 3,
      total_epochs: 10,
      loss: 0.245,
      accuracy: 0.88,
    };
    const parsed = validateContract(SystemEventSchema, event);
    expect(parsed.type).toBe('training_progress');
  });
});
