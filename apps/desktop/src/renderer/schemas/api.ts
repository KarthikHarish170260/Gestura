/**
 * Zod runtime schemas for GESTURA REST API endpoints and WebSocket messages.
 * Enforces strict bidirectional contract validation on client side.
 */

import { z } from 'zod';

export const TokenProvenanceSchema = z.object({
  original_word: z.string(),
  gloss: z.string(),
  provenance: z.enum(['lexicon', 'synonym', 'fingerspell', 'dropped']),
  confidence: z.number().default(1.0),
});

export const UtteranceSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  direction: z.enum(['sign_to_speech', 'speech_to_sign']),
  text: z.string(),
  gloss: z.string().default(''),
  confidence: z.number().default(1.0),
  latency_ms: z.number().default(0.0),
  token_provenance: z.array(TokenProvenanceSchema).default([]),
  timestamp: z.string(),
});

export const CreateUtteranceSchema = z.object({
  direction: z.enum(['sign_to_speech', 'speech_to_sign']),
  text: z.string().min(1),
  gloss: z.string().default(''),
  confidence: z.number().min(0).max(1).default(1.0),
  latency_ms: z.number().min(0).default(0.0),
  token_provenance: z.array(TokenProvenanceSchema).default([]),
});

export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  sign_language: z.string(),
  active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  utterances_count: z.number().default(0),
});

export const CreateSessionSchema = z.object({
  title: z.string().min(1).default('Conversation'),
  sign_language: z.enum(['ISL', 'ASL']).default('ISL'),
});

export const SampleSchema = z.object({
  id: z.string(),
  gloss: z.string(),
  sample_index: z.number(),
  user_profile: z.string(),
  num_frames: z.number(),
  quality_score: z.number(),
  created_at: z.string(),
});

export const SampleDetailSchema = SampleSchema.extend({
  landmark_data: z.array(z.array(z.number())),
});

export const CreateSampleSchema = z.object({
  gloss: z.string().min(1).max(64),
  landmark_data: z.array(z.array(z.number())).length(32),
  num_frames: z.number().default(32),
  quality_score: z.number().min(0).max(1).default(1.0),
  user_profile: z.string().default('default'),
});

export const ModelInfoSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size_bytes: z.number(),
  is_active: z.boolean(),
  is_quantized: z.boolean(),
  updated_at: z.string(),
});

export const TrainStatusSchema = z.object({
  status: z.enum(['idle', 'running', 'completed', 'failed', 'cancelled']),
  epoch: z.number(),
  total_epochs: z.number(),
  loss: z.number(),
  accuracy: z.number(),
  macro_f1: z.number(),
  message: z.string(),
  duration_seconds: z.number(),
});

export const TrainRequestSchema = z.object({
  epochs: z.number().min(1).max(100).default(10),
  batch_size: z.number().min(4).max(128).default(16),
  learning_rate: z.number().min(1e-5).max(0.1).default(0.001),
  samples_per_class: z.number().min(5).max(100).default(20),
});

export const VocabularySignSchema = z.object({
  id: z.string(),
  english_label: z.string(),
  category: z.string(),
  two_handed: z.boolean(),
  description: z.string().default(''),
});

export const VocabularySchema = z.object({
  language: z.string(),
  signs: z.array(VocabularySignSchema),
  special_classes: z.array(z.string()).default(['UNKNOWN']),
});

export const SettingsSchema = z.object({
  sign_language: z.enum(['ISL', 'ASL']).default('ISL'),
  high_contrast: z.boolean().default(false),
  large_type: z.boolean().default(false),
  caption_font_size: z.number().default(18),
  confidence_threshold: z.number().min(0).max(1).default(0.65),
  margin_threshold: z.number().min(0).max(1).default(0.15),
  debounce_frames: z.number().min(1).default(5),
  pause_commit_ms: z.number().min(200).default(1200),
  tts_voice: z.string().default('default'),
  tts_rate: z.number().default(1.0),
  tts_volume: z.number().default(1.0),
  input_mic_device: z.string().default('default'),
  output_speaker_device: z.string().default('default'),
  camera_device: z.string().default('default'),
  left_handed: z.boolean().default(false),
});

export const SUSSubmissionSchema = z.object({
  answers: z.array(z.number().min(1).max(5)).length(10),
});

export const SUSResponseSchema = z.object({
  id: z.string(),
  score: z.number(),
  grade: z.string(),
  adjective: z.string(),
});

// WebSocket Event Schemas
export const STTTranscriptEventSchema = z.object({
  type: z.literal('transcript'),
  text: z.string(),
  is_final: z.boolean(),
  confidence: z.number().default(1.0),
  gloss: z.string().optional(),
  token_provenance: z.array(TokenProvenanceSchema).optional(),
});

export const TrainingProgressEventSchema = z.object({
  type: z.literal('training_progress'),
  epoch: z.number(),
  total_epochs: z.number(),
  loss: z.number(),
  accuracy: z.number(),
});

export const TrainingCompletedEventSchema = z.object({
  type: z.literal('training_completed'),
  accuracy: z.number(),
  macro_f1: z.number(),
  message: z.string(),
});

export const SystemEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('connection_established'), server_time: z.string() }),
  z.object({ type: z.literal('pong'), time: z.number() }),
  TrainingProgressEventSchema,
  TrainingCompletedEventSchema,
  z.object({ type: z.literal('training_cancelled'), message: z.string() }),
  z.object({ type: z.literal('training_failed'), error: z.string() }),
  z.object({ type: z.literal('system_alert'), level: z.string(), message: z.string() }),
]);

export type Utterance = z.infer<typeof UtteranceSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Sample = z.infer<typeof SampleSchema>;
export type ModelInfo = z.infer<typeof ModelInfoSchema>;
export type TrainStatus = z.infer<typeof TrainStatusSchema>;
export type SystemEvent = z.infer<typeof SystemEventSchema>;

/**
 * Validates payload with schema, throwing typed TypeError on contract violation.
 */
export function validateContract<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new TypeError(`API Contract Violation: ${errorDetails}`);
  }
  return result.data;
}
