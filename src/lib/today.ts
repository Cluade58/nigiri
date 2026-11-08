// What Today says (D41, D45, D50, D60). Pure: every function takes `now`.
import { format } from 'date-fns';
import type { Card, Deck, Review, Test } from './db';
import { NBSP } from './copy';
import { SECONDS_PER_CARD, testApplies } from './testMode';
import { calendarDaysBetween, startOfLocalDay, startOfLocalDayOffset } from './time';

/** The cost before the tap (D41, D60): due-now count × 20 s. */
export function minutesLine(dueCount: number): string | null {
  if (dueCount <= 0) return null;
  const seconds = dueCount * SECONDS_PER_CARD;
  if (seconds < 60) return 'Under a minute.';
  if (seconds === 60) return `About 1${NBSP}minute.`;
  return `About ${Math.ceil(seconds / 60)}${NBSP}minutes.`;
}

export interface WelcomeInput {
  now: Date;
  dueCount: number;
  /** The latest review, if any. */
  lastReviewAt: Date | null;
  cardCreatedAts: readonly Date[];
}

/**
 * D45: shown when the last review or last card made (whichever is later) was 3 or more local
 * calendar days ago and cards are due. It stays until the first rating that day, so a card made
 * today doesn't end it.
 */
export function showWelcomeBack({ now, dueCount, lastReviewAt, cardCreatedAts }: WelcomeInput): boolean {
  if (dueCount <= 0) return false;
  const todayStart = startOfLocalDay(now).getTime();
  if (lastReviewAt && lastReviewAt.getTime() >= todayStart) return false;
  let latest = lastReviewAt ? lastReviewAt.getTime() : -Infinity;
  for (const d of cardCreatedAts) {
    const t = d.getTime();
    if (t < todayStart && t > latest) latest = t;
  }
  if (latest === -Infinity) return false;
  return calendarDaysBetween(new Date(latest), now) >= 3;
}

/** D50: cards added, and different cards reviewed, over the last 7 local calendar days including today. */
export function lastSevenDays(cards: readonly Pick<Card, 'createdAt'>[], reviews: readonly Pick<Review, 'cardId' | 'reviewTime'>[], now: Date) {
  const start = startOfLocalDayOffset(now, -6).getTime();
  const added = cards.filter((c) => c.createdAt.getTime() >= start).length;
  const reviewed = new Set(reviews.filter((r) => r.reviewTime.getTime() >= start).map((r) => r.cardId)).size;
  return { added, reviewed };
}

/**
 * D50: when the next card comes due, for the nothing-due state. A studied card counts at its dueAt.
 * A new card Test mode holds back today can't come due before tomorrow's share, so it counts at the
 * start of tomorrow (its own dueAt is already past).
 */
export function nextDueAt(cards: readonly Card[], dueIds: ReadonlySet<string>, heldBack: ReadonlySet<string>, now: Date): Date | null {
  let best: number | null = null;
  const tomorrow = startOfLocalDayOffset(now, 1).getTime();
  for (const c of cards) {
    if (dueIds.has(c.id)) continue;
    const t = heldBack.has(c.id) ? tomorrow : c.dueAt.getTime();
    if (best === null || t < best) best = t;
  }
  return best === null ? null : new Date(best);
}

/** "The next card is due at 4:30 PM." / "tomorrow." / "on Friday." (2–6 days) / "on Nov 23." (7+). */
export function nextDueLine(at: Date, now: Date, locale?: string): string {
  const days = calendarDaysBetween(now, at);
  if (days <= 0) {
    const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(at);
    return `The next card is due at ${time}.`;
  }
  if (days === 1) return 'The next card is due tomorrow.';
  if (days <= 6) return `The next card is due on ${format(at, 'EEEE')}.`;
  return `The next card is due on ${format(at, 'MMM')}${NBSP}${format(at, 'd')}.`;
}

/** The date at the top of Today: "Tuesday, Nov 10". */
export function todayTitle(now: Date): string {
  return format(now, 'EEEE, MMM d');
}

/**
 * D41: decks with a test today or ahead first, soonest first (same day: newest deck first),
 * then the rest, newest first.
 */
export function orderDecks<D extends Deck>(decks: readonly D[], tests: ReadonlyMap<string, Test>, now: Date): D[] {
  const newest = (a: D, b: D) => b.createdAt.getTime() - a.createdAt.getTime();
  const withTest: D[] = [];
  const rest: D[] = [];
  for (const d of decks) (testApplies(tests.get(d.id), now) ? withTest : rest).push(d);
  withTest.sort((a, b) => {
    const da = tests.get(a.id)!.date;
    const db = tests.get(b.id)!.date;
    return da < db ? -1 : da > db ? 1 : newest(a, b);
  });
  rest.sort(newest);
  return [...withTest, ...rest];
}
