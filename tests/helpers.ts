import { createDb, type Card, type DeckColour, type NigiriDb } from '../src/lib/db';
import { newId } from '../src/lib/ids';
import { createScheduler, newCardFields, reviewCard, type Grade, type Scheduler } from '../src/lib/scheduler';

export const T0 = new Date('2026-11-09T15:00:00Z');
export const SEC = 1000;
export const MIN = 60 * SEC;
export const DAY = 86_400_000;
export const at = (ms: number) => new Date(T0.getTime() + ms);

let cached: Promise<Scheduler> | null = null;
/** The real pinned ts-fsrs scheduler with spec §7's config, created once. */
export function scheduler(): Promise<Scheduler> {
  cached ??= createScheduler();
  return cached;
}

let n = 0;
export async function freshDb(): Promise<NigiriDb> {
  const db = createDb(`nigiri-test-${Date.now()}-${n++}`);
  await db.open();
  return db;
}

/** A card record made the way Add card makes it, without touching the database. */
export function makeCard(s: Scheduler, deckId: string, createdAt: Date, front = 'Front', back = 'Back'): Card {
  const id = newId();
  return { ...newCardFields(s, id, createdAt), id, deckId, front, back, createdAt };
}

/** Applies a rating in memory (the same reviewCard the save uses). */
export function rate(s: Scheduler, card: Card, grade: Grade, now: Date): Card {
  return { ...card, ...reviewCard(s, card, grade, now).card };
}

export async function putDeck(db: NigiriDb, name = 'Biology', colour: DeckColour = 'green', createdAt = T0) {
  const deck = { id: newId(), name, colour, createdAt };
  await db.decks.add(deck);
  return deck;
}
