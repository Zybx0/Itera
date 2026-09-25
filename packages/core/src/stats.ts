import type { Card, Review } from './model/schemas';
import { CardStates } from './model/schemas';
import { DAY_MS, studyDayStart } from './scheduler/day';

export interface DeckStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  suspended: number;
  reviewedToday: number;
  /** Share of non-"Again" answers on review cards over the last 30 days, or null without data. */
  retention30d: number | null;
  /** Consecutive study days ending today (or yesterday if nothing studied yet today). */
  streakDays: number;
}

export function computeStats(cards: Iterable<Card>, reviews: Iterable<Review>, now: number, rolloverHour?: number): DeckStats {
  const stats: DeckStats = { total: 0, new: 0, learning: 0, review: 0, suspended: 0, reviewedToday: 0, retention30d: null, streakDays: 0 };
  for (const c of cards) {
    stats.total++;
    if (c.suspended) stats.suspended++;
    else if (c.schedule.state === CardStates.New) stats.new++;
    else if (c.schedule.state === CardStates.Review) stats.review++;
    else stats.learning++;
  }

  const today = studyDayStart(now, rolloverHour);
  const since = now - 30 * DAY_MS;
  let passed = 0;
  let graded = 0;
  const days = new Set<number>();
  for (const r of reviews) {
    if (r.reviewedAt > now) continue;
    if (r.reviewedAt >= today) stats.reviewedToday++;
    if (r.reviewedAt >= since && r.stateBefore === CardStates.Review) {
      graded++;
      if (r.rating > 1) passed++;
    }
    days.add(studyDayStart(r.reviewedAt, rolloverHour));
  }
  stats.retention30d = graded > 0 ? passed / graded : null;

  let cursor = days.has(today) ? today : previousDay(today);
  while (days.has(cursor)) {
    stats.streakDays++;
    cursor = previousDay(cursor);
  }
  return stats;
}

function previousDay(dayStart: number): number {
  const d = new Date(dayStart);
  d.setDate(d.getDate() - 1);
  return d.getTime();
}
