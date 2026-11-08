// D63: Test mode's daily share is a pace, not a limit. The deck page's "Study 3 cards early" starts a
// session with computeDue's includeHeldBack option, and the share recomputes after it. Fixed clock and
// time zone: T0 is Monday 9 November 2026, 10:00 in New York (tests/setup.ts).
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { Card, Test } from '../src/lib/db';
import { computeDue, leftCount, pickNext } from '../src/lib/queue';
import { isNewCard } from '../src/lib/scheduler';
import { planLine, studyEarlyCount } from '../src/lib/testCopy';
import { DAY, SEC, T0, makeCard, rate, scheduler } from './helpers';

const TEST_DAY = '2026-11-14'; // Saturday: 5 days left, so 10 new cards make a share of 2 a day
const tests = new Map<string, Test>([['D', { deckId: 'D', date: TEST_DAY }]]);

async function deck() {
  const s = await scheduler();
  // A studied card that's overdue, then 10 new cards in writing order (made yesterday).
  const studied = rate(s, makeCard(s, 'D', new Date(T0.getTime() - 10 * DAY), 'old'), Rating.Good, new Date(T0.getTime() - 10 * DAY));
  const fresh = Array.from({ length: 10 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i * SEC), `c${i}`));
  // Another deck with no test, written after them: its new cards are due either way.
  const other = makeCard(s, 'E', new Date(T0.getTime() - DAY + 20 * SEC), 'e0');
  return { s, cards: [...fresh, other, studied] };
}

describe('the includeHeldBack option (D63)', () => {
  it('without it, the share holds 8 of 10 new cards back; with it, every new card is due, in the same order', async () => {
    const { cards } = await deck();
    const normal = computeDue({ cards, tests, firstReviewAt: new Map(), now: T0 });
    expect(normal.due.map((c) => c.front)).toEqual(['old', 'c0', 'c1', 'e0']);
    expect(normal.heldBack.size).toBe(8);

    const early = computeDue({ cards, tests, firstReviewAt: new Map(), now: T0 }, { includeHeldBack: true });
    // Studied cards most overdue first, then new cards in writing order (D3); nothing is held back.
    expect(early.due.map((c) => c.front)).toEqual(['old', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'e0']);
    expect(early.heldBack.size).toBe(0);
    // The share itself is the same: the option changes what the session queues, not the plan.
    expect([...early.shares.get('D')!.allowed]).toEqual([...normal.shares.get('D')!.allowed]);
    // From the deck page the session is that deck only.
    const deckOnly = computeDue({ cards: cards.filter((c) => c.deckId === 'D'), tests, firstReviewAt: new Map(), now: T0 }, { includeHeldBack: true });
    expect(deckOnly.due).toHaveLength(11);
  });

  it('a study-ahead session works like any other: N left, then the share recomputes to "none left today"', async () => {
    const { s, cards: all } = await deck();
    let cards = all.filter((c) => c.deckId === 'D');
    const firstReviewAt = new Map<string, Date>();
    const session = new Set<string>();
    const before = new Map(cards.map((c) => [c.id, c.dueAt.getTime()]));
    let now = T0;
    const early = () => computeDue({ cards, tests, firstReviewAt, now }, { includeHeldBack: true }).due;
    expect(leftCount(early(), cards, session, now)).toBe(11);

    // Rate the overdue card and the first 5 new cards Good, then stop (the ✕).
    const rated: string[] = [];
    for (let i = 0; i < 6; i++) {
      const pick = pickNext(early(), cards, session, now);
      if (pick.kind !== 'card') throw new Error(`expected a card, got ${pick.kind}`);
      rated.push(pick.card.front);
      const next = rate(s, pick.card, Rating.Good, now);
      if (isNewCard(pick.card)) firstReviewAt.set(next.id, now);
      cards = cards.map((c) => (c.id === next.id ? next : c));
      session.add(next.id);
      now = new Date(now.getTime() + 10 * SEC);
    }
    expect(rated).toEqual(['old', 'c0', 'c1', 'c2', 'c3', 'c4']);
    expect(leftCount(early(), cards, session, now)).toBe(5);

    // Back on the deck page: 5 first seen today ≥ today's share of ⌈10 ÷ 5⌉ = 2, so none left today,
    // and the other 5 can still be studied early.
    const page = computeDue({ cards, tests, firstReviewAt, now });
    const share = page.shares.get('D')!;
    expect(share.share).toBe(0);
    expect(page.due).toHaveLength(0);
    expect(page.heldBack.size).toBe(5);
    expect(planLine(share, TEST_DAY, now)).toBe('5 not studied yet: none left today, all by Friday');

    // Studying ahead wrote only the rated cards: every other card's dueAt is what it was.
    const ratedIds = new Set([...session]);
    for (const c of cards) if (!ratedIds.has(c.id)) expect(c.dueAt.getTime()).toBe(before.get(c.id));

    // Tomorrow the share spreads what's left: 5 over 4 days, so 2.
    const tomorrow = new Date(T0.getTime() + DAY);
    const next = computeDue({ cards, tests, firstReviewAt: new Map(), now: tomorrow });
    expect(next.shares.get('D')!.share).toBe(2);
  });

  it('studying every held-back card leaves nothing held back, and the plan line goes', async () => {
    const { s, cards: all } = await deck();
    let cards: Card[] = all.filter((c) => c.deckId === 'D');
    const firstReviewAt = new Map<string, Date>();
    for (const c of computeDue({ cards, tests, firstReviewAt, now: T0 }, { includeHeldBack: true }).due) {
      const next = rate(s, c, Rating.Good, T0);
      if (isNewCard(c)) firstReviewAt.set(c.id, T0);
      cards = cards.map((x) => (x.id === next.id ? next : x));
    }
    const page = computeDue({ cards, tests, firstReviewAt, now: T0 });
    expect(page.heldBack.size).toBe(0);
    expect(page.shares.get('D')!.unseen).toBe(0);
    expect(planLine(page.shares.get('D')!, TEST_DAY, T0)).toBeNull();
  });
});


