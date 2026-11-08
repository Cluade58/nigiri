// Session order and waiting (spec §2, D3, D22), fixed clock.
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { Card } from '../src/lib/db';
import type { Grade } from '../src/lib/scheduler';
import { WAIT_WINDOW_MS, computeDue, leftCount, pickNext, progressFraction } from '../src/lib/queue';
import { DAY, SEC, T0, at, makeCard, rate, scheduler } from './helpers';

const none = new Map();
const due = (cards: Card[], now: Date) => computeDue({ cards, tests: none, firstReviewAt: none, now }).due;

describe('session order across two decks', () => {
  it('studied cards most overdue first, then new cards in writing order; a learning card that comes due goes before the remaining new cards', async () => {
    const s = await scheduler();
    // Deck B has a card studied long ago, now overdue; both decks have new cards.
    let b0 = makeCard(s, 'B', at(-10 * DAY), 'b0');
    b0 = rate(s, b0, Rating.Good, at(-10 * DAY)); // due about 4.8 days later: overdue at T0
    const a1 = makeCard(s, 'A', at(1 * SEC), 'a1');
    const a2 = makeCard(s, 'A', at(2 * SEC), 'a2');
    const b1 = makeCard(s, 'B', at(3 * SEC), 'b1');
    let cards = [b1, a2, a1, b0];
    const session = new Set<string>();
    const order: string[] = [];

    let now = at(10 * SEC);
    expect(due(cards, now).map((c) => c.front)).toEqual(['b0', 'a1', 'a2', 'b1']);

    const step = (grade: Grade) => {
      const d = due(cards, now);
      const pick = pickNext(d, cards, session, now);
      if (pick.kind !== 'card') throw new Error(`expected a card, got ${pick.kind}`);
      order.push(pick.card.front);
      const next = rate(s, pick.card, grade, now);
      cards = cards.map((c) => (c.id === next.id ? next : c));
      session.add(next.id);
    };

    step(Rating.Good); // b0
    step(Rating.Again); // a1: back in exactly 60 s
    now = new Date(now.getTime() + 10 * SEC);
    step(Rating.Good); // a2
    now = new Date(now.getTime() + 60 * SEC); // a1 is due again
    expect(due(cards, now).map((c) => c.front)).toEqual(['a1', 'b1']);
    step(Rating.Good); // a1 comes before b1, the remaining new card
    step(Rating.Good); // b1
    expect(order).toEqual(['b0', 'a1', 'a2', 'a1', 'b1']);
    expect(pickNext(due(cards, now), cards, session, now).kind).toBe('done');
  });

  it('from a deck page, only that deck is queued', async () => {
    const s = await scheduler();
    const cards = [makeCard(s, 'A', at(-2), 'a'), makeCard(s, 'B', at(-1), 'b')];
    expect(due(cards.filter((c) => c.deckId === 'A'), T0).map((c) => c.front)).toEqual(['a']);
  });
});

describe('waiting (90 s window)', () => {
  it('counts down to a session card due at exactly now + 90 s; at 91 s the session is Done', async () => {
    const s = await scheduler();
    const base = makeCard(s, 'A', T0);
    const in90 = { ...base, state: 1, reps: 1, lastReviewAt: T0, dueAt: new Date(T0.getTime() + WAIT_WINDOW_MS) } as Card;
    const in91 = { ...in90, dueAt: new Date(T0.getTime() + WAIT_WINDOW_MS + SEC) } as Card;
    const session = new Set([base.id]);

    const wait = pickNext([], [in90], session, T0);
    expect(wait.kind).toBe('wait');
    if (wait.kind === 'wait') expect(wait.dueAt.getTime() - T0.getTime()).toBe(90 * SEC);
    expect(leftCount([], [in90], session, T0)).toBe(1);

    expect(pickNext([], [in91], session, T0).kind).toBe('done');
    expect(leftCount([], [in91], session, T0)).toBe(0);
    // A card from outside this session is never waited for.
    expect(pickNext([], [in90], new Set(), T0).kind).toBe('done');
  });

  it('Again on a new card: it comes back in the same session, and with nothing else due the screen counts down to it', async () => {
    const s = await scheduler();
    const card = makeCard(s, 'A', T0);
    const session = new Set<string>([card.id]);
    const after = rate(s, card, Rating.Again, T0);
    const now = at(SEC);
    const pick = pickNext(due([after], now), [after], session, now);
    expect(pick.kind).toBe('wait');
    if (pick.kind === 'wait') expect(pick.dueAt.getTime() - now.getTime()).toBe(59 * SEC);
    // "12 left" keeps counting it, so Again leaves the count where it was.
    expect(leftCount(due([after], now), [after], session, now)).toBe(1);
    // At its due time it's shown again; never early.
    expect(pickNext(due([after], at(59 * SEC)), [after], session, at(59 * SEC)).kind).toBe('wait');
    const back = pickNext(due([after], at(60 * SEC)), [after], session, at(60 * SEC));
    expect(back.kind).toBe('card');
  });

  it('the bar is ratings saved ÷ (ratings saved + cards left)', () => {
    expect(progressFraction(6, 12)).toBeCloseTo(6 / 18);
    expect(progressFraction(0, 0)).toBe(1);
  });
});
