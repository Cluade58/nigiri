// XP, levels and sushi ranks (D73), and the deck bar's Solid (D74). Everything is counted from saved
// reviews and cards, like the streak: nothing new is stored, so Export and Restore carry it all, and
// the number can go down when a card (and its reviews) is deleted. XP never depends on the rating.
// Days are the phone's local calendar days (D58). Pure: no function reads the clock.
import { NBSP } from './copy';
import type { Card, Review } from './db';
import { cardsPerDay, totalsOf } from './progress';
import { isNewCard } from './scheduler';
import { localDayKey, startOfLocalDayOffset } from './time';

export const XP_PER_REVIEW = 10;
export const XP_PER_CARD = 15;
export const XP_BONUS = 20;

/** What XP is counted from: each review's own id, card and time, plus the revlog's before-review dueAt. */
export type XpReview = Pick<Review, 'id' | 'cardId' | 'reviewTime' | 'dueAt'>;
export type XpCard = Pick<Card, 'id' | 'dueAt'>;

export interface XpParts {
  /** R1: 10 × the different cards reviewed on each local day, added over every day. */
  review: number;
  /** R2: 15 × the cards that exist. */
  writing: number;
  /** R3: 20 for each local day that earned the bonus. */
  bonus: number;
  total: number;
}

const byTimeThenId = (a: XpReview, b: XpReview) => a.reviewTime.getTime() - b.reviewTime.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** The first index whose reviewTime is at or after `t` (the list is sorted). */
function firstAtOrAfter(list: readonly XpReview[], t: number): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].reviewTime.getTime() < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * R3: the local days that earned the bonus. For a day, F is its earliest review. S is the cards with
 * a review before F whose due time at F is at or before F; that due time is the dueAt of the card's
 * first review at or after F (a revlog holds the card as it was before the review, H5), or the stored
 * card's dueAt if it has none. The day earns it when every card in S has a review from F to the end
 * of that local day. S empty: the day's review earns it. A review whose card is gone can't exist
 * (deleting a card deletes its reviews), and is skipped if it does.
 */
export function bonusDays(cards: readonly XpCard[], reviews: readonly XpReview[]): Set<string> {
  const index = indexReviews(cards, reviews);
  const firstOfDay = new Map<string, number>();
  for (const list of index.perCard.values()) {
    for (const r of list) {
      const key = localDayKey(r.reviewTime);
      const t = r.reviewTime.getTime();
      const f = firstOfDay.get(key);
      if (f === undefined || t < f) firstOfDay.set(key, t);
    }
  }
  const earned = new Set<string>();
  for (const [key, f] of firstOfDay) {
    const end = startOfLocalDayOffset(new Date(f), 1).getTime();
    const ok = waiting(index, f).every(({ next }) => next !== null && next.reviewTime.getTime() < end);
    if (ok) earned.add(key);
  }
  return earned;
}

interface ReviewIndex {
  stored: Map<string, number>;
  /** Each existing card's reviews, by time, ties by review id. */
  perCard: Map<string, XpReview[]>;
}

function indexReviews(cards: readonly XpCard[], reviews: readonly XpReview[]): ReviewIndex {
  const stored = new Map(cards.map((c) => [c.id, c.dueAt.getTime()]));
  const perCard = new Map<string, XpReview[]>();
  for (const r of reviews) {
    if (!stored.has(r.cardId)) continue;
    let list = perCard.get(r.cardId);
    if (!list) perCard.set(r.cardId, (list = []));
    list.push(r);
  }
  for (const list of perCard.values()) list.sort(byTimeThenId);
  return { stored, perCard };
}

/** S at moment `f`, each card with its first review at or after `f` (null if none). */
function waiting(index: ReviewIndex, f: number): { cardId: string; next: XpReview | null }[] {
  const out: { cardId: string; next: XpReview | null }[] = [];
  for (const [cardId, list] of index.perCard) {
    const i = firstAtOrAfter(list, f);
    if (i === 0) continue; // no review before F: not in S
    const next = i < list.length ? list[i] : null;
    const dueAtF = next ? next.dueAt.getTime() : index.stored.get(cardId)!;
    if (dueAtF > f) continue; // came due after F: not required
    out.push({ cardId, next });
  }
  return out;
}

/** S for a day whose first review is at `f`: the ids of the studied cards that were waiting then. */
export function waitingAt(cards: readonly XpCard[], reviews: readonly XpReview[], f: Date): string[] {
  return waiting(indexReviews(cards, reviews), f.getTime()).map((w) => w.cardId);
}

