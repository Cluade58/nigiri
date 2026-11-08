// Saving (spec §3, §5 checks 3 and 5, and the "Also test" list), on fake-indexeddb.
import { afterEach, describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { createDb, type NigiriDb } from '../src/lib/db';
import { isQuotaError } from '../src/lib/errors';
import {
  EmptySideError,
  addCard,
  createDeck,
  deleteCard,
  saveCardText,
  saveRating,
  snapshotOf,
} from '../src/lib/saves';
import { SCHED_KEYS } from '../src/lib/scheduler';
import { MIN, SEC, T0, at, freshDb, putDeck, scheduler } from './helpers';

const open: NigiriDb[] = [];
async function db(): Promise<NigiriDb> {
  const d = await freshDb();
  open.push(d);
  return d;
}
afterEach(() => {
  while (open.length) open.pop()!.close();
});

function failOn(table: { hook: (e: 'creating' | 'updating' | 'deleting', fn: () => void) => void }, event: 'creating' | 'updating' | 'deleting', err: Error = new Error('disk failed')) {
  table.hook(event, () => {
    throw err;
  });
}

describe('a rating', () => {
  it('writes exactly one review and the new card state together', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const { card } = await addCard(d, s, { deckId: deck.id, front: 'Mitosis', back: 'Cell division' }, T0);
    const res = await saveRating(d, s, snapshotOf(card), Rating.Good, at(10 * SEC));
    expect(res.status).toBe('saved');
    const reviews = await d.reviews.toArray();
    expect(reviews).toHaveLength(1);
    const stored = await d.cards.get(card.id);
    expect(stored!.reps).toBe(1);
    expect(stored!.lastReviewAt!.getTime()).toBe(at(10 * SEC).getTime());
    expect(reviews[0].cardId).toBe(card.id);
    expect(reviews[0].deckId).toBe(deck.id);
    expect(reviews[0].rating).toBe(Rating.Good);
    expect(reviews[0].reviewTime.getTime()).toBe(at(10 * SEC).getTime());
    // The revlog is stored as ts-fsrs returns it: the card as it was before the rating.
    expect(reviews[0].lastReviewAt).toBeNull();
    expect(reviews[0].state).toBe(0);
    // Text and created date are untouched by a rating.
    expect(stored!.front).toBe('Mitosis');
    expect(stored!.createdAt.getTime()).toBe(T0.getTime());
  });

  it('check 3: a second save from the same snapshot (a double tap) is refused, so there is exactly one review', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const { card } = await addCard(d, s, { deckId: deck.id, front: 'a', back: 'b' }, T0);
    const snap = snapshotOf(card);
    const [first, second] = await Promise.all([
      saveRating(d, s, snap, Rating.Good, at(SEC)),
      saveRating(d, s, snap, Rating.Easy, at(SEC + 50)),
    ]);
    expect([first.status, second.status].sort()).toEqual(['saved', 'stale']);
    expect(await d.reviews.count()).toBe(1);
  });

  it('check 3: two open copies of the app rating the same card log exactly one review', async () => {
    const s = await scheduler();
    const tab = await db();
    const app = createDb(tab.name);
    await app.open();
    open.push(app);
    const deck = await putDeck(tab);
    const { card } = await addCard(tab, s, { deckId: deck.id, front: 'a', back: 'b' }, T0);
    // Both copies showed the card with the same reps and lastReviewAt.
    const shownInTab = snapshotOf((await tab.cards.get(card.id))!);
    const shownInApp = snapshotOf((await app.cards.get(card.id))!);
    expect((await saveRating(tab, s, shownInTab, Rating.Again, at(SEC))).status).toBe('saved');
    expect((await saveRating(app, s, shownInApp, Rating.Good, at(2 * SEC))).status).toBe('stale');
    expect(await tab.reviews.count()).toBe(1);
    // The other copy's next snapshot is fresh, so its next rating saves.
    const fresh = snapshotOf((await app.cards.get(card.id))!);
    expect((await saveRating(app, s, fresh, Rating.Good, at(2 * MIN))).status).toBe('saved');
    expect(await tab.reviews.count()).toBe(2);
  });

  it('a card deleted elsewhere saves nothing', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const { card } = await addCard(d, s, { deckId: deck.id, front: 'a', back: 'b' }, T0);
    await deleteCard(d, card.id);
    expect((await saveRating(d, s, snapshotOf(card), Rating.Good, at(SEC))).status).toBe('stale');
    expect(await d.reviews.count()).toBe(0);
  });

  it('check 5: a failed transaction logs no review and leaves the card unchanged, and the rating can be tapped again', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const { card } = await addCard(d, s, { deckId: deck.id, front: 'a', back: 'b' }, T0);
    const before = await d.cards.get(card.id);
    const failing = createDb(d.name);
    await failing.open();
    open.push(failing);
    failOn(failing.reviews, 'creating');
    await expect(saveRating(failing, s, snapshotOf(card), Rating.Good, at(SEC))).rejects.toThrow();
    expect(await d.reviews.count()).toBe(0);
    expect(await d.cards.get(card.id)).toEqual(before);
    // Tapping again (storage working) saves exactly one review.
    expect((await saveRating(d, s, snapshotOf(card), Rating.Good, at(2 * SEC))).status).toBe('saved');
    expect(await d.reviews.count()).toBe(1);
  });
});

