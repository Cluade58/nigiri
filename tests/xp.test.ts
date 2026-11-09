// D73 (XP, levels, ranks) and D74 (Solid), round 1 build task B4: tests T1 to T7 and S2.
// Fixed clock T0 = 2026-11-09T15:00:00Z, the pinned scheduler, and the real saveRating and reviewCard.
// The time zone is UTC here unless a test says otherwise (tests/setup.ts sets New York for other files).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { Card, NigiriDb } from '../src/lib/db';
import { exportBackupText, restoreBackup } from '../src/lib/backup';
import { addCard, createDeck, deleteCard, saveCardText, saveRating, snapshotOf } from '../src/lib/saves';
import { State, previewDue, reviewCard, type Grade } from '../src/lib/scheduler';
import { NBSP } from '../src/lib/copy';
import { localDayKey } from '../src/lib/time';
import {
  RANKS,
  SOLID_GAP_MS,
  bonusDays,
  levelOf,
  needFor,
  nextLine,
  rankOf,
  stageOf,
  waitingAt,
  xpOf,
  xpOfDay,
  xpToReach,
  type XpCard,
  type XpReview,
} from '../src/lib/xp';
import { DAY, MIN, SEC, T0, at, freshDb, makeCard, scheduler } from './helpers';

const H = 3_600_000;
const ORIGINAL_TZ = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'UTC';
});
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

let db: NigiriDb;
beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => {
  db.close();
});

async function xpIn(d: NigiriDb) {
  return xpOf(await d.cards.toArray(), await d.reviews.toArray());
}
async function rateStored(d: NigiriDb, id: string, grade: Grade, tap: Date) {
  const s = await scheduler();
  const card = (await d.cards.get(id))!;
  const res = await saveRating(d, s, snapshotOf(card), grade, tap);
  if (res.status !== 'saved') throw new Error('stale');
  return res;
}

describe('T1: a revlog holds the card as it was before the review', () => {
  it('first and second review', async () => {
    const s = await scheduler();
    const deck = await createDeck(db, { name: 'Bio', colour: 'green' }, T0);
    const { card } = await addCard(db, s, { deckId: deck.id, front: 'Q', back: 'A' }, T0);
    const first = await rateStored(db, card.id, Rating.Good, at(H));
    expect(first.review.dueAt.getTime()).toBe(T0.getTime());
    expect(first.review.state).toBe(State.New);
    const second = await rateStored(db, card.id, Rating.Good, first.card.dueAt);
    expect(second.review.dueAt.getTime()).toBe(first.card.dueAt.getTime());
    expect(second.review.state).toBe(State.Review);
  });
});

describe('T2: the rating never changes XP', () => {
  /** 5 studied cards due at T0 (Good 5 days ago, about 4.78 days), and 3 new ones. */
  async function fixture(d: NigiriDb): Promise<string[]> {
    const s = await scheduler();
    const deck = await createDeck(d, { name: 'Bio', colour: 'green' }, at(-10 * DAY));
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) ids.push((await addCard(d, s, { deckId: deck.id, front: `Q${i}`, back: `A${i}` }, at(-10 * DAY + i * SEC))).card.id);
    for (let i = 0; i < 5; i++) await rateStored(d, ids[i], Rating.Good, at(-5 * DAY + i * SEC));
    for (let i = 0; i < 5; i++) expect((await d.cards.get(ids[i]))!.dueAt.getTime()).toBeLessThanOrEqual(T0.getTime());
    return ids;
  }

  it('Again on every appearance, including the 1-minute returns, earns what Good once each earns', async () => {
    const a = db;
    const b = await freshDb();
    const idsA = await fixture(a);
    const idsB = await fixture(b);
    // Session A: Again on every card, then on each 1-minute return. Always tapping Again never ends a
    // session, so it stops after four appearances per card (32 taps).
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 8; i++) await rateStored(a, idsA[i], Rating.Again, at(round * 2 * MIN + i * SEC));
    }
    // Session B: Good once each.
    for (let i = 0; i < 8; i++) await rateStored(b, idsB[i], Rating.Good, at(i * SEC));

    const day = localDayKey(T0);
    const dayA = xpOfDay(await a.cards.toArray(), await a.reviews.toArray(), day);
    const dayB = xpOfDay(await b.cards.toArray(), await b.reviews.toArray(), day);
    expect(dayA).toEqual({ review: 8 * 10, bonus: 20 });
    expect(dayB).toEqual(dayA);
    const totalA = await xpIn(a);
    const totalB = await xpIn(b);
    expect(totalA.writing).toBe(8 * 15);
    expect(totalA).toEqual(totalB);
    // That day: 8×10 + 8×15 + 20. Five days ago adds 5×10 and that day's bonus (S was empty then).
    expect(dayA.review + totalA.writing + dayA.bonus).toBe(8 * 10 + 8 * 15 + 20);
    expect(totalA.total).toBe(8 * 10 + 8 * 15 + 20 + 5 * 10 + 20);
    b.close();
  });
});

