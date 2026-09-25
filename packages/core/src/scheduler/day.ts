/**
 * Like Anki, a "study day" does not start at midnight but at a rollover hour
 * (default 04:00 local time), so a late-night session counts for the day
 * that is ending.
 */
export const DEFAULT_ROLLOVER_HOUR = 4;

const DAY_MS = 86_400_000;

/** Epoch ms of the start of the study day containing `now` (local time). */
export function studyDayStart(now: number, rolloverHour: number = DEFAULT_ROLLOVER_HOUR): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), rolloverHour, 0, 0, 0);
  if (start.getTime() > now) start.setDate(start.getDate() - 1);
  return start.getTime();
}

/** Epoch ms of the start of the next study day. Uses calendar arithmetic so DST changes are handled. */
export function nextStudyDayStart(now: number, rolloverHour: number = DEFAULT_ROLLOVER_HOUR): number {
  const start = new Date(studyDayStart(now, rolloverHour));
  start.setDate(start.getDate() + 1);
  return start.getTime();
}

export { DAY_MS };
