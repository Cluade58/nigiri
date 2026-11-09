// Done's "This session" rows and its "Next" line (round 1 plan, pass 2 R3, D76). Counted from the cards
// rated in this session and the cards' stored dueAt: nothing new is stored. Pure: every function takes
// `now`; none reads the clock. Days are the phone's local calendar days (D58).
import { format } from 'date-fns';
import { cards as cardsText } from './copy';
import type { Card, Deck, Test } from './db';
import { computeDue } from './queue';
import { deckNewCardShare } from './testMode';
import { daysBetweenKeys, localDayKey, startOfLocalDayOffset } from './time';

export interface SessionDeckRow {
  deck: Deck;
  count: number;
}

/** One row per deck with a card rated this session: highest count first, ties by name. */
export function sessionDeckRows(session: ReadonlySet<string>, cardList: readonly Pick<Card, 'id' | 'deckId'>[], decks: readonly Deck[]): SessionDeckRow[] {
  const perDeck = new Map<string, number>();
  for (const c of cardList) if (session.has(c.id)) perDeck.set(c.deckId, (perDeck.get(c.deckId) ?? 0) + 1);
  const rows: SessionDeckRow[] = [];
  for (const deck of decks) {
    const count = perDeck.get(deck.id);
    if (count) rows.push({ deck, count });
  }
  return rows.sort((a, b) => b.count - a.count || a.deck.name.localeCompare(b.deck.name));
}

/**
 * CR-7 m1 (D78): the new cards Test mode holds back today that tomorrow's share lets through. Their dueAt
 * is already past, so without this they'd never count. Tomorrow's share is the same rule as today's
 * (deckNewCardShare at the start of tomorrow, nothing first seen yet that day), and only cards held back
 * today count, so it's never more than the held-back count. `cardList` is the session's scope.
 */
export function heldBackDueTomorrow(cardList: readonly Card[], tests: ReadonlyMap<string, Test>, firstReviewAt: ReadonlyMap<string, Date>, now: Date): Set<string> {
  const { heldBack } = computeDue({ cards: cardList, tests, firstReviewAt, now });
  const out = new Set<string>();
  if (heldBack.size === 0) return out;
  const tomorrow = startOfLocalDayOffset(now, 1);
  const byDeck = new Map<string, Card[]>();
  for (const c of cardList) {
    const list = byDeck.get(c.deckId);
    if (list) list.push(c);
    else byDeck.set(c.deckId, [c]);
  }
  for (const [deckId, list] of byDeck) {
    if (!list.some((c) => heldBack.has(c.id))) continue;
    // Null from tomorrow means the test has passed (D30): every new card is due then.
    const share = deckNewCardShare(list, tests.get(deckId), new Map(), tomorrow);
    for (const c of list) if (heldBack.has(c.id) && (!share || share.allowed.has(c.id))) out.add(c.id);
  }
  return out;
}

/**
 * "Next: 14 cards tomorrow." / "Next: 6 cards on Thursday." / "Next: 3 cards on Nov 20.": the cards whose
 * next due falls on the first local day after today that has any due. A weekday within 6 days, else the
 * date. null when nothing is due after today (the line is left out). Cards in `comingTomorrow` (held-back
 * new cards tomorrow's share lets through, heldBackDueTomorrow) count as due tomorrow.
 */
export function nextDueLine(cardList: readonly (Pick<Card, 'dueAt'> & { id?: string })[], now: Date, comingTomorrow: ReadonlySet<string> = new Set()): string | null {
  const today = localDayKey(now);
  const tomorrow = localDayKey(startOfLocalDayOffset(now, 1));
  let first: string | null = null;
  let count = 0;
  for (const c of cardList) {
    const key = c.id !== undefined && comingTomorrow.has(c.id) ? tomorrow : localDayKey(c.dueAt);
    if (key <= today) continue;
    if (first === null || key < first) {
      first = key;
      count = 1;
    } else if (key === first) count += 1;
  }
  if (first === null) return null;
  const days = daysBetweenKeys(today, first);
  const [y, m, d] = first.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const when = days === 1 ? 'tomorrow' : days <= 6 ? `on ${format(date, 'EEEE')}` : `on ${format(date, 'MMM d')}`;
  return `Next: ${cardsText(count)} ${when}.`;
}