// LS-2's W1 and W2, over a week. Every expected number below was worked out by hand from spec §2's
// rule, not read back from the code: today's share = ⌈(unseen + first seen today) ÷ days left⌉ − first
// seen today, never below 0, where days left counts calendar days to the test day. "pill" is the N in
// the deck page's "Study N cards early" (none on test day or the day before).
describe('the share over a week after studying early (LS-2 W1, W2)', () => {
  /** n days after Monday 9 November, 10:00 in New York (no clock change that week). */
  const day = (n: number, plusMs = 0) => new Date(T0.getTime() + n * DAY + plusMs);

  function week(s: Awaited<ReturnType<typeof scheduler>>, testDay: string, start: Card[]) {
    const weekTests = new Map<string, Test>([['D', { deckId: 'D', date: testDay }]]);
    let cards = start;
    const firstReviewAt = new Map<string, Date>();
    return {
      add(more: Card[]) {
        cards = [...cards, ...more];
      },
      /** What the deck page shows at `now`. */
      page(now: Date) {
        const r = computeDue({ cards, tests: weekTests, firstReviewAt, now });
        const share = r.shares.get('D')!;
        return {
          share: share.share,
          unseen: share.unseen,
          newDue: r.due.filter(isNewCard).map((c) => c.front),
          pill: studyEarlyCount(r.heldBack.size, testDay, now),
          line: planLine(share, testDay, now),
        };
      },
      /**
       * A session from the deck page that rates Good, in queue order, the first `limit` new cards: the
       * due ones, or every new card when studying early. Returns the fronts it rated.
       */
      study(now: Date, { early = false, limit = Infinity } = {}) {
        const queue = computeDue({ cards, tests: weekTests, firstReviewAt, now }, { includeHeldBack: early }).due.filter(isNewCard);
        const picked = queue.slice(0, limit);
        picked.forEach((c, i) => {
          const t = new Date(now.getTime() + i * 10 * SEC);
          const next = rate(s, c, Rating.Good, t);
          firstReviewAt.set(c.id, t);
          cards = cards.map((x) => (x.id === next.id ? next : x));
        });
        return picked.map((c) => c.front);
      },
    };
  }

  it('W1: 12 new cards, test Sunday 15 November; 6 studied early on Monday, then 2 on Tuesday and 1 a day to Saturday', async () => {
    const s = await scheduler();
    const fresh = Array.from({ length: 12 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i * SEC), `c${i}`));
    const w = week(s, '2026-11-15', fresh);

    // Monday: 6 days left. ⌈12 ÷ 6⌉ = 2 due (c0, c1); the other 10 are held back.
    expect(w.page(day(0))).toEqual({ share: 2, unseen: 12, newDue: ['c0', 'c1'], pill: 10, line: '12 not studied yet: 2 today, all by Saturday' });

    // An early session rates c0–c5 Good, then stops. ⌈(6 + 6) ÷ 6⌉ − 6 = −4, so 0: none left today.
    expect(w.study(day(0), { early: true, limit: 6 })).toEqual(['c0', 'c1', 'c2', 'c3', 'c4', 'c5']);
    expect(w.page(day(0, 5 * 60 * SEC))).toEqual({
      share: 0,
      unseen: 6,
      newDue: [],
      pill: 6,
      line: '6 not studied yet: none left today, all by Saturday',
    });

    // Tuesday to Saturday, studying each day's share: 5, 4, 3, 2 and 1 days left over 6, 4, 3, 2 and 1
    // unseen cards gives ⌈6/5⌉ = 2, then ⌈4/4⌉, ⌈3/3⌉, ⌈2/2⌉ and ⌈1/1⌉ = 1 each.
    const expected = [
      { share: 2, unseen: 6, newDue: ['c6', 'c7'], pill: 4, line: '6 not studied yet: 2 today, all by Saturday' },
      { share: 1, unseen: 4, newDue: ['c8'], pill: 3, line: '4 not studied yet: 1 today, all by Saturday' },
      { share: 1, unseen: 3, newDue: ['c9'], pill: 2, line: '3 not studied yet: 1 today, all by Saturday' },
      { share: 1, unseen: 2, newDue: ['c10'], pill: 1, line: '2 not studied yet: 1 today, all by tomorrow' },
      // Saturday, the day before the test: the last card is due and nothing is held back.
      { share: 1, unseen: 1, newDue: ['c11'], pill: 0, line: '1 not studied yet, all due today' },
    ];
    const shares: number[] = [];
    expected.forEach((want, i) => {
      const now = day(i + 1);
      const got = w.page(now);
      expect(got, `day ${i + 1}`).toEqual(want);
      shares.push(got.share);
      expect(w.study(now)).toEqual(want.newDue);
    });
    // The invariant: the daily shares from Tuesday add up to what was unseen after Monday.
    expect(shares.reduce((a, b) => a + b, 0)).toBe(6);
    // Sunday, the test day: every card is studied, so there's no plan line and nothing to offer.
    expect(w.page(day(6))).toMatchObject({ unseen: 0, pill: 0, line: null });
  });

  it('W2: 10 new cards, test Saturday 14 November; all 10 studied early on Monday, then 5 more written', async () => {
    const s = await scheduler();
    const fresh = Array.from({ length: 10 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i * SEC), `c${i}`));
    const w = week(s, '2026-11-14', fresh);
    expect(w.page(day(0))).toMatchObject({ share: 2, pill: 8 });
    expect(w.study(day(0), { early: true })).toHaveLength(10);

    // 5 more written an hour later. ⌈(5 + 10) ÷ 5⌉ − 10 = −7, so 0: all 5 held back.
    w.add(Array.from({ length: 5 }, (_, i) => makeCard(s, 'D', day(0, 60 * 60 * SEC + i * SEC), `n${i}`)));
    expect(w.page(day(0, 2 * 60 * 60 * SEC))).toEqual({
      share: 0,
      unseen: 5,
      newDue: [],
      pill: 5,
      line: '5 not studied yet: none left today, all by Friday',
    });

    // Tuesday: 4 days left and nothing first seen today, so ⌈5 ÷ 4⌉ = 2.
    expect(w.page(day(1))).toEqual({
      share: 2,
      unseen: 5,
      newDue: ['n0', 'n1'],
      pill: 3,
      line: '5 not studied yet: 2 today, all by Friday',
    });
  });
});
