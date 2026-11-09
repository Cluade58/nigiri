// One read of everything Today, a deck page and a review session need. Small data (a few friends),
// so every card is read; reviews are read only for the last 7 local days, plus the full history of
// cards reviewed today (to tell "first seen today").
import { getSettings, type Card, type Deck, type NigiriDb, type Review, type Settings, type Test } from './db';
import { State } from './scheduler';
import { startOfLocalDay, startOfLocalDayOffset } from './time';
import { xpOf, type XpParts, type XpReview } from './xp';

export interface Snapshot {
  decks: Deck[];
  cards: Card[];
  tests: Map<string, Test>;
  settings: Settings;
  /** Reviews since the start of the local day 6 days ago (D50's 7 days). */
  recentReviews: Review[];
  /** Earliest review of each card reviewed today. */
  firstReviewAt: Map<string, Date>;
  lastReviewAt: Date | null;
}

export async function loadSnapshot(db: NigiriDb, now: Date): Promise<Snapshot> {
  const since = startOfLocalDayOffset(now, -6);
  const todayStart = startOfLocalDay(now).getTime();
  const [decks, cards, testList, settings, recentReviews, last] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.tests.toArray(),
    getSettings(db),
    db.reviews.where('reviewTime').aboveOrEqual(since).toArray(),
    db.reviews.orderBy('reviewTime').last(),
  ]);
  const todayIds = [...new Set(recentReviews.filter((r) => r.reviewTime.getTime() >= todayStart).map((r) => r.cardId))];
  const firstReviewAt = new Map<string, Date>();
  if (todayIds.length > 0) {
    const theirs = await db.reviews.where('cardId').anyOf(todayIds).toArray();
    for (const r of theirs) {
      const prev = firstReviewAt.get(r.cardId);
      if (!prev || r.reviewTime.getTime() < prev.getTime()) firstReviewAt.set(r.cardId, r.reviewTime);
    }
  }
  return {
    decks,
    cards,
    tests: new Map(testList.map((t) => [t.deckId, t])),
    settings,
    recentReviews,
    firstReviewAt,
    lastReviewAt: last ? last.reviewTime : null,
  };
}

/**
 * When the re-read after a saved rating fails, the review screen carries on from its last snapshot
 * with the saved rating applied, the way loadSnapshot would have read it (LS-1 F1, CR-1 M5): the
 * card's new state, the review in the last 7 days, the latest review time, and, when the card was
 * new, its first review today, so Test mode's share counts it as first seen today. Pure.
 */
export function withSavedRating(old: Snapshot, saved: { card: Card; review: Review }): Snapshot {
  const { card, review } = saved;
  const firstReviewAt = new Map(old.firstReviewAt);
  // The revlog keeps the card as it was before the rating (H5): New means this was its first review.
  if (review.state === State.New && !firstReviewAt.has(card.id)) firstReviewAt.set(card.id, review.reviewTime);
  const last = old.lastReviewAt;
  return {
    ...old,
    cards: old.cards.map((c) => (c.id === card.id ? card : c)),
    recentReviews: old.recentReviews.some((r) => r.id === review.id) ? old.recentReviews : [...old.recentReviews, review],
    firstReviewAt,
    lastReviewAt: last && last.getTime() > review.reviewTime.getTime() ? last : review.reviewTime,
  };
}

/** D73's XP right now, and every review it was counted from (for the streak on Done). One read. */
export async function loadXp(db: NigiriDb): Promise<{ xp: XpParts; reviews: XpReview[] }> {
  const [cards, reviews] = await db.transaction('r', db.cards, db.reviews, () => Promise.all([db.cards.toArray(), db.reviews.toArray()]));
  const lite = reviews.map((r) => ({ id: r.id, cardId: r.cardId, reviewTime: r.reviewTime, dueAt: r.dueAt }));
  return { xp: xpOf(cards, lite), reviews: lite };
}