// ---------- Pure fixtures for T3 and T4 ----------
let rid = 0;
const rev = (cardId: string, time: Date, dueAt: Date, id = `r${String(rid++).padStart(4, '0')}`): XpReview => ({ id, cardId, reviewTime: time, dueAt });
const card = (id: string, dueAt: Date): XpCard => ({ id, dueAt });

describe('T3: once per card per local day', () => {
  it('4 reviews on day 1 and 1 on day 2 earn 20', () => {
    const c = card('a', at(30 * DAY));
    const reviews = [rev('a', T0, T0), rev('a', at(MIN), at(MIN)), rev('a', at(2 * MIN), at(2 * MIN)), rev('a', at(3 * MIN), at(3 * MIN)), rev('a', at(DAY), at(DAY))];
    expect(xpOf([c], reviews).review).toBe(20);
  });
  it('splits at local midnight in America/New_York', () => {
    const c = card('a', at(30 * DAY));
    // 23:59 on 9 November and 00:01 on 10 November in New York (EST, UTC−5).
    const reviews = [rev('a', new Date('2026-11-10T04:59:00Z'), T0), rev('a', new Date('2026-11-10T05:01:00Z'), T0)];
    expect(xpOf([c], reviews).review).toBe(10); // UTC: one day
    process.env.TZ = 'America/New_York';
    try {
      expect(xpOf([c], reviews).review).toBe(20);
    } finally {
      process.env.TZ = 'UTC';
    }
  });
});

describe('T4: the bonus', () => {
  const day = localDayKey(T0);
  const earlier = at(-8 * DAY);
  /** a, b, c studied (a review 8 days ago) and due an hour before T0; F is a's review at T0. */
  function base() {
    const cards = [card('a', at(10 * DAY)), card('b', at(10 * DAY)), card('c', at(-H))];
    const reviews = [rev('a', earlier, earlier), rev('b', earlier, earlier), rev('c', earlier, earlier), rev('a', T0, at(-H)), rev('b', at(H), at(-H))];
    return { cards, reviews };
  }

  it('(a) 2 of 3 waiting cards reviewed: no bonus', () => {
    const { cards, reviews } = base();
    expect(waitingAt(cards, reviews, T0).sort()).toEqual(['a', 'b', 'c']);
    expect(bonusDays(cards, reviews).has(day)).toBe(false);
  });
  it('(b) the third at 23:59 local: bonus', () => {
    const { cards, reviews } = base();
    reviews.push(rev('c', new Date('2026-11-09T23:59:00Z'), at(-H)));
    expect(bonusDays(cards, reviews).has(day)).toBe(true);
  });
  it('(c) the third at 00:01 the next day: none for day d', () => {
    const { cards, reviews } = base();
    reviews.push(rev('c', new Date('2026-11-10T00:01:00Z'), at(-H)));
    expect(bonusDays(cards, reviews).has(day)).toBe(false);
  });
  it('(d) a card that comes due after F is not required', () => {
    const { cards, reviews } = base();
    reviews.push(rev('c', at(2 * H), at(-H)));
    cards.push(card('e', at(2 * H)));
    reviews.push(rev('e', earlier, earlier));
    expect(waitingAt(cards, reviews, T0)).not.toContain('e');
    expect(bonusDays(cards, reviews).has(day)).toBe(true);
  });
  it('(e) S empty: one review earns it', () => {
    const reviews = [rev('n', T0, at(-DAY))];
    expect(waitingAt([card('n', at(DAY))], reviews, T0)).toEqual([]);
    expect(xpOf([card('n', at(DAY))], reviews).bonus).toBe(20);
  });
  it('(f) a card first reviewed at F is not in S', () => {
    const cards = [card('n', at(DAY)), card('m', at(DAY))];
    const reviews = [rev('n', T0, at(-DAY)), rev('m', at(H), at(-DAY))];
    expect(waitingAt(cards, reviews, T0)).toEqual([]);
  });
  it('(g) dueAt exactly F is in S', () => {
    const cards = [card('a', at(10 * DAY)), card('g', T0)];
    const reviews = [rev('a', earlier, earlier), rev('g', earlier, earlier), rev('a', T0, at(-H))];
    expect(waitingAt(cards, reviews, T0)).toContain('g');
    expect(bonusDays(cards, reviews).has(day)).toBe(false);
  });
  it('two qualifying sessions in a day earn one +20', () => {
    const cards = [card('a', at(10 * DAY))];
    const reviews = [rev('a', earlier, earlier), rev('a', T0, at(-H)), rev('a', at(5 * H), at(10 * DAY))];
    const xp = xpOf(cards, reviews);
    expect(bonusDays(cards, reviews).has(day)).toBe(true);
    expect(xp.bonus).toBe(2 * 20); // 8 days ago (S empty) and today, once each
  });
  it("a card whose only review is before F uses the stored card's dueAt", () => {
    const reviews = [rev('a', earlier, earlier), rev('s', earlier, earlier), rev('a', T0, at(-H))];
    expect(waitingAt([card('a', at(10 * DAY)), card('s', at(-H))], reviews, T0)).toContain('s');
    expect(bonusDays([card('a', at(10 * DAY)), card('s', at(-H))], reviews).has(day)).toBe(false);
    expect(waitingAt([card('a', at(10 * DAY)), card('s', at(H))], reviews, T0)).not.toContain('s');
    expect(bonusDays([card('a', at(10 * DAY)), card('s', at(H))], reviews).has(day)).toBe(true);
  });
  it('ties at the same moment sort by review id', () => {
    // Two reviews of a at the same moment F: S is decided by the first one by id.
    const reviews = [rev('a', earlier, earlier), rev('a', T0, at(10 * DAY), 'zz'), rev('a', T0, at(-H), 'aa')];
    expect(waitingAt([card('a', at(10 * DAY))], reviews, T0)).toEqual(['a']);
  });
});

