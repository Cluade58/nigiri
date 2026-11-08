// Test mode (spec §2, fsrs-notes §10). It only chooses which NEW cards are due, and it never writes
// a card (D29): adding, editing or removing a test changes the share and the fit check, nothing else.
import type { Card, Test } from './db';
import { isNewCard } from './scheduler';
import { daysBetweenKeys, localDayKey } from './time';

/** Fixed for everyone, on the safe side, never measured (spec §2). */
export const SECONDS_PER_CARD = 20;
/** The top of the minutes-a-day stepper (D33, D59). */
export const MAX_MINUTES_PER_DAY = 120;
export const MIN_MINUTES_PER_DAY = 5;

/** A test applies on its day and on every day before it. From the next calendar day the deck acts as if it has none (D30). */
export function testApplies(test: Test | undefined, now: Date): test is Test {
  return !!test && daysBetweenKeys(localDayKey(now), test.date) >= 0;
}

/** Calendar days from local today to the test day, at least 1 (rule 1; a test today divides by 1). */
export function daysLeft(testDate: string, now: Date): number {
  return Math.max(1, daysBetweenKeys(localDayKey(now), testDate));
}

/** Today's share = ⌈(unseen new + new first seen today) ÷ days left⌉ − new first seen today, never below 0. */
export function newCardShare(unseenNew: number, firstSeenToday: number, days: number): number {
  return Math.max(0, Math.ceil((unseenNew + firstSeenToday) / Math.max(1, days)) - firstSeenToday);
}

export function byWritingOrder(a: Card, b: Card): number {
  return a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export interface DeckShare {
  /** The new cards allowed today, in writing order. */
  allowed: Set<string>;
  unseen: number;
  firstSeenToday: number;
  share: number;
  daysLeft: number;
}

/**
 * Which of one deck's new cards are due today. Null when no test applies: then every new card is
 * due as soon as it's made. `firstReviewAt` holds the earliest review of each card reviewed today
 * ("first seen today" means that review falls on today's local calendar day).
 */
export function deckNewCardShare(
  deckCards: readonly Card[],
  test: Test | undefined,
  firstReviewAt: ReadonlyMap<string, Date>,
  now: Date,
): DeckShare | null {
  if (!testApplies(test, now)) return null;
  const today = localDayKey(now);
  const unseen = deckCards.filter(isNewCard).sort(byWritingOrder);
  let firstSeenToday = 0;
  for (const c of deckCards) {
    const first = firstReviewAt.get(c.id);
    if (first && localDayKey(first) === today) firstSeenToday++;
  }
  const days = daysLeft(test.date, now);
  const share = newCardShare(unseen.length, firstSeenToday, days);
  return {
    allowed: new Set(unseen.slice(0, share).map((c) => c.id)),
    unseen: unseen.length,
    firstSeenToday,
    share,
    daysLeft: days,
  };
}

export interface FitEntry {
  deckId: string;
  cardCount: number;
  test: Test | undefined;
}

export interface FitDeck {
  deckId: string;
  daysLeft: number;
  isToday: boolean;
  seconds: number;
  minutes: number;
}

export interface FitResult {
  decks: FitDeck[];
  /**
   * The sum of each deck's rounded-up minutes (D61(3)), over every deck with a test today or ahead,
   * so the numbers on screen always add up ("adds 9, so 12 in all").
   */
  minutesNeeded: number;
  minutesPerDay: number;
  fits: boolean;
  /** Above the stepper's top (D33): say so, skip nothing. */
  overMax: boolean;
  /** Every test is today, so the copy says "today" instead of "a day". */
  allToday: boolean;
}

const ceilMinutes = (seconds: number) => Math.ceil(seconds / 60 - 1e-9);

/** The fit check (spec §2, D33). Decks without a test that applies are left out. */
export function fitCheck(entries: readonly FitEntry[], minutesPerDay: number, now: Date): FitResult {
  const today = localDayKey(now);
  const decks: FitDeck[] = [];
  let minutesNeeded = 0;
  for (const e of entries) {
    if (!testApplies(e.test, now)) continue;
    const days = daysLeft(e.test.date, now);
    const seconds = (e.cardCount * SECONDS_PER_CARD) / days;
    const minutes = ceilMinutes(seconds);
    minutesNeeded += minutes;
    decks.push({ deckId: e.deckId, daysLeft: days, isToday: e.test.date === today, seconds, minutes });
  }
  return {
    decks,
    minutesNeeded,
    minutesPerDay,
    fits: minutesNeeded <= minutesPerDay,
    overMax: minutesNeeded > MAX_MINUTES_PER_DAY,
    allToday: decks.length > 0 && decks.every((d) => d.isToday),
  };
}
