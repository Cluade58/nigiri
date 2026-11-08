// Test mode's words (D44, D51(4), D61(3), UI-BENTO-1 §3) and Save test's one transaction.
// T0 is Monday 9 November 2026, 10:00 in New York (tests/setup.ts).
import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { addCard, saveRating, saveTestPlan, snapshotOf } from '../src/lib/saves';
import { fitLine, planLine, raiseTo, relativeDay, shortWhen, studiedLine, testScreenFit, whenLine } from '../src/lib/testCopy';
import { fitCheck } from '../src/lib/testMode';
import { T0, freshDb, putDeck, scheduler } from './helpers';

const NB = ' ';
const plain = (s: string | null) => (s === null ? null : s.split(NB).join(' '));

describe('the when line', () => {
  it('names the day the way the plan says', () => {
    expect(whenLine('2026-11-09', T0)).toBe('Test today');
    expect(whenLine('2026-11-10', T0)).toBe('Test tomorrow');
    expect(plain(whenLine('2026-11-13', T0))).toBe('Test Friday, in 4 days');
    expect(plain(whenLine('2026-11-15', T0))).toBe('Test Sunday, in 6 days');
    expect(plain(whenLine('2026-11-16', T0))).toBe('Test Nov 16, in 7 days');
    expect(plain(whenLine('2026-11-22', T0))).toBe('Test Nov 22, in 13 days');
    expect(shortWhen('2026-11-13', T0)).toBe('Test Friday');
    expect(plain(shortWhen('2026-11-22', T0))).toBe('Test Nov 22');
    // The date field's helper names the day in words (UI-CRIT-1).
    expect(plain(relativeDay('2026-11-09', T0))).toBe('Today, Monday Nov 9');
    expect(plain(relativeDay('2026-11-10', T0))).toBe('Tomorrow, Tuesday Nov 10');
    expect(plain(relativeDay('2026-11-12', T0))).toBe('In 3 days, Thursday Nov 12');
    expect(plain(relativeDay('2026-11-14', T0))).toBe('In 5 days, Saturday Nov 14');
  });
});

describe('studied and the plan', () => {
  it('counts studied cards, and says when every card is studied', () => {
    expect(studiedLine(30, 35)).toBe('30 of 35 studied');
    expect(plain(studiedLine(35, 35))).toBe('All 35 cards studied');
    expect(plain(studiedLine(1, 1))).toBe('All 1 card studied');
  });

  it('says today\'s share and the last day for new cards', () => {
    // 10 new, 5 days left (Saturday): 2 today, all by Friday.
    expect(planLine({ unseen: 10, share: 2, daysLeft: 5 }, '2026-11-14', T0)).toBe('10 not studied yet: 2 today, all by Friday');
    // 13 days away: the day before is named by its date.
    expect(plain(planLine({ unseen: 5, share: 1, daysLeft: 13 }, '2026-11-22', T0))).toBe('5 not studied yet: 1 today, all by Nov 21');
    // Two days away: the day before is tomorrow.
    expect(planLine({ unseen: 10, share: 5, daysLeft: 2 }, '2026-11-11', T0)).toBe('10 not studied yet: 5 today, all by tomorrow');
    // The share is everything left (the test is today or tomorrow).
    expect(planLine({ unseen: 5, share: 5, daysLeft: 1 }, '2026-11-10', T0)).toBe('5 not studied yet, all due today');
    // Today's share already studied.
    expect(planLine({ unseen: 8, share: 0, daysLeft: 4 }, '2026-11-13', T0)).toBe('8 not studied yet: none left today, all by Thursday');
    // Every card studied: no plan line.
    expect(planLine({ unseen: 0, share: 0, daysLeft: 3 }, '2026-11-12', T0)).toBeNull();
    expect(planLine(null, '2026-11-12', T0)).toBeNull();
  });
});

