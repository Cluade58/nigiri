// D69: the return times on the rating keys, on the real pinned ts-fsrs 6.0.0 with a fixed clock.
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { GRADES, State, formatReturn, previewDue, reviewCard } from '../src/lib/scheduler';
import { saveRating, snapshotOf } from '../src/lib/saves';
import { DAY, MIN, SEC, T0, at, freshDb, makeCard, putDeck, rate, scheduler } from './helpers';

const plain = (s: string) => s.replace(/\u00A0/g, ' ');
const label = (ms: number) => plain(formatReturn(ms));

describe('previewDue matches what a tap saves (a)', () => {
  it('for a new card, a learning card after Again, and a review card', async () => {
    const s = await scheduler();
    const fresh = makeCard(s, 'd', T0);
    const learning = rate(s, fresh, Rating.Again, T0);
    let review = rate(s, fresh, Rating.Good, T0);
    review = rate(s, review, Rating.Good, review.dueAt);
    expect(learning.state).toBe(State.Learning);
    expect(review.state).toBe(State.Review);

    const cases = [
      { card: fresh, t: at(5 * SEC) },
      { card: learning, t: at(70 * SEC) },
      { card: review, t: new Date(review.dueAt.getTime() + 3 * MIN) },
    ];
    for (const { card, t } of cases) {
      const p = previewDue(s, card, t);
      for (const g of GRADES) expect(p.dueAt[g].getTime()).toBe(reviewCard(s, card, g, t).card.dueAt.getTime());
    }
  });
});

describe('a preview saves nothing and changes nothing (b)', () => {
  it('leaves the card as it was and the reviews table unchanged', async () => {
    const s = await scheduler();
    const db = await freshDb();
    const deck = await putDeck(db);
    const card = makeCard(s, deck.id, T0);
    await db.cards.add(card);
    await saveRating(db, s, snapshotOf(card), Rating.Good, at(10 * SEC));
    const stored = (await db.cards.get(card.id))!;
    const before = structuredClone(stored);
    const count = await db.reviews.count();
    previewDue(s, stored, at(6 * DAY));
    expect(stored).toEqual(before);
    expect(await db.reviews.count()).toBe(count);
    expect(await db.cards.get(card.id)).toEqual(before);
  });
});

describe('a tap a few seconds after the answer shows (c)', () => {
  it('gives the same step labels and the same day-rounded label', async () => {
    const s = await scheduler();
    const fresh = makeCard(s, 'd', T0);
    const reveal = at(30 * SEC);
    const tap = new Date(reveal.getTime() + 5 * SEC);
    const shown = previewDue(s, fresh, reveal);
    const saved = (g: (typeof GRADES)[number]) => reviewCard(s, fresh, g, tap).card.dueAt.getTime() - tap.getTime();
    for (const g of GRADES) expect(label(shown.dueAt[g].getTime() - shown.from.getTime())).toBe(label(saved(g)));
    expect(label(shown.dueAt[Rating.Again].getTime() - shown.from.getTime())).toBe('1 min');
    expect(label(shown.dueAt[Rating.Hard].getTime() - shown.from.getTime())).toBe('90 sec');
  });
});

describe('formatReturn (d)', () => {
  it.each([
    [60 * SEC, '1 min'],
    [90 * SEC, '90 sec'],
    [119 * SEC, '119 sec'],
    [10 * MIN, '10 min'],
    [3 * 60 * MIN, '3 hours'],
    [1.0 * DAY, '1 day'],
    [4.78 * DAY, '5 days'],
    [33.3 * DAY, '1 month'],
    [200 * DAY, '7 months'],
    [365.25 * DAY, '1 year'],
    [800 * DAY, '2 years'],
    [36_500 * DAY, '100 years'],
    [90_000 * DAY, '100 years'],
  ])('%d ms is "%s"', (ms, text) => {
    expect(label(ms)).toBe(text);
  });
  it('keeps the number and its unit together', () => {
    expect(formatReturn(5 * DAY)).toBe('5\u00A0days');
  });
});

describe('a clock moved back (e)', () => {
  it("doesn't throw, and measures from the card's last review", async () => {
    const s = await scheduler();
    const card = rate(s, makeCard(s, 'd', T0), Rating.Good, at(60 * MIN));
    const reveal = T0; // an hour before the card's lastReviewAt
    expect(() => previewDue(s, card, reveal)).not.toThrow();
    const p = previewDue(s, card, reveal);
    expect(p.from.getTime()).toBe(card.lastReviewAt!.getTime());
    for (const g of GRADES) expect(p.dueAt[g].getTime()).toBeGreaterThanOrEqual(p.from.getTime());
  });
});
