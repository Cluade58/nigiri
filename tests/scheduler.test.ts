// The scheduler, on the real pinned ts-fsrs 6.0.0, with a fixed clock (spec §5 check 4; fsrs-notes §6).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { isDueAt } from '../src/lib/queue';
import { REVLOG_KEYS, SCHEDULER_CONFIG, SCHEDULER_STAMP, SCHED_KEYS, State, newCardFields, pickSched, reviewCard } from '../src/lib/scheduler';
import { DAY, MIN, SEC, T0, at, freshDb, makeCard, putDeck, rate, scheduler } from './helpers';

describe('scheduler config (spec §7)', () => {
  it('is FSRS-7 with per-rating retention, 1-minute steps and model override off', async () => {
    const s = await scheduler();
    expect(SCHEDULER_CONFIG.version).toBe('FSRS-7');
    expect(s.config.desiredRetention).toEqual({ 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.95 });
    expect(s.config.learningSteps).toEqual(['1m']);
    expect(s.config.relearningSteps).toEqual(['1m']);
    expect(s.config.allowModelOverride).toBe(false);
    // The defaults fsrs-notes §5 says to leave alone.
    expect(s.config.fractionalDays).toBe(true); // FSRS-7's real elapsed time
    expect(s.config.enableFuzz).toBe(false);
    expect(s.config.graduatingInterval).toBe(1);
    expect(s.config.maximumInterval).toBe(36_500);
    expect(s.config.enableShortTerm).toBe(true);
  });
});

describe('spec §5 check 4, fixed clock T0 = 2026-11-09T15:00:00Z', () => {
  it('a new card is due the moment it is made', async () => {
    const s = await scheduler();
    const card = newCardFields(s, 'c1', T0);
    expect(card.dueAt.getTime() - T0.getTime()).toBe(0);
    expect(card.state).toBe(State.New);
    expect(card.lastReviewAt).toBeNull();
    expect(isDueAt(card, T0)).toBe(true);
  });

  it('Again on a new card makes it due exactly 1 minute later', async () => {
    const s = await scheduler();
    const card = makeCard(s, 'd', T0);
    const next = rate(s, card, Rating.Again, T0);
    expect(next.dueAt.getTime() - T0.getTime()).toBe(60 * SEC);
    expect(next.state).toBe(State.Learning);
  });

  it('Hard on a new card makes it due exactly 90 seconds later', async () => {
    const s = await scheduler();
    const next = rate(s, makeCard(s, 'd', T0), Rating.Hard, T0);
    expect(next.dueAt.getTime() - T0.getTime()).toBe(90 * SEC);
    expect(next.state).toBe(State.Learning);
  });

  it('Again on a card you knew makes it due exactly 1 minute later, with one lapse', async () => {
    const s = await scheduler();
    let card = rate(s, makeCard(s, 'd', T0), Rating.Good, T0);
    card = rate(s, card, Rating.Good, card.dueAt);
    expect(card.state).toBe(State.Review);
    expect(card.lapses).toBe(0);
    const lapseAt = card.dueAt;
    const after = rate(s, card, Rating.Again, lapseAt);
    expect(after.dueAt.getTime() - lapseAt.getTime()).toBe(60 * SEC);
    expect(after.lapses).toBe(1);
    expect(after.state).toBe(State.Relearning);
  });

  it('Good on a new card is due at least 1 day later, and not before; Easy is later but within two weeks', async () => {
    const s = await scheduler();
    const card = makeCard(s, 'd', T0);
    const good = rate(s, card, Rating.Good, T0);
    const easy = rate(s, card, Rating.Easy, T0);
    const goodDays = (good.dueAt.getTime() - T0.getTime()) / DAY;
    const easyDays = (easy.dueAt.getTime() - T0.getTime()) / DAY;
    console.log(`observed on a new card: Good ${goodDays.toFixed(4)} days, Easy ${easyDays.toFixed(4)} days`);
    expect(goodDays).toBeGreaterThanOrEqual(1);
    expect(isDueAt(good, new Date(good.dueAt.getTime() - 1))).toBe(false);
    expect(isDueAt(good, good.dueAt)).toBe(true);
    expect(easyDays).toBeGreaterThan(goodDays);
    expect(easyDays).toBeLessThanOrEqual(14);
    // fsrs-notes §6 scenario 4 observed 4.78 and 13.15 days with fuzz off.
    expect(goodDays).toBeCloseTo(4.78, 2);
    expect(easyDays).toBeCloseTo(13.15, 2);
  });
});

