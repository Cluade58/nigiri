// Test mode (spec §5 "Step 3 also tests"; fsrs-notes §10 rules 1–7), fixed clock and time zone.
import { afterEach, describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { DEFAULT_SETTINGS, type Card, type Test } from '../src/lib/db';
import { computeDue } from '../src/lib/queue';
import { addCard, removeTest, saveRating, saveTest, snapshotOf } from '../src/lib/saves';
import { reviewCard } from '../src/lib/scheduler';
import { loadSnapshot, withSavedRating, type Snapshot } from '../src/lib/snapshot';
import { daysLeft, deckNewCardShare, fitCheck, newCardShare, testApplies } from '../src/lib/testMode';
import { localDayKey } from '../src/lib/time';
import { DAY, SEC, T0, freshDb, makeCard, putDeck, rate, scheduler } from './helpers';

// T0 is Monday 9 November, 10:00 in New York (tests/setup.ts).
const TODAY = '2026-11-09';
const tests = (deckId: string, date: string) => new Map<string, Test>([[deckId, { deckId, date }]]);
const localAt = (dayOffset: number) => new Date(T0.getTime() + dayOffset * DAY);

describe('the new-card share', () => {
  it('10 new cards and a test 5 days away: 2 a day, and none on test day', async () => {
    const s = await scheduler();
    expect(localDayKey(T0)).toBe(TODAY);
    const testDay = '2026-11-14';
    let cards: Card[] = Array.from({ length: 10 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i * SEC), `c${i}`));
    const firstReviewAt = new Map<string, Date>();
    const perDay: number[] = [];
    for (let day = 0; day <= 5; day++) {
      const now = localAt(day);
      firstReviewAt.clear(); // only today's first reviews matter for "first seen today"
      const before = computeDue({ cards, tests: tests('D', testDay), firstReviewAt, now });
      const newDue = before.due.filter((c) => c.state === 0);
      perDay.push(newDue.length);
      // Study today's share, in writing order.
      expect(newDue.map((c) => c.front)).toEqual([...newDue].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((c) => c.front));
      for (const c of newDue) {
        const next = rate(s, c, Rating.Good, now);
        cards = cards.map((x) => (x.id === c.id ? next : x));
        firstReviewAt.set(c.id, now);
      }
      // After today's share, no more new cards are due today.
      const after = computeDue({ cards, tests: tests('D', testDay), firstReviewAt, now });
      expect(after.due.filter((c) => c.state === 0)).toHaveLength(0);
    }
    expect(perDay).toEqual([2, 2, 2, 2, 2, 0]);
  });

  it('a missed day raises the share; a card added today joins the pool', () => {
    expect(newCardShare(10, 0, 5)).toBe(2);
    expect(newCardShare(8, 0, 3)).toBe(3); // missed a day
    expect(newCardShare(11, 0, 5)).toBe(3); // one more card
    expect(newCardShare(8, 3, 5)).toBe(0); // already studied 3 today
  });

  it('with the test tomorrow or today, every new card is due', async () => {
    const s = await scheduler();
    const cards = Array.from({ length: 7 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i)));
    for (const date of ['2026-11-10', TODAY]) {
      const r = computeDue({ cards, tests: tests('D', date), firstReviewAt: new Map(), now: T0 });
      expect(r.due).toHaveLength(7);
      expect(r.heldBack.size).toBe(0);
    }
    expect(daysLeft(TODAY, T0)).toBe(1);
    expect(daysLeft('2026-11-10', T0)).toBe(1);
  });

  it('the day after the test, the deck acts as if it has none', async () => {
    const s = await scheduler();
    const cards = Array.from({ length: 10 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i)));
    const yesterday = '2026-11-08';
    expect(testApplies({ deckId: 'D', date: yesterday }, T0)).toBe(false);
    const r = computeDue({ cards, tests: tests('D', yesterday), firstReviewAt: new Map(), now: T0 });
    expect(r.due).toHaveLength(10);
    // On the test day itself it still applies, until local midnight.
    const lateOnTestDay = new Date('2026-11-09T23:59:00-05:00');
    expect(testApplies({ deckId: 'D', date: TODAY }, lateOnTestDay)).toBe(true);
    expect(testApplies({ deckId: 'D', date: TODAY }, new Date('2026-11-10T00:00:00-05:00'))).toBe(false);
  });

  it('adding, editing or removing a test leaves every card unchanged', async () => {
    const s = await scheduler();
    const db = await freshDb();
    const deck = await putDeck(db);
    for (let i = 0; i < 5; i++) await addCard(db, s, { deckId: deck.id, front: `f${i}`, back: 'b' }, new Date(T0.getTime() + i));
    const first = (await db.cards.toArray())[0];
    await saveRating(db, s, snapshotOf(first), Rating.Good, T0);
    const before = await db.cards.toArray();
    await saveTest(db, deck.id, '2026-11-20');
    expect(await db.cards.toArray()).toEqual(before);
    await saveTest(db, deck.id, '2026-11-12');
    expect(await db.cards.toArray()).toEqual(before);
    await removeTest(db, deck.id);
    expect(await db.cards.toArray()).toEqual(before);
    expect(await db.tests.count()).toBe(0);
    await expect(saveTest(db, deck.id, '2026-02-30')).rejects.toThrow();
    db.close();
  });
});