describe('T5: XP follows the saved data', () => {
  it('deleting a card with 2 review days drops 15 + 20; restore rebuilds the same XP', async () => {
    const s = await scheduler();
    const deck = await createDeck(db, { name: 'Bio', colour: 'green' }, T0);
    const x = (await addCard(db, s, { deckId: deck.id, front: 'x', back: 'x' }, T0)).card;
    const y = (await addCard(db, s, { deckId: deck.id, front: 'y', back: 'y' }, T0)).card;
    await rateStored(db, x.id, Rating.Again, at(MIN));
    await rateStored(db, y.id, Rating.Good, at(2 * MIN));
    await rateStored(db, x.id, Rating.Good, at(DAY));
    await rateStored(db, y.id, Rating.Good, at(DAY + MIN)); // early: not waiting at F
    const before = await xpIn(db);
    expect(before).toEqual({ review: 40, writing: 30, bonus: 40, total: 110 });

    const text = await exportBackupText(db, at(2 * DAY));
    await deleteCard(db, x.id);
    const after = await xpIn(db);
    expect(before.total - after.total).toBe(15 + 20);
    expect(after.bonus).toBe(before.bonus);

    const other = await freshDb();
    const res = await restoreBackup(other, text);
    expect(res.ok).toBe(true);
    expect(await xpIn(other)).toEqual(before);
    other.close();
  });

  it("documented: deleting a waiting card nobody reviewed can let that day's bonus appear", async () => {
    const s = await scheduler();
    const deck = await createDeck(db, { name: 'Bio', colour: 'green' }, T0);
    const x = (await addCard(db, s, { deckId: deck.id, front: 'x', back: 'x' }, T0)).card;
    const z = (await addCard(db, s, { deckId: deck.id, front: 'z', back: 'z' }, T0)).card;
    await rateStored(db, x.id, Rating.Again, at(MIN));
    await rateStored(db, z.id, Rating.Again, at(2 * MIN));
    await rateStored(db, x.id, Rating.Good, at(DAY)); // z waits and isn't reviewed: no bonus that day
    const before = await xpIn(db);
    expect(before.bonus).toBe(20);
    await deleteCard(db, z.id);
    const after = await xpIn(db);
    // z took 15 (writing) and 10 (one review day) with it, and the next day's bonus appeared.
    expect(after.bonus).toBe(40);
    expect(after.total).toBe(before.total - 15 - 10 + 20);
  });

  it('editing text, previewing the keys and a stale save change nothing', async () => {
    const s = await scheduler();
    const deck = await createDeck(db, { name: 'Bio', colour: 'green' }, T0);
    const x = (await addCard(db, s, { deckId: deck.id, front: 'x', back: 'x' }, T0)).card;
    await rateStored(db, x.id, Rating.Good, at(MIN));
    const before = await xpIn(db);
    await saveCardText(db, x.id, { front: 'x edited', back: '**bold**' });
    expect(await xpIn(db)).toEqual(before);
    previewDue(s, (await db.cards.get(x.id))!, at(DAY));
    expect(await xpIn(db)).toEqual(before);
    const res = await saveRating(db, s, snapshotOf(x), Rating.Good, at(2 * MIN)); // x as it was before its review
    expect(res.status).toBe('stale');
    expect(await xpIn(db)).toEqual(before);
  });
});