describe('the fit lines', () => {
  const A = { deckId: 'A', cardCount: 35, test: { deckId: 'A', date: '2026-11-12' } }; // 3 days: 233 s, 4 min
  const B = { deckId: 'B', cardCount: 24, test: { deckId: 'B', date: '2026-11-11' } }; // 2 days: 240 s, 4 min
  const C = { deckId: 'C', cardCount: 400, test: { deckId: 'C', date: '2026-11-10' } }; // 1 day: 134 min

  it("Today's line: one test, several, doesn't fit, over 120, all today", () => {
    expect(plain(Object.values(fitLine(fitCheck([A], 15, T0))).join(''))).toBe('It fits: this test needs about 4 minutes a day, and you have 15.');
    expect(plain(Object.values(fitLine(fitCheck([A, B], 15, T0))).join(''))).toBe('It fits: your 2 tests need about 8 minutes a day, and you have 15.');
    expect(plain(Object.values(fitLine(fitCheck([A, B], 5, T0))).join(''))).toBe("It doesn't fit: your 2 tests need about 8 minutes a day, and you have 5.");
    expect(plain(Object.values(fitLine(fitCheck([A, B, C], 60, T0))).join(''))).toBe(
      "It doesn't fit: your 3 tests need about 142 minutes a day, more than the 120 you can set. Reviews start with the cards waiting longest, and none are skipped.",
    );
    const today = { deckId: 'T', cardCount: 3, test: { deckId: 'T', date: '2026-11-09' } };
    expect(plain(Object.values(fitLine(fitCheck([today], 15, T0))).join(''))).toBe('It fits: this test needs about 1 minute today, and you have 15.');
  });

  it('the test screen adds the other tests, and the numbers add up (D61(3))', () => {
    const name = (id: string) => (id === 'B' ? 'AP Bio unit 4' : 'Spanish verbs');
    const one = testScreenFit(fitCheck([A, B], 15, T0), 'A', 35, name)!;
    expect(one.verdict).toBe('It fits');
    expect(plain(one.lede)).toBe('35 cards at 20 seconds each, with 3 days left, needs about 4 min a day. Your AP Bio unit 4 test adds 4, so 8 min a day in all. You have 15.');
    const short = testScreenFit(fitCheck([A, B], 5, T0), 'A', 35, name)!;
    expect(short.verdict).toBe("It doesn't fit");
    expect(plain(short.lede)).toMatch(/You have 5\. Raise it to 10 and it fits\.$/);
    const over = testScreenFit(fitCheck([C], 120, T0), 'C', 400, name)!;
    expect(plain(over.lede)).toBe(
      '400 cards at 20 seconds each, with 1 day left, needs about 134 min a day, more than the 120 you can set. You can still save the test: reviews start with the cards waiting longest, and none are skipped.',
    );
    expect(over.announce).toBe("It doesn't fit. Needs 134 min a day, you have 120.");
    expect(raiseTo(16)).toBe(20);
    expect(raiseTo(1)).toBe(5);
  });
});

describe('Save test', () => {
  it('writes the test and the minutes a day together, and never a card', async () => {
    const s = await scheduler();
    const db = await freshDb();
    const deck = await putDeck(db);
    await addCard(db, s, { deckId: deck.id, front: 'f', back: 'b' }, T0);
    const card = (await db.cards.toArray())[0];
    await saveRating(db, s, snapshotOf(card), Rating.Good, T0);
    const cardsBefore = await db.cards.toArray();

    await saveTestPlan(db, { deckId: deck.id, date: '2026-11-14', minutesPerDay: 20 });
    expect(await db.tests.get(deck.id)).toEqual({ deckId: deck.id, date: '2026-11-14' });
    expect((await db.settings.get('settings'))?.minutesPerDay).toBe(20);
    expect(await db.cards.toArray()).toEqual(cardsBefore);

    // A bad date or minutes out of range saves nothing at all.
    await expect(saveTestPlan(db, { deckId: deck.id, date: '2026-02-30', minutesPerDay: 30 })).rejects.toThrow();
    await expect(saveTestPlan(db, { deckId: deck.id, date: '2026-11-20', minutesPerDay: 121 })).rejects.toThrow();
    // A deck that's gone: the transaction fails, and neither the test nor the minutes change.
    await expect(saveTestPlan(db, { deckId: 'gone', date: '2026-11-20', minutesPerDay: 45 })).rejects.toThrow();
    expect(await db.tests.toArray()).toEqual([{ deckId: deck.id, date: '2026-11-14' }]);
    expect((await db.settings.get('settings'))?.minutesPerDay).toBe(20);
    db.close();
  });
});
