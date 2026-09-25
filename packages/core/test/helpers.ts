import { Collection, generateKey, MemoryRecordStore } from '../src';

/** Fixed local-time clock that tests can advance. */
export function makeClock(start = new Date(2026, 0, 15, 10, 0, 0).getTime()) {
  let now = start;
  return {
    now: () => now,
    advance(ms: number) {
      now += ms;
    },
    set(ms: number) {
      now = ms;
    },
  };
}

export async function openCollection(options: { store?: MemoryRecordStore; key?: Uint8Array; clock?: ReturnType<typeof makeClock> } = {}) {
  const store = options.store ?? new MemoryRecordStore();
  const key = options.key ?? generateKey();
  const clock = options.clock ?? makeClock();
  const { collection, report } = await Collection.open(store, key, { clock: clock.now });
  return { collection, report, store, key, clock };
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
