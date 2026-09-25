/**
 * Builds the list of cards to study for a deck, Anki-style:
 *   1. (re)learning cards whose due time has passed (short intervals),
 *   2. review cards due before the end of the study day, capped by the
 *      remaining daily review limit,
 *   3. new cards, capped by the remaining daily new-card limit.
 * If nothing else is left, learning cards due within LEARN_AHEAD_MS are shown
 * early so the user is not stuck waiting a few minutes.
 */
import type { Card, Deck, Review } from '../model/schemas';
import { CardStates } from '../model/schemas';
import { nextStudyDayStart, studyDayStart } from './day';

export const LEARN_AHEAD_MS = 20 * 60_000;

export interface QueueCounts {
  new: number;
  learning: number;
  review: number;
}

export interface StudyQueue {
  /** Cards in presentation order; the first one is shown next. */
  cards: Card[];
  counts: QueueCounts;
}

export interface QueueInput {
  deck: Deck;
  cards: Iterable<Card>;
  /** Reviews of this deck; only today's are used for the daily limits. */
  reviews: Iterable<Review>;
  now: number;
  rolloverHour?: number;
}

export function todaysUsage(reviews: Iterable<Review>, now: number, rolloverHour?: number): { newDone: number; reviewsDone: number } {
  const dayStart = studyDayStart(now, rolloverHour);
  let newDone = 0;
  let reviewsDone = 0;
  for (const r of reviews) {
    if (r.reviewedAt < dayStart || r.reviewedAt > now) continue;
    if (r.stateBefore === CardStates.New) newDone++;
    else if (r.stateBefore === CardStates.Review) reviewsDone++;
  }
  return { newDone, reviewsDone };
}

export function buildStudyQueue({ deck, cards, reviews, now, rolloverHour }: QueueInput): StudyQueue {
  const dayEnd = nextStudyDayStart(now, rolloverHour);
  const { newDone, reviewsDone } = todaysUsage(reviews, now, rolloverHour);
  const newLimit = Math.max(0, deck.config.newPerDay - newDone);
  const reviewLimit = Math.max(0, deck.config.reviewsPerDay - reviewsDone);

  const learning: Card[] = [];
  const learningSoon: Card[] = [];
  const review: Card[] = [];
  const fresh: Card[] = [];

  for (const card of cards) {
    if (card.deckId !== deck.id || card.suspended) continue;
    const { state, due } = card.schedule;
    if (state === CardStates.Learning || state === CardStates.Relearning) {
      if (due <= now) learning.push(card);
      else if (due <= now + LEARN_AHEAD_MS) learningSoon.push(card);
    } else if (state === CardStates.Review) {
      if (due < dayEnd) review.push(card);
    } else {
      fresh.push(card);
    }
  }

  const byDue = (a: Card, b: Card) => a.schedule.due - b.schedule.due || a.id.localeCompare(b.id);
  learning.sort(byDue);
  learningSoon.sort(byDue);
  review.sort(byDue);
  fresh.sort((a, b) => a.createdAt - b.createdAt || a.template - b.template || a.id.localeCompare(b.id));

  const reviewPart = review.slice(0, reviewLimit);
  const newPart = fresh.slice(0, newLimit);
  const hasWorkNow = learning.length + reviewPart.length + newPart.length > 0;
  const learningShown = hasWorkNow ? learning : learningSoon;

  return {
    cards: [...learningShown, ...reviewPart, ...newPart],
    counts: { learning: learningShown.length, review: reviewPart.length, new: newPart.length },
  };
}