describe('fsrs-notes scenarios', () => {
  it('scenario 12: the same input gives the same output, and the input is unchanged', async () => {
    const s = await scheduler();
    const card = rate(s, makeCard(s, 'd', T0), Rating.Hard, T0);
    const before = structuredClone(card);
    const a = reviewCard(s, card, Rating.Good, at(5 * MIN));
    const b = reviewCard(s, card, Rating.Good, at(5 * MIN));
    expect(a).toEqual(b);
    expect(card).toEqual(before);
  });

  it('scenario 13: a tap before lastReviewAt is clamped to lastReviewAt, with no throw', async () => {
    const s = await scheduler();
    const card = rate(s, makeCard(s, 'd', T0), Rating.Good, T0);
    const earlier = at(-60 * MIN);
    // The library itself throws (H8)...
    expect(() => s.review({ card: pickSched(card), grade: Rating.Good, now: earlier })).toThrow();
    // ...so the app passes the later of the tap and lastReviewAt (D23).
    const out = reviewCard(s, card, Rating.Good, earlier);
    expect(out.revlog.reviewTime.getTime()).toBe(T0.getTime());
    expect(out.card.lastReviewAt?.getTime()).toBe(T0.getTime());
  });

  it('H1, H2: reps goes up by one and lastReviewAt is the review time, on every rating', async () => {
    const s = await scheduler();
    let card = makeCard(s, 'd', T0);
    let t = T0.getTime();
    for (const g of [Rating.Again, Rating.Again, Rating.Hard, Rating.Good, Rating.Again, Rating.Good] as const) {
      t = Math.max(t, card.dueAt.getTime());
      const next = rate(s, card, g, new Date(t));
      expect(next.reps).toBe(card.reps + 1);
      expect(next.lastReviewAt?.getTime()).toBe(t);
      card = next;
    }
  });

  it('H4 through Dexie: a card read back from the database reviews exactly like the in-memory copy', async () => {
    const s = await scheduler();
    const db = await freshDb();
    const deck = await putDeck(db);
    let card = makeCard(s, deck.id, T0);
    card = rate(s, card, Rating.Again, T0);
    card = rate(s, card, Rating.Good, at(60 * SEC));
    await db.cards.add(card);
    const stored = await db.cards.get(card.id);
    expect(stored).toBeDefined();
    expect(stored).toEqual(card);
    for (const g of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const) {
      const now = card.dueAt;
      expect(reviewCard(s, stored!, g, now)).toEqual(reviewCard(s, card, g, now));
    }
    db.close();
  });
});

describe('LS-1 scenario 4: the stored fields match what the pinned library returns', () => {
  it('newCard(), review().card and review().revlog have exactly the keys the app stores, and the stamp names the installed version', async () => {
    const s = await scheduler();
    const asSet = (o: object) => new Set(Object.keys(o));
    const fresh = s.newCard({ cardId: 'k', now: T0 });
    expect(asSet(fresh)).toEqual(new Set(SCHED_KEYS));
    // Every state the app meets: new, learning, review and relearning.
    let card = pickSched(fresh);
    let t = T0.getTime();
    for (const g of [Rating.Again, Rating.Good, Rating.Good, Rating.Again, Rating.Hard, Rating.Easy] as const) {
      t = Math.max(t, card.dueAt.getTime());
      const out = s.review({ card, grade: g, now: new Date(t) });
      expect(asSet(out.card)).toEqual(new Set(SCHED_KEYS));
      expect(asSet(out.revlog)).toEqual(new Set(REVLOG_KEYS));
      card = pickSched(out.card);
    }
    // Read from node_modules, not from the lock file or the brief. The path starts at this file, so the
    // test passes from any working folder (CR-2 m4).
    const installed = JSON.parse(readFileSync(new URL('../node_modules/ts-fsrs/package.json', import.meta.url), 'utf8')) as { version: string };
    expect(SCHEDULER_STAMP.version).toBe(installed.version);
    expect(installed.version).toBe('6.0.0');
  });
});
