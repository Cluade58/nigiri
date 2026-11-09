// Pass 2 (D76, D77): Done's 7-day strip, its "This session" rows and "Next" line, and the practice
// round's shuffle. Local days are New York's (tests/setup.ts); T0 is Monday 9 Nov 2026, 10:00.
import { describe, expect, it } from 'vitest';
import type { Card, Deck, Test } from '../src/lib/db';
import { heldBackDueTomorrow, nextDueLine, sessionDeckRows } from '../src/lib/doneSummary';
import { shuffled } from '../src/lib/practice';
import { cardsPerDay, daysStudiedIn, stripDays } from '../src/lib/progress';
import { T0, makeCard, rate, scheduler } from './helpers';
import { Rating } from 'ts-fsrs';

/** A local moment `days` calendar days after T0's day, at `hour`. */
const dayAt = (days: number, hour = 9) => new Date(T0.getFullYear(), T0.getMonth(), T0.getDate() + days, hour, 0);
const deck = (id: string, name: string): Deck => ({ id, name, colour: 'green', createdAt: T0 });

describe("Done's strip: the last 7 days ending today (R2)", () => {
  it('on a Monday runs Tuesday to Monday, each with its own initial, today last', () => {
    const days = stripDays(new Map(), T0);
    expect(days.map((d) => d.key)).toEqual(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']);
    expect(days.map((d) => d.letter)).toEqual(['T', 'W', 'T', 'F', 'S', 'S', 'M']);
    expect(days.map((d) => d.isToday)).toEqual([false, false, false, false, false, false, true]);
  });
  it('a streak across Sunday shows both days on Monday', () => {
    const perDay = cardsPerDay([
      { cardId: 'a', reviewTime: dayAt(-1, 20) }, // Sunday evening
      { cardId: 'b', reviewTime: dayAt(0, 8) }, // Monday morning
    ]);
    const days = stripDays(perDay, T0);
    expect(days.slice(-2).map((d) => [d.letter, d.count])).toEqual([
      ['S', 1],
      ['M', 1],
    ]);
    expect(daysStudiedIn(perDay, T0, 7)).toBe(2);
  });
  it('on a Thursday ends on Thursday', () => {
    const thu = dayAt(3, 10);
    expect(stripDays(new Map(), thu).map((d) => d.letter)).toEqual(['F', 'S', 'S', 'M', 'T', 'W', 'T']);
  });
});

describe('"This session" rows (R3)', () => {
  const decks = [deck('b', 'Biology'), deck('c', 'Chemistry'), deck('a', 'Art')];
  const cards = [
    { id: '1', deckId: 'b' },
    { id: '2', deckId: 'b' },
    { id: '3', deckId: 'c' },
    { id: '4', deckId: 'a' },
    { id: '5', deckId: 'c' },
    { id: '6', deckId: 'a' },
  ];
  it('one row per deck rated, highest count first, ties by name', () => {
    const rows = sessionDeckRows(new Set(['1', '2', '3', '4', '6']), cards, decks);
    expect(rows.map((r) => [r.deck.name, r.count])).toEqual([
      ['Art', 2],
      ['Biology', 2],
      ['Chemistry', 1],
    ]);
  });
  it('leaves out decks with nothing rated, and is empty for an empty session', () => {
    expect(sessionDeckRows(new Set(['3']), cards, decks).map((r) => r.deck.name)).toEqual(['Chemistry']);
    expect(sessionDeckRows(new Set(), cards, decks)).toEqual([]);
  });
});

describe('"Next" line (R3)', () => {
  it('counts the cards on the first day after today with any due', () => {
    const cards = [{ dueAt: dayAt(1, 9) }, { dueAt: dayAt(1, 22) }, { dueAt: dayAt(2) }, { dueAt: dayAt(0, 23) }, { dueAt: dayAt(-3) }];
    expect(nextDueLine(cards, T0)).toBe('Next: 2 cards tomorrow.');
  });
  it('"1 card"', () => {
    expect(nextDueLine([{ dueAt: dayAt(1) }, { dueAt: dayAt(5) }], T0)).toBe('Next: 1 card tomorrow.');
  });
  it('a weekday within 6 days', () => {
    expect(nextDueLine([{ dueAt: dayAt(3) }, { dueAt: dayAt(3, 18) }], T0)).toBe('Next: 2 cards on Thursday.');
    expect(nextDueLine([{ dueAt: dayAt(6) }], T0)).toBe('Next: 1 card on Sunday.');
  });
  it('the date from 7 days on', () => {
    expect(nextDueLine([{ dueAt: dayAt(7) }], T0)).toBe('Next: 1 card on Nov 16.');
    expect(nextDueLine([{ dueAt: dayAt(11) }, { dueAt: dayAt(11) }, { dueAt: dayAt(11) }], T0)).toBe('Next: 3 cards on Nov 20.');
  });
  it('nothing due after today: no line', () => {
    expect(nextDueLine([{ dueAt: dayAt(0, 23) }, { dueAt: dayAt(-1) }], T0)).toBeNull();
    expect(nextDueLine([], T0)).toBeNull();
  });
});

describe('"Next" line with Test mode holding new cards back (R5, CR-7 m1, D78)', () => {
  /** `n` new cards in deck `deckId`, written a minute apart before `at`. */
  async function newCards(deckId: string, n: number, at: Date): Promise<Card[]> {
    const s = await scheduler();
    return Array.from({ length: n }, (_, i) => makeCard(s, deckId, new Date(at.getTime() - (n - i) * 60_000)));
  }
  /** Rated Good at `at`, so it's studied and due on a later day; firstReviewAt records it. */
  async function studied(card: Card, at: Date): Promise<Card> {
    return rate(await scheduler(), card, Rating.Good, at);
  }
  function line(cards: Card[], tests: Map<string, Test>, first: Map<string, Date>, now: Date) {
    return nextDueLine(cards, now, heldBackDueTomorrow(cards, tests, first, now));
  }

  it("a test deck with held-back new cards and nothing else due later: tomorrow's share, tomorrow", async () => {
    // Test Friday (4 days left): 8 new, 3 first seen today. Today: ceil(11/4) - 3 = 0, so all 8 are
    // held back. Tomorrow (3 days left): ceil(8/3) = 3.
    const now = dayAt(0, 18);
    const fresh = await newCards('d', 11, dayAt(-1));
    const first = new Map<string, Date>();
    const done: Card[] = [];
    for (const c of fresh.slice(0, 3)) {
      const r = await studied(c, dayAt(0, 9));
      done.push({ ...r, dueAt: dayAt(9) }); // studied, next due well after the share's day
      first.set(c.id, dayAt(0, 9));
    }
    const cards = [...done, ...fresh.slice(3)];
    const tests = new Map<string, Test>([['d', { deckId: 'd', date: '2026-11-13' }]]);
    const held = heldBackDueTomorrow(cards, tests, first, now);
    expect(held.size).toBe(3);
    expect(line(cards, tests, first, now)).toBe('Next: 3 cards tomorrow.');
  });

  it('never more than the held-back count', async () => {
    // Test tomorrow: tomorrow's share is every unseen card, but only the held-back ones count.
    const now = dayAt(0, 18);
    const fresh = await newCards('d', 4, dayAt(-1));
    const first = new Map<string, Date>();
    const r = await studied(fresh[0], dayAt(0, 9));
    first.set(fresh[0].id, dayAt(0, 9));
    const cards = [{ ...r, dueAt: dayAt(9) }, ...fresh.slice(1)];
    const tests = new Map<string, Test>([['d', { deckId: 'd', date: '2026-11-10' }]]);
    // Today: ceil(4/1) - 1 = 3 allowed, so nothing is held back and nothing extra counts.
    expect(heldBackDueTomorrow(cards, tests, first, now).size).toBe(0);
  });

  it('a deck without a test is unchanged', async () => {
    const now = dayAt(0, 18);
    const fresh = await newCards('d', 3, dayAt(-1));
    const r = await studied(fresh[0], dayAt(0, 9));
    const cards = [{ ...r, dueAt: dayAt(2) }, ...fresh.slice(1)];
    expect(heldBackDueTomorrow(cards, new Map(), new Map(), now).size).toBe(0);
    expect(line(cards, new Map(), new Map(), now)).toBe(nextDueLine(cards, now));
    expect(line(cards, new Map(), new Map(), now)).toBe('Next: 1 card on Wednesday.');
  });

  it('Dec 31 to Jan 1: tomorrow is the new year', async () => {
    const now = new Date(2026, 11, 31, 18, 0);
    const fresh = await newCards('d', 10, new Date(2026, 11, 30));
    const first = new Map<string, Date>();
    const done: Card[] = [];
    for (const c of fresh.slice(0, 2)) {
      const r = await studied(c, new Date(2026, 11, 31, 9));
      done.push({ ...r, dueAt: new Date(2027, 0, 3, 9) });
      first.set(c.id, new Date(2026, 11, 31, 9));
    }
    const cards = [...done, ...fresh.slice(2)];
    // Test Jan 5: today ceil(10/5) - 2 = 0, so 8 held back. Jan 1 (4 days left): ceil(8/4) = 2.
    const tests = new Map<string, Test>([['d', { deckId: 'd', date: '2027-01-05' }]]);
    expect(line(cards, tests, first, now)).toBe('Next: 2 cards tomorrow.');
  });
});

describe('practice shuffle (D77)', () => {
  it('keeps every card once and leaves the input alone', () => {
    const input = Array.from({ length: 30 }, (_, i) => i);
    const out = shuffled(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual(Array.from({ length: 30 }, (_, i) => i));
  });
  it('uses the random source it is given', () => {
    // random() = 0 always swaps with the first item.
    expect(shuffled([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});
