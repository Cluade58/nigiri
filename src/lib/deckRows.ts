// The deck list's rows, shared by Today's Decks tile and the Decks tab: each deck's card count, due
// count, its test day in place of the count when a test is ahead (mockups/home.html), and the New /
// Learning / Solid counts for its bar (D74, round 1 plan §5).
import type { Card } from './db';
import { computeDue } from './queue';
import type { Snapshot } from './snapshot';
import { shortWhen } from './testCopy';
import { testApplies } from './testMode';
import { orderDecks } from './today';
import { stageCounts } from './xp';

export function deckRowsOf(snap: Snapshot, now: Date, dueByDeck?: ReadonlyMap<string, number>) {
  const due = dueByDeck ?? computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now }).dueByDeck;
  const byDeck = new Map<string, Card[]>();
  for (const c of snap.cards) {
    const list = byDeck.get(c.deckId);
    if (list) list.push(c);
    else byDeck.set(c.deckId, [c]);
  }
  return orderDecks(snap.decks, snap.tests, now).map((deck) => {
    const t = snap.tests.get(deck.id);
    return {
      deck,
      count: byDeck.get(deck.id)?.length ?? 0,
      stages: stageCounts(byDeck.get(deck.id) ?? []),
      due: due.get(deck.id) ?? 0,
      testDay: testApplies(t, now) ? shortWhen(t.date, now) : null,
    };
  });
}
