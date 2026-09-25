import { describe, expect, it } from 'vitest';

import { DEFAULT_DECK_CONFIG, formatInterval, type Card, type Deck, type Review } from '../src';
import { nextStudyDayStart, studyDayStart } from '../src/scheduler/day';
import { newSchedule, nextSchedule, previewDue, retrievability } from '../src/scheduler/fsrs';
import { buildStudyQueue, LEARN_AHEAD_MS } from '../src/scheduler/queue';
import { computeStats } from '../src/stats';
import { newId } from '../src/ids';
import { DAY, HOUR, MINUTE } from './helpers';

const t0 = new Date(2026, 0, 15, 10, 0, 0).getTime();
const deck: Deck = { kind: 'deck', id: newId(), name: 'D', description: '', config: { ...DEFAULT_DECK_CONFIG, newPerDay: 2, reviewsPerDay: 2 }, createdAt: t0, updatedAt: t0 };

function card(state: 0 | 1 | 2 | 3, due: number, extra: Partial<Card> = {}): Card {
  return { kind: 'card', id: newId(), noteId: newId(), deckId: deck.id, template: 0, suspended: false, schedule: { ...newSchedule(t0), state, due }, createdAt: t0, updatedAt: t0, ...extra };
}

function review(stateBefore: 0 | 1 | 2 | 3, reviewedAt: number, rating: 1 | 2 | 3 | 4 = 3): Review {
  return { kind: 'review', id: newId(), cardId: newId(), deckId: deck.id, rating, reviewedAt, durationMs: 1000, stateBefore, scheduleBefore: newSchedule(t0), dueAfter: reviewedAt, createdAt: reviewedAt, updatedAt: reviewedAt };
}

describe('study day', () => {
  it('rolls over at 04:00 local time', () => {
    const lateNight = new Date(2026, 0, 16, 2, 30).getTime();
    expect(studyDayStart(lateNight)).toBe(new Date(2026, 0, 15, 4).getTime());
    expect(nextStudyDayStart(lateNight)).toBe(new Date(2026, 0, 16, 4).getTime());
    expect(studyDayStart(new Date(2026, 0, 16, 4).getTime())).toBe(new Date(2026, 0, 16, 4).getTime());
  });
});

describe('fsrs adapter', () => {
  it('schedules later intervals for better answers', () => {
    const s = newSchedule(t0);
    const due = previewDue(deck.config, s, t0);
    expect(due[1]).toBeLessThanOrEqual(due[2]);
    expect(due[2]).toBeLessThanOrEqual(due[3]);
    expect(due[3]).toBeLessThan(due[4]);
    const after = nextSchedule(deck.config, s, 4, t0);
    expect(after.state).toBe(2);
    expect(after.lastReview).toBe(t0);
    expect(retrievability(deck.config, after, t0 + DAY)).toBeGreaterThan(0.8);
    expect(retrievability(deck.config, s, t0)).toBe(0);
  });
});

describe('study queue', () => {
  it('orders learning → review → new and applies daily limits', () => {
    const learning = card(1, t0 - MINUTE);
    const reviews = [card(2, t0 - DAY), card(2, t0 - 2 * DAY), card(2, t0 - 3 * DAY)];
    const fresh = [card(0, t0, { createdAt: t0 + 2 }), card(0, t0, { createdAt: t0 + 1 }), card(0, t0)];
    const notDue = card(2, t0 + 3 * DAY);
    const suspended = card(2, t0 - DAY, { suspended: true });
    const otherDeck = card(2, t0 - DAY, { deckId: newId() });
    const q = buildStudyQueue({ deck, cards: [...fresh, ...reviews, learning, notDue, suspended, otherDeck], reviews: [], now: t0 });
    expect(q.counts).toEqual({ learning: 1, review: 2, new: 2 });
    expect(q.cards[0]).toBe(learning);
    expect(q.cards.slice(1, 3)).toEqual([reviews[2], reviews[1]]);
    expect(q.cards.slice(3)).toEqual([fresh[2], fresh[1]]);
  });

  it('subtracts what was already studied today, ignoring yesterday', () => {
    const todays = [review(0, t0 - HOUR), review(2, t0 - HOUR), review(2, t0 - 2 * HOUR)];
    const yesterday = [review(0, t0 - DAY), review(0, t0 - DAY)];
    const q = buildStudyQueue({ deck, cards: [card(0, t0), card(0, t0), card(2, t0 - DAY)], reviews: [...todays, ...yesterday], now: t0 });
    expect(q.counts).toEqual({ learning: 0, review: 0, new: 1 });
  });

  it('learns ahead only when nothing else is due', () => {
    const soon = card(1, t0 + LEARN_AHEAD_MS - 1);
    expect(buildStudyQueue({ deck, cards: [soon], reviews: [], now: t0 }).cards).toEqual([soon]);
    expect(buildStudyQueue({ deck, cards: [soon, card(0, t0)], reviews: [], now: t0 }).counts.learning).toBe(0);
    expect(buildStudyQueue({ deck, cards: [card(1, t0 + LEARN_AHEAD_MS + 1)], reviews: [], now: t0 }).cards).toEqual([]);
  });
});

describe('stats', () => {
  it('counts states, retention and streak', () => {
    const cards = [card(0, t0), card(1, t0), card(2, t0), card(2, t0, { suspended: true })];
    const reviews = [review(2, t0 - HOUR, 3), review(2, t0 - HOUR, 1), review(0, t0 - DAY), review(0, t0 - 2 * DAY), review(0, t0 - 4 * DAY)];
    const s = computeStats(cards, reviews, t0);
    expect(s).toMatchObject({ total: 4, new: 1, learning: 1, review: 1, suspended: 1, reviewedToday: 2, retention30d: 0.5, streakDays: 3 });
    expect(computeStats([], [], t0).retention30d).toBeNull();
  });
});

describe('formatInterval', () => {
  it('formats each magnitude', () => {
    expect(formatInterval(0, 30_000)).toBe('<1m');
    expect(formatInterval(0, 10 * MINUTE)).toBe('10m');
    expect(formatInterval(0, 3 * HOUR)).toBe('3h');
    expect(formatInterval(0, 4 * DAY)).toBe('4d');
    expect(formatInterval(0, 61 * DAY)).toBe('2mo');
    expect(formatInterval(0, 548 * DAY)).toBe('1.5y');
  });
});
