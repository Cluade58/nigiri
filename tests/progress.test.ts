// D67: streaks, the study calendar and the totals, counted from saved reviews in New York local days.
import { describe, expect, it } from 'vitest';
import { calendarWeeks, cardsPerDay, daysStudiedIn, heatStep, lastDays, streakOf, totalsOf } from '../src/lib/progress';
import { localDayKey } from '../src/lib/time';
import { DAY, T0, at } from './helpers';

/** Reviews of `cards` different cards on the local day `daysAgo` before T0 (Monday 9 Nov 2026, 10:00). */
function day(daysAgo: number, cards = 1, hour = 9) {
  const d = new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() - daysAgo, hour, 0);
  return Array.from({ length: cards }, (_, i) => ({ cardId: `c${i}`, reviewTime: d }));
}
const keysOf = (reviews: ReturnType<typeof day>) => cardsPerDay(reviews);

describe('streak (D67)', () => {
  it('counts today when you reviewed today', () => {
    expect(streakOf(keysOf([...day(0), ...day(1), ...day(2)]), T0)).toEqual({ current: 3, best: 3 });
  });
  it('runs through yesterday when today has no review yet', () => {
    expect(streakOf(keysOf([...day(1), ...day(2)]), T0)).toEqual({ current: 2, best: 2 });
  });
  it('is 0 when neither today nor yesterday has a review, and keeps the best', () => {
    expect(streakOf(keysOf([...day(2), ...day(3), ...day(4), ...day(5), ...day(9)]), T0)).toEqual({ current: 0, best: 4 });
  });
  it('a gap breaks the run; best is the longest run ever', () => {
    const reviews = [...day(0), ...day(1), ...day(3), ...day(4), ...day(5), ...day(6), ...day(7)];
    expect(streakOf(keysOf(reviews), T0)).toEqual({ current: 2, best: 5 });
  });
  it('empty history', () => {
    expect(streakOf(new Map(), T0)).toEqual({ current: 0, best: 0 });
    expect(totalsOf(new Map(), [])).toEqual({ daysStudied: 0, cardsReviewed: 0, cardsMade: 0 });
  });
  it('counts across the daylight-saving change (1 Nov 2026 in New York) by calendar days', () => {
    // 31 Oct 23:30 EDT, 1 Nov 00:30 EDT and 23:30 EST (the 25-hour day), 2 Nov 00:30 EST.
    const reviews = [
      { cardId: 'a', reviewTime: new Date(2026, 9, 31, 23, 30) },
      { cardId: 'a', reviewTime: new Date(2026, 10, 1, 0, 30) },
      { cardId: 'b', reviewTime: new Date(2026, 10, 1, 23, 30) },
      { cardId: 'a', reviewTime: new Date(2026, 10, 2, 0, 30) },
    ];
    const perDay = cardsPerDay(reviews);
    expect([...perDay.keys()].sort()).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(perDay.get('2026-11-01')).toBe(2);
    expect(streakOf(perDay, new Date(2026, 10, 2, 20, 0))).toEqual({ current: 3, best: 3 });
    expect(streakOf(perDay, new Date(2026, 10, 3, 8, 0))).toEqual({ current: 3, best: 3 });
  });
});

describe('cards per local day', () => {
  it('counts different cards, not reviews, and splits at local midnight', () => {
    const reviews = [
      { cardId: 'a', reviewTime: new Date(2026, 10, 8, 23, 59) },
      { cardId: 'a', reviewTime: new Date(2026, 10, 9, 0, 1) },
      { cardId: 'a', reviewTime: new Date(2026, 10, 9, 9, 0) },
      { cardId: 'b', reviewTime: new Date(2026, 10, 9, 9, 5) },
    ];
    const perDay = cardsPerDay(reviews);
    expect(perDay.get('2026-11-08')).toBe(1);
    expect(perDay.get('2026-11-09')).toBe(2);
    expect(totalsOf(perDay, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])).toEqual({ daysStudied: 2, cardsReviewed: 3, cardsMade: 3 });
  });
});

describe('the calendar (plan §6, settlement 2)', () => {
  it('8 rows of 7, Monday first, the last row holding today, later days blank', () => {
    const perDay = cardsPerDay([...day(0, 3), ...day(1, 12), ...day(20, 31)]);
    const weeks = calendarWeeks(perDay, T0, 8);
    expect(weeks).toHaveLength(8);
    for (const row of weeks) expect(row).toHaveLength(7);
    // T0 is a Monday, so today opens the last row and the other six are in the future.
    const last = weeks[7];
    expect(last[0]).toMatchObject({ key: '2026-11-09', isToday: true, count: 3, isFuture: false });
    expect(last.slice(1).every((c) => c.isFuture && c.count === 0)).toBe(true);
    expect(weeks[6][6]).toMatchObject({ key: '2026-11-08', count: 12 });
    expect(weeks[0][0].key).toBe('2026-09-21');
    const all = weeks.flat();
    expect(all.find((c) => c.key === localDayKey(at(-20 * DAY)))?.count).toBe(31);
    // Every row starts on a Monday.
    for (const row of weeks) expect(new Date(`${row[0].key}T12:00:00`).getDay()).toBe(1);
  });
  it('mid-week: today sits in its weekday column', () => {
    const wed = new Date(2026, 10, 11, 15, 0);
    const last = calendarWeeks(new Map(), wed, 8)[7];
    expect(last[2]).toMatchObject({ key: '2026-11-11', isToday: true });
    expect(last[3].isFuture).toBe(true);
    expect(last[1].isFuture).toBe(false);
  });
  it('colour steps', () => {
    expect([0, 1, 9, 10, 29, 30, 100].map(heatStep)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it('the last 7 days end today, and days studied counts the window', () => {
    const perDay = cardsPerDay([...day(0, 2), ...day(6, 4), ...day(7, 9)]);
    const seven = lastDays(perDay, T0, 7);
    expect(seven.map((d) => d.count)).toEqual([4, 0, 0, 0, 0, 0, 2]);
    expect(seven[6].isToday).toBe(true);
    expect(daysStudiedIn(perDay, T0, 7)).toBe(2);
    expect(daysStudiedIn(perDay, T0, 28)).toBe(3);
  });
});
