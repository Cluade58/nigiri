// Streaks, the study calendar and the totals (D66, D67). Everything is counted from saved reviews and
// cards: nothing new is stored, so Restore and Export carry it all. Days are the phone's local calendar
// days (D58). Pure: every function takes `now`; none reads the clock.
import type { Card, Review } from './db';
import { addDaysToKey, daysBetweenKeys, localDayKey, parseDayKey } from './time';

export type ReviewLite = Pick<Review, 'cardId' | 'reviewTime'>;

/** Different cards reviewed on each local day that has at least one saved review. */
export function cardsPerDay(reviews: readonly ReviewLite[]): Map<string, number> {
  const sets = new Map<string, Set<string>>();
  for (const r of reviews) {
    const key = localDayKey(r.reviewTime);
    let set = sets.get(key);
    if (!set) sets.set(key, (set = new Set()));
    set.add(r.cardId);
  }
  return new Map([...sets].map(([k, s]) => [k, s.size]));
}

export interface Streak {
  current: number;
  best: number;
}

/**
 * D67: consecutive local days with at least one saved review. The current streak counts today if you
 * reviewed today, otherwise it runs through yesterday (so it isn't 0 in the morning); 0 otherwise.
 * Best is the longest run ever.
 */
export function streakOf(days: ReadonlySet<string> | ReadonlyMap<string, unknown>, now: Date): Streak {
  const has = (k: string) => days.has(k);
  const today = localDayKey(now);
  let current = 0;
  let cursor = has(today) ? today : addDaysToKey(today, -1);
  while (has(cursor)) {
    current += 1;
    cursor = addDaysToKey(cursor, -1);
  }
  const keys = [...days.keys()].filter((k): k is string => typeof k === 'string' && parseDayKey(k) !== null).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    run = prev !== null && daysBetweenKeys(prev, k) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = k;
  }
  return { current, best: Math.max(best, current) };
}

export interface CalendarCell {
  key: string;
  /** Day of the month. */
  date: number;
  /** Month index 0–11. */
  month: number;
  count: number;
  isToday: boolean;
  isFuture: boolean;
}

/** Monday = 0 … Sunday = 6, for a local day key. */
function weekdayMon0(key: string): number {
  const p = parseDayKey(key)!;
  return (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7;
}

/**
 * The last `weeks` weeks as rows of 7 days, Monday first (settlement 2), the last row holding today.
 * Days after today are marked future (drawn blank).
 */
export function calendarWeeks(perDay: ReadonlyMap<string, number>, now: Date, weeks: number): CalendarCell[][] {
  const today = localDayKey(now);
  const lastMonday = addDaysToKey(today, -weekdayMon0(today));
  const first = addDaysToKey(lastMonday, -7 * (weeks - 1));
  const rows: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDaysToKey(first, w * 7 + d);
      const p = parseDayKey(key)!;
      const isFuture = key > today;
      row.push({ key, date: p.d, month: p.m - 1, count: isFuture ? 0 : (perDay.get(key) ?? 0), isToday: key === today, isFuture });
    }
    rows.push(row);
  }
  return rows;
}

/** The last `n` local days ending today, oldest first, with different cards reviewed on each. */
export function lastDays(perDay: ReadonlyMap<string, number>, now: Date, n: number): { key: string; count: number; isToday: boolean }[] {
  const today = localDayKey(now);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addDaysToKey(today, -i);
    out.push({ key, count: perDay.get(key) ?? 0, isToday: i === 0 });
  }
  return out;
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Done's strip (pass 2 R2): the last 7 local days ending today, oldest first, each with its own weekday
 * initial, so a streak across Sunday shows on Monday too.
 */
export function stripDays(perDay: ReadonlyMap<string, number>, now: Date): { key: string; letter: string; count: number; isToday: boolean }[] {
  return lastDays(perDay, now, 7).map((d) => ({ ...d, letter: WEEKDAY_INITIALS[weekdayMon0(d.key)] }));
}

/** How many of the last `n` local days (today included) had a review. */
export function daysStudiedIn(perDay: ReadonlyMap<string, number>, now: Date, n: number): number {
  return lastDays(perDay, now, n).filter((d) => d.count > 0).length;
}

/** The study calendar's colour step for a day (plan §6): 0 none, 1 for 1–9, 2 for 10–29, 3 for 30+. */
export function heatStep(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count < 10) return 1;
  if (count < 30) return 2;
  return 3;
}

export interface Totals {
  daysStudied: number;
  /** The calendar's numbers added up: different cards reviewed each day, summed over every day. */
  cardsReviewed: number;
  cardsMade: number;
}

export function totalsOf(perDay: ReadonlyMap<string, number>, cards: readonly Pick<Card, 'id'>[]): Totals {
  let cardsReviewed = 0;
  for (const n of perDay.values()) cardsReviewed += n;
  return { daysStudied: perDay.size, cardsReviewed, cardsMade: cards.length };
}