describe('Add card', () => {
  it('saves a new card due the moment it is made, and returns the deck count', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d, 'Biology');
    const first = await addCard(d, s, { deckId: deck.id, front: ' Osmosis ', back: 'Water through a membrane\n' }, T0);
    const second = await addCard(d, s, { deckId: deck.id, front: 'b', back: 'c' }, at(SEC));
    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(second.deck.name).toBe('Biology');
    const stored = await d.cards.get(first.card.id);
    expect(stored!.front).toBe('Osmosis');
    expect(stored!.back).toBe('Water through a membrane');
    expect(stored!.dueAt.getTime()).toBe(T0.getTime());
    expect(stored!.cardId).toBe(stored!.id);
  });

  it('check 5: a failing save keeps nothing half-written and says why; an empty side saves nothing', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const failing = createDb(d.name);
    await failing.open();
    open.push(failing);
    failOn(failing.cards, 'creating');
    await expect(addCard(failing, s, { deckId: deck.id, front: 'a', back: 'b' }, T0)).rejects.toThrow();
    expect(await d.cards.count()).toBe(0);

    const full = createDb(d.name);
    await full.open();
    open.push(full);
    failOn(full.cards, 'creating', new DOMException('The quota has been exceeded.', 'QuotaExceededError'));
    const err = await addCard(full, s, { deckId: deck.id, front: 'a', back: 'b' }, T0).catch((e: unknown) => e);
    expect(isQuotaError(err)).toBe(true);
    expect(await d.cards.count()).toBe(0);

    await expect(addCard(d, s, { deckId: deck.id, front: 'a', back: '   ' }, T0)).rejects.toBeInstanceOf(EmptySideError);
    await expect(addCard(d, s, { deckId: deck.id, front: '', back: 'b' }, T0)).rejects.toMatchObject({ side: 'front' });
    expect(await d.cards.count()).toBe(0);
  });
});

describe('Create deck, Save changes, Delete card', () => {
  it('deleting a card removes it and only its reviews, together', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const a = (await addCard(d, s, { deckId: deck.id, front: 'a', back: 'a' }, T0)).card;
    const b = (await addCard(d, s, { deckId: deck.id, front: 'b', back: 'b' }, T0)).card;
    await saveRating(d, s, snapshotOf(a), Rating.Again, at(SEC));
    const a2 = (await d.cards.get(a.id))!;
    await saveRating(d, s, snapshotOf(a2), Rating.Good, at(2 * MIN));
    await saveRating(d, s, snapshotOf(b), Rating.Good, at(SEC));
    expect(await d.reviews.count()).toBe(3);
    await deleteCard(d, a.id);
    expect(await d.cards.get(a.id)).toBeUndefined();
    const left = await d.reviews.toArray();
    expect(left).toHaveLength(1);
    expect(left[0].cardId).toBe(b.id);
    expect(await d.cards.get(b.id)).toBeDefined();
  });

  it('editing a reviewed card writes only its front and back: every scheduling field stays', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await putDeck(d);
    const { card } = await addCard(d, s, { deckId: deck.id, front: 'Mitosos', back: 'Cell divison' }, T0);
    await saveRating(d, s, snapshotOf(card), Rating.Good, at(SEC));
    const before = (await d.cards.get(card.id))!;
    expect(await saveCardText(d, card.id, { front: 'Mitosis', back: 'Cell division' })).toBe('saved');
    const after = (await d.cards.get(card.id))!;
    for (const key of SCHED_KEYS) expect(after[key]).toEqual(before[key]);
    expect(after.createdAt).toEqual(before.createdAt);
    expect(after.deckId).toBe(before.deckId);
    expect([after.front, after.back]).toEqual(['Mitosis', 'Cell division']);
    expect(await d.reviews.count()).toBe(1);
    await expect(saveCardText(d, card.id, { front: 'x', back: '' })).rejects.toMatchObject({ side: 'back' });
    expect(await saveCardText(d, 'gone', { front: 'x', back: 'y' })).toBe('missing');
  });

  it('with storage failing, Create deck, Save changes and Delete card lose nothing', async () => {
    const s = await scheduler();
    const d = await db();
    const deck = await createDeck(d, { name: ' Chem unit 3 ', colour: 'yellow' }, T0);
    expect(deck.name).toBe('Chem unit 3');
    const { card } = await addCard(d, s, { deckId: deck.id, front: 'a', back: 'b' }, T0);
    await saveRating(d, s, snapshotOf(card), Rating.Good, at(SEC));
    const before = (await d.cards.get(card.id))!;

    const failing = createDb(d.name);
    await failing.open();
    open.push(failing);
    failOn(failing.decks, 'creating');
    failOn(failing.cards, 'updating');
    failOn(failing.cards, 'deleting');
    failOn(failing.reviews, 'deleting');
    await expect(createDeck(failing, { name: 'History', colour: 'blue' }, T0)).rejects.toThrow();
    await expect(saveCardText(failing, card.id, { front: 'changed', back: 'changed' })).rejects.toThrow();
    await expect(deleteCard(failing, card.id)).rejects.toThrow();

    expect(await d.decks.count()).toBe(1);
    expect(await d.cards.get(card.id)).toEqual(before);
    expect(await d.reviews.count()).toBe(1);
  });
});