describe('time zones keep the test day', () => {
  const zone = process.env.TZ;
  afterEach(() => {
    process.env.TZ = zone;
  });

  it('a phone moved to another time zone keeps the same test day', () => {
    const test: Test = { deckId: 'D', date: '2026-11-14' };
    for (const tz of ['America/New_York', 'Asia/Tokyo', 'Pacific/Auckland', 'America/Los_Angeles', 'Europe/London']) {
      process.env.TZ = tz;
      // Noon on the test day, local to that zone: it's "today" there, with 1 day left.
      const noon = new Date(2026, 10, 14, 12, 0, 0);
      expect(localDayKey(noon)).toBe('2026-11-14');
      expect(testApplies(test, noon)).toBe(true);
      expect(daysLeft(test.date, noon)).toBe(1);
      // The next local day it no longer applies, in every zone.
      expect(testApplies(test, new Date(2026, 10, 15, 0, 0, 1))).toBe(false);
      // Five local days before, 5 days left (calendar days, not 24-hour blocks).
      expect(daysLeft(test.date, new Date(2026, 10, 9, 23, 30))).toBe(5);
    }
    // The same moment can be a different local day in two zones; the stored day never moves.
    process.env.TZ = 'America/New_York';
    expect(daysLeft(test.date, T0)).toBe(5);
    process.env.TZ = 'Asia/Tokyo';
    expect(localDayKey(T0)).toBe('2026-11-10');
    expect(daysLeft(test.date, T0)).toBe(4);
    expect(test.date).toBe('2026-11-14');
  });

  it('daylight saving does not shorten a day', () => {
    process.env.TZ = 'America/New_York';
    // Clocks went back on 1 November 2026: the 25-hour day still counts as one calendar day.
    expect(daysLeft('2026-11-02', new Date(2026, 9, 31, 23, 0))).toBe(2);
  });
});

describe('the fit check', () => {
  it('adds up two decks with tests ahead, and ignores a past test', () => {
    const tests = [
      { deckId: 'A', cardCount: 35, test: { deckId: 'A', date: '2026-11-10' } }, // 1 day: 700 s
      { deckId: 'B', cardCount: 30, test: { deckId: 'B', date: '2026-11-12' } }, // 3 days: 200 s
      { deckId: 'C', cardCount: 99, test: { deckId: 'C', date: '2026-11-08' } }, // past: ignored
      { deckId: 'E', cardCount: 50, test: undefined },
    ];
    const fit = fitCheck(tests, 15, T0);
    expect(fit.decks.map((d) => [d.deckId, d.daysLeft, d.minutes])).toEqual([
      ['A', 1, 12],
      ['B', 3, 4],
    ]);
    // D61(3): the total is the sum of each deck's rounded-up minutes (12 + 4), not ⌈900 s⌉ = 15,
    // so "adds 4, so 16 in all" always adds up on screen.
    expect(fit.minutesNeeded).toBe(16);
    expect(fit.fits).toBe(false);
    expect(fitCheck(tests, 16, T0).fits).toBe(true);
    expect(fitCheck(tests, 15, T0).fits).toBe(false);
    expect(fit.overMax).toBe(false);
    expect(fit.allToday).toBe(false);
  });

  it('flags more than 120 minutes, and a test today divides by 1', () => {
    const fit = fitCheck([{ deckId: 'A', cardCount: 400, test: { deckId: 'A', date: TODAY } }], 120, T0);
    expect(fit.minutesNeeded).toBe(134); // 8000 s
    expect(fit.overMax).toBe(true);
    expect(fit.fits).toBe(false);
    expect(fit.allToday).toBe(true);
  });
});