/** D73's XP. The total is the sum of the three parts. */
export function xpOf(cards: readonly XpCard[], reviews: readonly XpReview[]): XpParts {
  const kept = new Set(cards.map((c) => c.id));
  const live = reviews.filter((r) => kept.has(r.cardId));
  const review = XP_PER_REVIEW * totalsOf(cardsPerDay(live), cards).cardsReviewed;
  const writing = XP_PER_CARD * cards.length;
  const bonus = XP_BONUS * bonusDays(cards, live).size;
  return { review, writing, bonus, total: review + writing + bonus };
}

/** One local day's review XP and bonus (writing XP belongs to no day). */
export function xpOfDay(cards: readonly XpCard[], reviews: readonly XpReview[], dayKey: string): { review: number; bonus: number } {
  const kept = new Set(cards.map((c) => c.id));
  const live = reviews.filter((r) => kept.has(r.cardId));
  const n = cardsPerDay(live).get(dayKey) ?? 0;
  return { review: XP_PER_REVIEW * n, bonus: bonusDays(cards, live).has(dayKey) ? XP_BONUS : 0 };
}

// ---------- Levels and ranks ----------

export const RANKS = ['Rice', 'Tamago', 'Cucumber', 'Salmon', 'Tuna', 'Otoro', 'Master'] as const;
export type Rank = (typeof RANKS)[number];

/** XP level L needs to reach level L + 1: round(100 × 1.4^(L−1) / 10) × 10. */
export function needFor(level: number): number {
  return Math.round((100 * Math.pow(1.4, level - 1)) / 10) * 10;
}

/** Total XP at which level L starts (level 1 starts at 0). */
export function xpToReach(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += needFor(l);
  return sum;
}

/** Every 3 levels: Rice 1–3, Tamago 4–6, … Otoro 16–18, Master 19 and up. */
export function rankOf(level: number): Rank {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((Math.max(1, level) - 1) / 3))];
}

export interface LevelInfo {
  level: number;
  rank: Rank;
  xp: number;
  /** XP earned inside this level. */
  into: number;
  /** XP this level needs in all. */
  need: number;
  /** XP still to go to the next level. */
  toNext: number;
  /** The rank the next level starts, when it starts a new one. */
  nextRank: Rank | null;
}

export function levelOf(xp: number): LevelInfo {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  let start = 0;
  while (start + needFor(level) <= total) {
    start += needFor(level);
    level += 1;
  }
  const need = needFor(level);
  const rank = rankOf(level);
  const next = rankOf(level + 1);
  return { level, rank, xp: total, into: total - start, need, toNext: start + need - total, nextRank: next !== rank ? next : null };
}

/** "120 XP to level 6", or "120 XP to Salmon" when the next level starts a rank. */
export function nextLine(info: LevelInfo): string {
  const n = info.toNext.toLocaleString();
  return info.nextRank ? `${n}${NBSP}XP to ${info.nextRank}` : `${n}${NBSP}XP to level ${info.level + 1}`;
}

/** "Level 5, 1,240 XP". */
export function levelLine(info: LevelInfo): string {
  return `Level ${info.level}, ${info.xp.toLocaleString()}${NBSP}XP`;
}

// ---------- The deck bar (D74) ----------

export const SOLID_GAP_MS = 14 * 86_400_000;
export type Stage = 'new' | 'learning' | 'solid';

/**
 * New = never reviewed. Solid = reviewed, with a current gap (dueAt − lastReviewAt) of at least 14
 * days; being overdue doesn't change it. Everything else reviewed is Learning.
 */
export function stageOf(card: Pick<Card, 'state' | 'dueAt' | 'lastReviewAt'>): Stage {
  if (isNewCard(card)) return 'new';
  if (!card.lastReviewAt) return 'learning';
  return card.dueAt.getTime() - card.lastReviewAt.getTime() >= SOLID_GAP_MS ? 'solid' : 'learning';
}

export interface StageCounts {
  solid: number;
  learning: number;
  new: number;
}

export function stageCounts(cards: readonly Pick<Card, 'state' | 'dueAt' | 'lastReviewAt'>[]): StageCounts {
  const out: StageCounts = { solid: 0, learning: 0, new: 0 };
  for (const c of cards) out[stageOf(c)] += 1;
  return out;
}

/** "4 solid, 5 learning, 3 new", zero parts left out, in this order. */
export function stageLine(c: StageCounts): string {
  const parts: string[] = [];
  if (c.solid) parts.push(`${c.solid} solid`);
  if (c.learning) parts.push(`${c.learning} learning`);
  if (c.new) parts.push(`${c.new} new`);
  return parts.join(', ');
}
