/**
 * Thin adapter between Itera's serialisable `Schedule` (numbers only) and
 * ts-fsrs (FSRS-6, the algorithm used by modern Anki). All scheduling
 * decisions go through this file, so swapping or upgrading the algorithm
 * only touches here.
 */
import {
  createEmptyCard,
  fsrs,
  type Card as FsrsCard,
  type FSRS,
  type Grade,
  State,
} from 'ts-fsrs';

import type { CardState, DeckConfig, Rating, Schedule } from '../model/schemas';

export function createScheduler(config: DeckConfig): FSRS {
  return fsrs({
    request_retention: config.desiredRetention,
    maximum_interval: config.maximumIntervalDays,
    enable_fuzz: true,
    enable_short_term: true,
  });
}

export function toFsrsCard(s: Schedule): FsrsCard {
  const card: FsrsCard = {
    state: s.state as State,
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
  };
  if (s.lastReview !== null) card.last_review = new Date(s.lastReview);
  return card;
}

export function fromFsrsCard(c: FsrsCard): Schedule {
  return {
    state: c.state as CardState,
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

export function newSchedule(now: number): Schedule {
  return fromFsrsCard(createEmptyCard(new Date(now)));
}

/** Schedule after answering `rating` at `now`. Pure. */
export function nextSchedule(config: DeckConfig, schedule: Schedule, rating: Rating, now: number): Schedule {
  const result = createScheduler(config).next(toFsrsCard(schedule), new Date(now), rating as Grade);
  return fromFsrsCard(result.card);
}

/** Due date for each possible answer — shown on the answer buttons. */
export function previewDue(config: DeckConfig, schedule: Schedule, now: number): Record<Rating, number> {
  const preview = createScheduler(config).repeat(toFsrsCard(schedule), new Date(now));
  return {
    1: preview[1].card.due.getTime(),
    2: preview[2].card.due.getTime(),
    3: preview[3].card.due.getTime(),
    4: preview[4].card.due.getTime(),
  };
}

/** Probability (0..1) that the card is recalled right now. */
export function retrievability(config: DeckConfig, schedule: Schedule, now: number): number {
  if (schedule.state === 0) return 0;
  return createScheduler(config).get_retrievability(toFsrsCard(schedule), new Date(now), false);
}
