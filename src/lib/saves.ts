// Every save (spec §3). A save is one Dexie transaction: it all happens, or nothing does.
// Callers keep what was typed or picked, turn their button off until the save settles, and say
// what to tap if it throws. Persistence is requested only after a transaction has committed.
import { SETTINGS_ID, getSettings, type Card, type Deck, type DeckColour, type NigiriDb, type Review } from './db';
import { newId } from './ids';
import { requestPersistence } from './persist';
import { newCardFields, reviewCard, type Grade, type Scheduler } from './scheduler';
import { MAX_MINUTES_PER_DAY, MIN_MINUTES_PER_DAY } from './testMode';
import { isDayKey } from './time';

/** What the review screen kept when the card appeared (spec §3, D10). */
export interface CardSnapshot {
  cardId: string;
  reps: number;
  /** lastReviewAt in milliseconds, or null on a new card. Compared by value. */
  lastReviewAtMs: number | null;
}

export function snapshotOf(card: Card): CardSnapshot {
  return { cardId: card.id, reps: card.reps, lastReviewAtMs: card.lastReviewAt ? card.lastReviewAt.getTime() : null };
}

export type RatingResult = { status: 'saved'; card: Card; review: Review } | { status: 'stale' };

/**
 * Saves one rating. Re-reads the card inside one transaction over cards and reviews; if it's gone,
 * or another open copy of the app rated it since it appeared, nothing is saved ('stale'). Otherwise
 * review() runs on the stored copy, and the new scheduling fields and the review are written together.
 * Throws if the transaction fails: then no review is logged and the card is unchanged.
 */
export async function saveRating(
  db: NigiriDb,
  scheduler: Scheduler,
  snap: CardSnapshot,
  grade: Grade,
  tap: Date,
): Promise<RatingResult> {
  const result = await db.transaction('rw', db.cards, db.reviews, async (): Promise<RatingResult> => {
    const stored = await db.cards.get(snap.cardId);
    if (!stored) return { status: 'stale' };
    const storedLast = stored.lastReviewAt ? stored.lastReviewAt.getTime() : null;
    if (stored.reps !== snap.reps || storedLast !== snap.lastReviewAtMs) return { status: 'stale' };
    const { card: sched, revlog } = reviewCard(scheduler, stored, grade, tap);
    const review: Review = { ...revlog, id: newId(), cardId: stored.id, deckId: stored.deckId };
    await db.cards.update(stored.id, sched);
    await db.reviews.add(review);
    return { status: 'saved', card: { ...stored, ...sched }, review };
  });
  if (result.status === 'saved') void requestPersistence();
  return result;
}

export class EmptySideError extends Error {
  constructor(readonly side: 'front' | 'back') {
    super(`The ${side} is empty.`);
  }
}

export class MissingDeckError extends Error {
  constructor() {
    super('The deck is gone.');
  }
}

/** A side that's only spaces or line breaks is empty (D60). Text is saved without its outer spaces. */
export function cleanSide(text: string): string {
  return text.trim();
}

export interface AddCardResult {
  card: Card;
  deck: Deck;
  /** The deck's card count after the save, for "Saved. Biology has 12 cards." */
  count: number;
}

export async function addCard(
  db: NigiriDb,
  scheduler: Scheduler,
  input: { deckId: string; front: string; back: string },
  now: Date,
): Promise<AddCardResult> {
  const front = cleanSide(input.front);
  const back = cleanSide(input.back);
  if (!front) throw new EmptySideError('front');
  if (!back) throw new EmptySideError('back');
  const result = await db.transaction('rw', db.decks, db.cards, async () => {
    const deck = await db.decks.get(input.deckId);
    if (!deck) throw new MissingDeckError();
    const id = newId();
    const card: Card = { ...newCardFields(scheduler, id, now), id, deckId: deck.id, front, back, createdAt: now };
    await db.cards.add(card);
    const count = await db.cards.where('deckId').equals(deck.id).count();
    return { card, deck, count };
  });
  void requestPersistence();
  return result;
}

export async function createDeck(db: NigiriDb, input: { name: string; colour: DeckColour }, now: Date): Promise<Deck> {
  const name = input.name.trim();
  if (!name) throw new Error('A deck needs a name.');
  const deck: Deck = { id: newId(), name, colour: input.colour, createdAt: now };
  await db.transaction('rw', db.decks, async () => {
    await db.decks.add(deck);
  });
  void requestPersistence();
  return deck;
}

/** Editing writes only the front and back; the schedule stays (spec §3). */
export async function saveCardText(db: NigiriDb, cardId: string, input: { front: string; back: string }): Promise<'saved' | 'missing'> {
  const front = cleanSide(input.front);
  const back = cleanSide(input.back);
  if (!front) throw new EmptySideError('front');
  if (!back) throw new EmptySideError('back');
  const status = await db.transaction('rw', db.cards, async () => {
    if (!(await db.cards.get(cardId))) return 'missing' as const;
    await db.cards.update(cardId, { front, back });
    return 'saved' as const;
  });
  if (status === 'saved') void requestPersistence();
  return status;
}

/**
 * Save test / Remove test (step 3; the screen is build pass B2). One test per deck. They write only
 * the tests store: a test never changes a card's schedule (D29).
 */
export async function saveTest(db: NigiriDb, deckId: string, date: string): Promise<void> {
  if (!isDayKey(date)) throw new Error(`Not a calendar day: ${date}`);
  await db.transaction('rw', db.tests, async () => {
    await db.tests.put({ deckId, date });
  });
  void requestPersistence();
}

/**
 * Save test on the test screen: the test and the minutes-a-day number, in one transaction, so a
 * failure changes neither. Still never writes a card (D29). The date must be a real calendar day.
 */
export async function saveTestPlan(db: NigiriDb, input: { deckId: string; date: string; minutesPerDay: number }): Promise<void> {
  const { deckId, date, minutesPerDay } = input;
  if (!isDayKey(date)) throw new Error(`Not a calendar day: ${date}`);
  if (!Number.isInteger(minutesPerDay) || minutesPerDay < MIN_MINUTES_PER_DAY || minutesPerDay > MAX_MINUTES_PER_DAY) {
    throw new Error(`Minutes a day out of range: ${minutesPerDay}`);
  }
  await db.transaction('rw', db.decks, db.tests, db.settings, async () => {
    if (!(await db.decks.get(deckId))) throw new MissingDeckError();
    const settings = await getSettings(db);
    await db.tests.put({ deckId, date });
    await db.settings.put({ ...settings, id: SETTINGS_ID, minutesPerDay });
  });
  void requestPersistence();
}

export async function removeTest(db: NigiriDb, deckId: string): Promise<void> {
  await db.transaction('rw', db.tests, async () => {
    await db.tests.delete(deckId);
  });
}

/** Deleting a card deletes its reviews, in the same transaction (D5). */
export async function deleteCard(db: NigiriDb, cardId: string): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.reviews.where('cardId').equals(cardId).delete();
    await db.cards.delete(cardId);
  });
  void requestPersistence();
}
