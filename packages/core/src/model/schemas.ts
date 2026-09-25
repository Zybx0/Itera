/**
 * Canonical data model. Every record that is decrypted from storage or read
 * from an import file is validated against these schemas, so corrupted or
 * malicious data can never reach the UI or the scheduler.
 *
 * Timestamps are Unix epoch milliseconds (UTC). IDs are UUID v4.
 */
import { z } from 'zod';

import { UUID_V4_PATTERN } from '../ids';
import { LIMITS } from './limits';

export const idSchema = z.string().regex(UUID_V4_PATTERN);
export const timestampSchema = z.number().int().min(0).max(8.64e15);

export const deckConfigSchema = z.object({
  newPerDay: z.number().int().min(0).max(LIMITS.newPerDayMax),
  reviewsPerDay: z.number().int().min(0).max(LIMITS.reviewsPerDayMax),
  /** FSRS target probability of recall at review time. */
  desiredRetention: z.number().min(0.7).max(0.99),
  /** Longest interval FSRS may schedule, in days. */
  maximumIntervalDays: z.number().int().min(1).max(36_500),
});

export const DEFAULT_DECK_CONFIG: DeckConfig = {
  newPerDay: 20,
  reviewsPerDay: 200,
  desiredRetention: 0.9,
  maximumIntervalDays: 36_500,
};

export const deckSchema = z.object({
  kind: z.literal('deck'),
  id: idSchema,
  name: z.string().min(1).max(LIMITS.deckNameLength),
  description: z.string().max(LIMITS.deckDescriptionLength),
  config: deckConfigSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** 'basic' → 1 card (front→back). 'basic-reversed' → 2 cards (front→back and back→front). */
export const noteTypeSchema = z.enum(['basic', 'basic-reversed']);

export const noteSchema = z.object({
  kind: z.literal('note'),
  id: idSchema,
  deckId: idSchema,
  noteType: noteTypeSchema,
  front: z.string().min(1).max(LIMITS.fieldLength),
  back: z.string().max(LIMITS.fieldLength),
  tags: z.array(z.string().min(1).max(LIMITS.tagLength)).max(LIMITS.tagsPerNote),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** 0 New, 1 Learning, 2 Review, 3 Relearning — same values as ts-fsrs `State`. */
export const cardStateSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const scheduleSchema = z.object({
  state: cardStateSchema,
  due: timestampSchema,
  stability: z.number().min(0).max(1e6),
  difficulty: z.number().min(0).max(10),
  elapsedDays: z.number().int().min(0),
  scheduledDays: z.number().int().min(0),
  learningSteps: z.number().int().min(0),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  lastReview: timestampSchema.nullable(),
});

export const cardSchema = z.object({
  kind: z.literal('card'),
  id: idSchema,
  noteId: idSchema,
  deckId: idSchema,
  /** 0 = front→back, 1 = back→front (only for 'basic-reversed'). */
  template: z.union([z.literal(0), z.literal(1)]),
  suspended: z.boolean(),
  schedule: scheduleSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

/** 1 Again, 2 Hard, 3 Good, 4 Easy — same values as ts-fsrs `Rating`. */
export const ratingSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

export const reviewSchema = z.object({
  kind: z.literal('review'),
  id: idSchema,
  cardId: idSchema,
  deckId: idSchema,
  rating: ratingSchema,
  reviewedAt: timestampSchema,
  /** Time spent on the card, capped at 10 minutes. */
  durationMs: z.number().int().min(0).max(600_000),
  /** Card state *before* this review (used for daily limits and statistics). */
  stateBefore: cardStateSchema,
  /** Schedule *before* this review, kept so the review can be undone exactly. */
  scheduleBefore: scheduleSchema,
  /** Due date chosen by the scheduler after this review. */
  dueAfter: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const recordSchema = z.discriminatedUnion('kind', [deckSchema, noteSchema, cardSchema, reviewSchema]);

export type DeckConfig = z.infer<typeof deckConfigSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type NoteType = z.infer<typeof noteTypeSchema>;
export type Note = z.infer<typeof noteSchema>;
export type CardState = z.infer<typeof cardStateSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Rating = z.infer<typeof ratingSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type IteraRecord = z.infer<typeof recordSchema>;
export type RecordKind = IteraRecord['kind'];

export const CardStates = { New: 0, Learning: 1, Review: 2, Relearning: 3 } as const;
export const Ratings = { Again: 1, Hard: 2, Good: 3, Easy: 4 } as const;