describe('LS-1 scenarios', () => {
  it('scenario 1, through Dexie: a card first reviewed yesterday and again today is not "first seen today"', async () => {
    const s = await scheduler();
    const db = await freshDb();
    const deck = await putDeck(db);
    const yesterday = new Date(T0.getTime() - DAY);
    const twoDaysAgo = new Date(T0.getTime() - 2 * DAY);
    const old = (await addCard(db, s, { deckId: deck.id, front: 'old', back: 'b' }, twoDaysAgo)).card;
    const fresh = (await addCard(db, s, { deckId: deck.id, front: 'fresh', back: 'b' }, twoDaysAgo)).card;
    for (let i = 0; i < 8; i++) await addCard(db, s, { deckId: deck.id, front: `n${i}`, back: 'b' }, new Date(twoDaysAgo.getTime() + (i + 1) * SEC));
    // "old": first review yesterday, again today. "fresh": first review today.
    await saveRating(db, s, snapshotOf(old), Rating.Again, yesterday);
    await saveRating(db, s, snapshotOf((await db.cards.get(old.id))!), Rating.Good, T0);
    await saveRating(db, s, snapshotOf(fresh), Rating.Good, T0);
    await saveTest(db, deck.id, '2026-11-14');

    const snap = await loadSnapshot(db, T0);
    expect(localDayKey(snap.firstReviewAt.get(old.id)!)).toBe('2026-11-08');
    expect(localDayKey(snap.firstReviewAt.get(fresh.id)!)).toBe(TODAY);
    const share = deckNewCardShare(snap.cards, snap.tests.get(deck.id), snap.firstReviewAt, T0)!;
    expect(share.firstSeenToday).toBe(1);
    // 8 not studied + 1 first seen today, over 5 days: ⌈9 ÷ 5⌉ − 1 = 1 more today.
    expect(share.unseen).toBe(8);
    expect(share.share).toBe(1);
    db.close();
  });

  it('scenario 2, through Dexie: the share resets at local midnight', async () => {
    const s = await scheduler();
    const db = await freshDb();
    const deck = await putDeck(db);
    const sunday = new Date('2026-11-08T12:00:00-05:00');
    for (let i = 0; i < 10; i++) await addCard(db, s, { deckId: deck.id, front: `c${i}`, back: 'b' }, new Date(sunday.getTime() + i * SEC));
    await saveTest(db, deck.id, '2026-11-14'); // 5 days from Monday
    const front = (cards: readonly Card[]) => cards.filter((c) => c.state === 0).map((c) => c.front);

    // Monday 23:50: 5 days left, a share of 2 (c0, c1). Rate both.
    const lateMonday = new Date('2026-11-09T23:50:00-05:00');
    let snap = await loadSnapshot(db, lateMonday);
    let due = computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now: lateMonday });
    expect(front(due.due)).toEqual(['c0', 'c1']);
    for (const c of due.due) await saveRating(db, s, snapshotOf(c), Rating.Good, lateMonday);
    snap = await loadSnapshot(db, new Date(lateMonday.getTime() + 5 * 60_000));
    due = computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now: new Date(lateMonday.getTime() + 5 * 60_000) });
    expect(front(due.due)).toEqual([]);

    // Tuesday 00:01: a new day. Nothing was first seen today, 4 days left, 8 not studied: c2 and c3.
    const earlyTuesday = new Date('2026-11-10T00:01:00-05:00');
    snap = await loadSnapshot(db, earlyTuesday);
    expect(snap.firstReviewAt.size).toBe(0);
    due = computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now: earlyTuesday });
    expect(due.shares.get(deck.id)!.daysLeft).toBe(4);
    expect(front(due.due)).toEqual(['c2', 'c3']);
    db.close();
  });

  it('scenario 3: when the re-read after a rating fails, the fallback counts the card as first seen today', async () => {
    const s = await scheduler();
    const cards = Array.from({ length: 10 }, (_, i) => makeCard(s, 'D', new Date(T0.getTime() - DAY + i * SEC), `c${i}`));
    const old: Snapshot = {
      decks: [{ id: 'D', name: 'Biology', colour: 'green', createdAt: new Date(T0.getTime() - 2 * DAY) }],
      cards,
      tests: tests('D', '2026-11-14'),
      settings: { ...DEFAULT_SETTINGS },
      recentReviews: [],
      firstReviewAt: new Map(),
      lastReviewAt: null,
    };
    const allowed = (snap: Snapshot) =>
      [...computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now: T0 }).shares.get('D')!.allowed].map(
        (id) => snap.cards.find((c) => c.id === id)!.front,
      );
    expect(allowed(old)).toEqual(['c0', 'c1']);

    // c0 is rated Good, and the next re-read fails once.
    const { card: sched, revlog } = reviewCard(s, cards[0], Rating.Good, T0);
    const saved = { card: { ...cards[0], ...sched }, review: { ...revlog, id: 'r1', cardId: cards[0].id, deckId: 'D' } };
    const patched = withSavedRating(old, saved);
    expect(allowed(patched)).toEqual(['c1']);
    expect(patched.recentReviews.map((r) => r.id)).toEqual(['r1']);
    expect(patched.lastReviewAt?.getTime()).toBe(T0.getTime());
    expect(patched.firstReviewAt.get(cards[0].id)?.getTime()).toBe(T0.getTime());
    // The old fallback patched only the card, which left "first seen today" at 0: c1 and c2.
    const cardOnly = { ...old, cards: old.cards.map((c) => (c.id === saved.card.id ? saved.card : c)) };
    expect(allowed(cardOnly)).toEqual(['c1', 'c2']);
    // A second rating of a card that wasn't new keeps its first review.
    const again = withSavedRating(patched, { card: saved.card, review: { ...saved.review, id: 'r2', state: 2, reviewTime: new Date(T0.getTime() + 60_000) } });
    expect(again.firstReviewAt.get(cards[0].id)?.getTime()).toBe(T0.getTime());
    expect(again.lastReviewAt?.getTime()).toBe(T0.getTime() + 60_000);
  });
});
