// Which cards are due, in what order, and what the review screen shows next (spec §2, D1, D3, D22).
// Pure: every function takes `now`.
import type { Card, Test } from './db';
import { isNewCard } from './scheduler';
import { byWritingOrder, deckNewCardShare, type DeckShare } from './testMode';

/** The longest set delay (Hard's 90 s on a learning card): the waiting and "left" window (D22). */
export const WAIT_WINDOW_MS = 90_000;

/** Due means due now: dueAt <= now, with no day boundary (D1). */
export function isDueAt(card: Pick<Card, 'dueAt'>, now: Date): boolean {
  return card.dueAt.getTime() <= now.getTime();
}

function byMostOverdue(a: Card, b: Card): number {
  return a.dueAt.getTime() - b.dueAt.getTime() || byWritingOrder(a, b);
}

export interface DueInput {
  cards: readonly Card[];
  tests: ReadonlyMap<string, Test>;
  /** Earliest review of each card reviewed today (for "first seen today"). */
  firstReviewAt: ReadonlyMap<string, Date>;
  now: Date;
}

export interface DueResult {
  /** Due now, in session order: studied cards most overdue first, then new cards in writing order. */
  due: Card[];
  dueIds: Set<string>;
  dueByDeck: Map<string, number>;
  /** New cards Test mode holds back today (they'd be due without the test). Empty with includeHeldBack. */
  heldBack: Set<string>;
  shares: Map<string, DeckShare>;
}

export interface DueOptions {
  /**
   * D63, study ahead: the daily share is a pace, not a limit. A session started from the deck page's
   * "Study 3 cards early" also queues every new card the share holds back. The order doesn't change:
   * studied cards most overdue first, then new cards in writing order (D3).
   */
  includeHeldBack?: boolean;
}

export function computeDue({ cards, tests, firstReviewAt, now }: DueInput, { includeHeldBack = false }: DueOptions = {}): DueResult {
  const byDeck = new Map<string, Card[]>();
  for (const c of cards) {
    const list = byDeck.get(c.deckId);
    if (list) list.push(c);
    else byDeck.set(c.deckId, [c]);
  }
  const shares = new Map<string, DeckShare>();
  for (const [deckId, list] of byDeck) {
    const share = deckNewCardShare(list, tests.get(deckId), firstReviewAt, now);
    if (share) shares.set(deckId, share);
  }
  const studied: Card[] = [];
  const fresh: Card[] = [];
  const heldBack = new Set<string>();
  for (const c of cards) {
    if (!isDueAt(c, now)) continue;
    if (!isNewCard(c)) {
      studied.push(c);
      continue;
    }
    const share = shares.get(c.deckId);
    if (share && !share.allowed.has(c.id) && !includeHeldBack) heldBack.add(c.id);
    else fresh.push(c);
  }
  studied.sort(byMostOverdue);
  fresh.sort(byWritingOrder);
  const due = [...studied, ...fresh];
  const dueByDeck = new Map<string, number>();
  for (const c of due) dueByDeck.set(c.deckId, (dueByDeck.get(c.deckId) ?? 0) + 1);
  return { due, dueIds: new Set(due.map((c) => c.id)), dueByDeck, heldBack, shares };
}

export type SessionPick =
  | { kind: 'card'; card: Card }
  | { kind: 'wait'; card: Card; dueAt: Date }
  | { kind: 'done' };

/** Cards from this session that come back within 90 s (not due yet). */
export function returningSoon(cards: readonly Card[], sessionIds: ReadonlySet<string>, now: Date): Card[] {
  const t = now.getTime();
  return cards
    .filter((c) => sessionIds.has(c.id) && c.dueAt.getTime() > t && c.dueAt.getTime() <= t + WAIT_WINDOW_MS)
    .sort(byMostOverdue);
}

/**
 * Picked again after every rating (D3). A due card first; otherwise count down to a card from this
 * session due within 90 s (D22); otherwise Done. A card is never shown early.
 */
export function pickNext(due: readonly Card[], cards: readonly Card[], sessionIds: ReadonlySet<string>, now: Date): SessionPick {
  if (due.length > 0) return { kind: 'card', card: due[0] };
  const soon = returningSoon(cards, sessionIds, now);
  if (soon.length > 0) return { kind: 'wait', card: soon[0], dueAt: soon[0].dueAt };
  return { kind: 'done' };
}

/** "N left": cards due now, plus cards from this session due again within 90 s. */
export function leftCount(due: readonly Card[], cards: readonly Card[], sessionIds: ReadonlySet<string>, now: Date): number {
  return due.length + returningSoon(cards, sessionIds, now).length;
}

/** The bar: ratings saved this session ÷ (ratings saved + cards left). */
export function progressFraction(saved: number, left: number): number {
  const total = saved + left;
  return total === 0 ? 1 : saved / total;
}
