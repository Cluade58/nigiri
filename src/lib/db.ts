// Storage (spec §3, §4). The first schema declares all five stores, so any later change only adds.
// Drafts and the theme live in localStorage, never here.
import { Dexie, type EntityTable } from 'dexie';
import type { Revlog, SchedFields } from './scheduler';

export const DECK_COLOURS = ['green', 'blue', 'pink', 'orange', 'yellow', 'purple'] as const;
export type DeckColour = (typeof DECK_COLOURS)[number];

export interface Deck {
  id: string;
  name: string;
  colour: DeckColour;
  createdAt: Date;
}

/** A card: its text plus the scheduling fields exactly as ts-fsrs returns them. */
export type Card = SchedFields & {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: Date;
};

/** A review: its own id, the card and deck, plus the revlog as ts-fsrs returns it. Never edited. */
export type Review = Revlog & {
  id: string;
  cardId: string;
  deckId: string;
};

/** One test per deck. The date is a calendar day kept as text (D31). */
export interface Test {
  deckId: string;
  date: string;
}

export const SETTINGS_ID = 'settings';
export interface Settings {
  id: typeof SETTINGS_ID;
  /** D59: starts at 15, from 5 to 120. */
  minutesPerDay: number;
  /** Step 5's What's new note; null until one is shown. */
  lastWhatsNewSeen: string | null;
}

export const DEFAULT_SETTINGS: Settings = { id: SETTINGS_ID, minutesPerDay: 15, lastWhatsNewSeen: null };

export type NigiriDb = Dexie & {
  decks: EntityTable<Deck, 'id'>;
  cards: EntityTable<Card, 'id'>;
  reviews: EntityTable<Review, 'id'>;
  tests: EntityTable<Test, 'deckId'>;
  settings: EntityTable<Settings, 'id'>;
};

export const DB_NAME = 'nigiri';

export function createDb(name: string = DB_NAME): NigiriDb {
  const db = new Dexie(name) as NigiriDb;
  db.version(1).stores({
    decks: 'id, createdAt',
    cards: 'id, deckId, dueAt, createdAt',
    reviews: 'id, cardId, deckId, reviewTime',
    tests: 'deckId',
    settings: 'id',
  });
  db.on('populate', (tx) => {
    tx.table('settings').add({ ...DEFAULT_SETTINGS });
  });
  return db;
}

export async function getSettings(db: NigiriDb): Promise<Settings> {
  return (await db.settings.get(SETTINGS_ID)) ?? { ...DEFAULT_SETTINGS };
}
