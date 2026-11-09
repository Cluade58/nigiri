// What Today says (D41, D45, D50, D60), fixed clock in New York.
import { describe, expect, it } from 'vitest';
import type { Card, Deck, Test } from '../src/lib/db';
import { NBSP } from '../src/lib/copy';
import { cardsPerDay, lastDays } from '../src/lib/progress';
import { lastSevenDays, minutesLine, nextDueAt, nextDueLine, orderDecks, showWelcomeBack, todayTitle } from '../src/lib/today';
import { DAY, MIN, T0, at } from './helpers';

describe('minutes line (D41, D60)', () => {
  it('under a minute, exactly one, then rounded up', () => {
    expect(minutesLine(0)).toBeNull();
    expect(minutesLine(1)).toBe('Under a minute.');
    expect(minutesLine(2)).toBe('Under a minute.');
    expect(minutesLine(3)).toBe(`About 1${NBSP}minute.`);
    expect(minutesLine(4)).toBe(`About 2${NBSP}minutes.`);
    expect(minutesLine(18)).toBe(`About 6${NBSP}minutes.`);
    expect(minutesLine(47)).toBe(`About 16${NBSP}minutes.`);
  });
});

describe('welcome back (D45)', () => {
  const base = { now: T0, dueCount: 5, cardCreatedAts: [at(-10 * DAY)] };
  it('after 3 or more calendar days away, with cards due', () => {
    expect(showWelcomeBack({ ...base, lastReviewAt: at(-3 * DAY) })).toBe(true);
    expect(showWelcomeBack({ ...base, lastReviewAt: at(-2 * DAY) })).toBe(false);
    expect(showWelcomeBack({ ...base, lastReviewAt: at(-3 * DAY), dueCount: 0 })).toBe(false);
  });
  it('a card made since counts as activity, but not one made today', () => {
    expect(showWelcomeBack({ ...base, lastReviewAt: at(-5 * DAY), cardCreatedAts: [at(-1 * DAY)] })).toBe(false);
    expect(showWelcomeBack({ ...base, lastReviewAt: at(-5 * DAY), cardCreatedAts: [at(-5 * MIN)] })).toBe(true);
  });
  it('stays until the first rating that day', () => {
    expect(showWelcomeBack({ ...base, lastReviewAt: at(-1 * MIN) })).toBe(false);
  });
});

describe('last 7 days (D50)', () => {
  it("counts cards added, and each day's different cards reviewed added up, today and the 6 days before (D71)", () => {
    const cards = [{ createdAt: at(-6 * DAY) }, { createdAt: at(-7 * DAY) }, { createdAt: T0 }];
    const reviews = [
      { cardId: 'a', reviewTime: at(-1 * DAY) },
      { cardId: 'a', reviewTime: T0 },
      { cardId: 'b', reviewTime: at(-8 * DAY) },
    ];
    // Card a was reviewed on two days, so it counts on both: the line equals the bars' sum (D71).
    expect(lastSevenDays(cards, reviews, T0)).toEqual({ added: 2, reviewed: 2 });
  });
  it('two reviews of one card on the same day count once', () => {
    const reviews = [
      { cardId: 'a', reviewTime: at(-2 * MIN) },
      { cardId: 'a', reviewTime: at(-1 * MIN) },
    ];
    expect(lastSevenDays([], reviews, T0)).toEqual({ added: 0, reviewed: 1 });
  });
  it('equals the sum of the Last 7 days bars (QA-4 F1)', () => {
    const reviews = [
      ...['a', 'b', 'c'].map((cardId) => ({ cardId, reviewTime: at(-1 * DAY) })),
      ...['a', 'b'].map((cardId) => ({ cardId, reviewTime: at(-3 * DAY) })),
      ...['a', 'd'].map((cardId) => ({ cardId, reviewTime: T0 })),
      { cardId: 'e', reviewTime: at(-9 * DAY) },
    ];
    const bars = lastDays(cardsPerDay(reviews), T0, 7).reduce((sum, d) => sum + d.count, 0);
    expect(bars).toBe(7);
    expect(lastSevenDays([], reviews, T0).reviewed).toBe(bars);
  });
});

describe('next due (D50, D58)', () => {
  const card = (id: string, dueAt: Date) => ({ id, dueAt }) as Card;
  it('is the earliest dueAt of a card that is not due; a held-back new card counts from tomorrow', () => {
    const cards = [card('a', at(-1 * MIN)), card('b', at(3 * DAY)), card('c', at(2 * 60 * MIN))];
    expect(nextDueAt(cards, new Set(['a']), new Set(), T0)).toEqual(at(2 * 60 * MIN));
    expect(nextDueAt([card('n', at(-DAY)), card('b', at(3 * DAY))], new Set(), new Set(['n']), T0)).toEqual(new Date('2026-11-10T00:00:00-05:00'));
    expect(nextDueAt([], new Set(), new Set(), T0)).toBeNull();
  });
  it('says later today, tomorrow, a weekday, or a date', () => {
    expect(nextDueLine(new Date('2026-11-09T21:30:00Z'), T0, 'en-US')).toMatch(/^The next card is due at 4:30\sPM\.$/);
    expect(nextDueLine(new Date('2026-11-10T21:30:00Z'), T0)).toBe('The next card is due tomorrow.');
    expect(nextDueLine(new Date('2026-11-13T15:00:00Z'), T0)).toBe('The next card is due on Friday.');
    expect(nextDueLine(new Date('2026-11-23T15:00:00Z'), T0)).toBe(`The next card is due on Nov${NBSP}23.`);
    expect(todayTitle(T0)).toBe('Monday, Nov 9');
  });
});

describe('deck order (D41)', () => {
  it('decks with a test today or ahead first, soonest first (same day: newest first), then the rest newest first', () => {
    const deck = (id: string, created: number) => ({ id, name: id, colour: 'green', createdAt: at(created * DAY) }) as Deck;
    const decks = [deck('old', -30), deck('new', -1), deck('t-fri-old', -20), deck('t-fri-new', -2), deck('t-wed', -25), deck('t-past', -5)];
    const tests = new Map<string, Test>([
      ['t-fri-old', { deckId: 't-fri-old', date: '2026-11-13' }],
      ['t-fri-new', { deckId: 't-fri-new', date: '2026-11-13' }],
      ['t-wed', { deckId: 't-wed', date: '2026-11-11' }],
      ['t-past', { deckId: 't-past', date: '2026-11-08' }],
    ]);
    expect(orderDecks(decks, tests, T0).map((d) => d.id)).toEqual(['t-wed', 't-fri-new', 't-fri-old', 'new', 't-past', 'old']);
  });
});