describe('T6: levels and ranks', () => {
  it('pins what each level needs', () => {
    const needs = Array.from({ length: 18 }, (_, i) => needFor(i + 1));
    expect(needs).toEqual([100, 140, 200, 270, 380, 540, 750, 1050, 1480, 2070, 2890, 4050, 5670, 7940, 11110, 15560, 21780, 30490]);
  });
  it('pins where levels start', () => {
    expect([4, 7, 10, 13, 16, 19].map(xpToReach)).toEqual([440, 1630, 4910, 13920, 38640, 106470]);
    expect(levelOf(439).level).toBe(3);
    expect(levelOf(440).level).toBe(4);
    expect(levelOf(0)).toMatchObject({ level: 1, rank: 'Rice', into: 0, need: 100, toNext: 100 });
  });
  it('rank names change at 4, 7, 10, 13, 16 and 19', () => {
    const ranks = Array.from({ length: 21 }, (_, i) => rankOf(i + 1));
    const changes = ranks.flatMap((r, i) => (i > 0 && r !== ranks[i - 1] ? [i + 1] : []));
    expect(changes).toEqual([4, 7, 10, 13, 16, 19]);
    expect([rankOf(1), rankOf(4), rankOf(7), rankOf(10), rankOf(13), rankOf(16), rankOf(19), rankOf(40)]).toEqual([...RANKS, 'Master']);
  });
  it('the next line names the rank when the next level starts one', () => {
    expect(nextLine(levelOf(0))).toBe(`100${NBSP}XP to level 2`);
    expect(nextLine(levelOf(xpToReach(3)))).toBe(`200${NBSP}XP to Tamago`);
    expect(nextLine(levelOf(xpToReach(18) + 10))).toBe(`30,480${NBSP}XP to Master`);
    expect(nextLine(levelOf(xpToReach(19)))).toBe(`${needFor(19).toLocaleString()}${NBSP}XP to level 20`);
  });
});

describe('T7: Solid (D74)', () => {
  it('follows the gap between the last review and the due date', async () => {
    const s = await scheduler();
    const fresh = makeCard(s, 'd', T0);
    expect(stageOf(fresh)).toBe('new');

    const good = { ...fresh, ...reviewCard(s, fresh, Rating.Good, T0).card };
    expect((good.dueAt.getTime() - T0.getTime()) / DAY).toBeCloseTo(4.78, 1);
    expect(stageOf(good)).toBe('learning');

    const easy = { ...fresh, ...reviewCard(s, fresh, Rating.Easy, T0).card };
    expect((easy.dueAt.getTime() - T0.getTime()) / DAY).toBeCloseTo(13.15, 1);
    expect(stageOf(easy)).toBe('learning');

    const solid: Card = { ...good, state: State.Review, lastReviewAt: T0, dueAt: new Date(T0.getTime() + SOLID_GAP_MS) };
    expect(stageOf(solid)).toBe('solid');
    expect(stageOf({ ...solid, dueAt: new Date(T0.getTime() + 13.99 * DAY) })).toBe('learning');

    const again = { ...solid, ...reviewCard(s, solid, Rating.Again, solid.dueAt).card };
    expect(again.state).toBe(State.Relearning);
    expect(stageOf(again)).toBe('learning');
    const back = { ...again, ...reviewCard(s, again, Rating.Good, again.dueAt).card };
    expect(stageOf(back)).toBe('learning');

    // Overdue doesn't matter: stageOf never looks at the clock.
    expect(stageOf(solid)).toBe('solid');
    expect(stageOf({ ...solid, lastReviewAt: null })).not.toBe('solid');
  });

  it('S2: a new card, Good at T0, then Good at its due time', async () => {
    const s = await scheduler();
    const c0 = makeCard(s, 'd', T0);
    const c1 = { ...c0, ...reviewCard(s, c0, Rating.Good, T0).card };
    const c2 = { ...c1, ...reviewCard(s, c1, Rating.Good, c1.dueAt).card };
    const first = (c1.dueAt.getTime() - T0.getTime()) / DAY;
    const second = (c2.dueAt.getTime() - c1.dueAt.getTime()) / DAY;
    console.log(`S2: first interval ${first.toFixed(2)} days, second interval ${second.toFixed(2)} days, Solid after the second Good: ${stageOf(c2)}`);
    expect(second).toBeGreaterThan(first);
  });
});
