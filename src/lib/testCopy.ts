// Test mode's words (D44, D51(4), UI-BENTO-1 §3, mockups/deck.html?test and deck-test.html).
// Facts, not forecasts: the test day, days left, studied and not studied yet, today's share, and the
// fit check. Never a percentage, a grade, "ready" or a prediction. Pure: every function takes `now`.
import { format } from 'date-fns';
import { NBSP, cards, plural } from './copy';
import type { DeckShare, FitDeck, FitResult } from './testMode';
import { MAX_MINUTES_PER_DAY, SECONDS_PER_CARD } from './testMode';
import { addDaysToKey, daysBetweenKeys, localDayKey, parseDayKey } from './time';

/** A calendar day as a local Date at midnight, for naming it. */
function keyToLocalDate(key: string): Date {
  const p = parseDayKey(key);
  if (!p) throw new Error(`Not a calendar day: ${key}`);
  return new Date(p.y, p.m - 1, p.d);
}

/** Calendar days from local today to the day (0 = today, negative = past). */
export function daysUntil(key: string, now: Date): number {
  return daysBetweenKeys(localDayKey(now), key);
}

/**
 * D63: the N in the deck page's "Study N cards early", the new cards the share holds back today. On
 * test day and the day before nothing is offered (everything is due then anyway).
 */
export function studyEarlyCount(heldBack: number, testDate: string, now: Date): number {
  return daysUntil(testDate, now) >= 2 ? heldBack : 0;
}

/** "Friday" for a day 2–6 days away, "Nov 23" from 7 days on (UI-BENTO-1 §3). */
function dayName(key: string, now: Date): string {
  const date = keyToLocalDate(key);
  if (daysUntil(key, now) <= 6) return format(date, 'EEEE');
  return `${format(date, 'MMM')}${NBSP}${format(date, 'd')}`;
}

/** The when line: "Test today", "Test tomorrow", "Test Friday, in 3 days", "Test Nov 23, in 13 days". */
export function whenLine(testDate: string, now: Date): string {
  const d = daysUntil(testDate, now);
  if (d <= 0) return 'Test today';
  if (d === 1) return 'Test tomorrow';
  return `Test ${dayName(testDate, now)}, in ${plural(d, 'day')}`;
}

/** A deck row's test day on Today (mockups/home.html): "Test Friday", without the days left. */
export function shortWhen(testDate: string, now: Date): string {
  const d = daysUntil(testDate, now);
  if (d <= 0) return 'Test today';
  if (d === 1) return 'Test tomorrow';
  return `Test ${dayName(testDate, now)}`;
}

/**
 * The date field's helper on the test screen, the picked day in words (UI-CRIT-1), since the native
 * field shows it in the phone's own short format: "Today, Sunday Nov 8", "Tomorrow, Monday Nov 9",
 * "In 3 days, Wednesday Nov 11".
 */
export function relativeDay(testDate: string, now: Date): string {
  const d = daysUntil(testDate, now);
  const date = keyToLocalDate(testDate);
  const named = `${format(date, 'EEEE')} ${format(date, 'MMM')}${NBSP}${format(date, 'd')}`;
  const when = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${plural(d, 'day')}`;
  return `${when}, ${named}`;
}

/** "30 of 35 studied", or "All 35 cards studied". Studied means at least one review (D44). */
export function studiedLine(studied: number, total: number): string {
  // Builder's wording for a deck with a test and no cards: the deck page's own empty words (reported as undecided).
  if (total === 0) return 'No cards yet';
  if (studied >= total) return `All ${cards(total)} studied`;
  return `${studied} of ${total} studied`;
}

/**
 * The plan in one line (D44, fsrs-notes §10 rule 1): "5 not studied yet: 2 today, all by Thursday", or
 * "5 not studied yet, all due today" when today's share is everything left. Null when every card is
 * studied (the studied line says so). Today's share is what's left of it today, so after studying it
 * the line says "none left today" (builder's wording, reported as undecided).
 */
export function planLine(share: Pick<DeckShare, 'unseen' | 'share' | 'daysLeft'> | null, testDate: string, now: Date): string | null {
  if (!share || share.unseen === 0) return null;
  const { unseen, share: today } = share;
  if (today >= unseen) return `${unseen} not studied yet, all due today`;
  const dayBefore = addDaysToKey(testDate, -1);
  const by = daysUntil(dayBefore, now) === 1 ? 'tomorrow' : dayName(dayBefore, now);
  return `${unseen} not studied yet: ${today === 0 ? 'none left today' : `${today} today`}, all by ${by}`;
}

/**
 * Today's fit line (UI-BENTO-1 §3), split so the verdict words can be set in weight 600.
 * "It fits: your 3 tests need about 47 minutes a day, and you have 50."
 */
export function fitLine(fit: FitResult): { verdict: string; rest: string } {
  const per = fit.allToday ? 'today' : 'a day';
  const need = plural(fit.minutesNeeded, 'minute');
  const subject =
    fit.decks.length === 1 ? `this test needs about ${need} ${per}` : `your ${plural(fit.decks.length, 'test')} need about ${need} ${per}`;
  if (fit.overMax) {
    return {
      verdict: "It doesn't fit",
      rest: `: ${subject}, more than the ${MAX_MINUTES_PER_DAY} you can set. Reviews start with the cards waiting longest, and none are skipped.`,
    };
  }
  return { verdict: fit.fits ? 'It fits' : "It doesn't fit", rest: `: ${subject}, and you have ${fit.minutesPerDay}.` };
}

/** "Raise it to 25 and it fits": the next step of 5 that covers the total (the stepper moves in fives). */
export function raiseTo(minutesNeeded: number): number {
  return Math.max(5, Math.ceil(minutesNeeded / 5) * 5);
}

export interface TestScreenFit {
  verdict: 'It fits' | "It doesn't fit";
  lede: string;
  /** The short line read out 500 ms after the last change (the long lede isn't a live region). */
  announce: string;
}

/**
 * The test screen's fit section (mockups/deck-test.html): this deck's sum, then the other tests, then
 * the minutes you have. `fit` is the check with this deck's date as typed; `others` names each other test.
 */
export function testScreenFit(
  fit: FitResult,
  deckId: string,
  cardCount: number,
  otherName: (deckId: string) => string,
): TestScreenFit | null {
  const own = fit.decks.find((d) => d.deckId === deckId);
  if (!own) return null;
  const others: FitDeck[] = fit.decks.filter((d) => d.deckId !== deckId);
  const ownPer = own.isToday ? 'today' : 'a day';
  const totalPer = fit.allToday ? 'today' : 'a day';
  const when = own.isToday ? 'with the test today' : `with ${plural(own.daysLeft, 'day')} left`;
  let lede = `${cards(cardCount)} at ${SECONDS_PER_CARD}${NBSP}seconds each, ${when}, needs about ${own.minutes}${NBSP}min ${ownPer}`;
  if (others.length > 0) {
    const adds = others.reduce((n, d) => n + d.minutes, 0);
    const who = others.length === 1 ? `Your ${otherName(others[0].deckId)} test adds ${adds}` : `Your ${others.length} other tests add ${adds}`;
    lede += `. ${who}, so ${fit.minutesNeeded}${NBSP}min ${totalPer} in all`;
  }
  if (fit.overMax) {
    lede += `, more than the ${MAX_MINUTES_PER_DAY} you can set. You can still save the test: reviews start with the cards waiting longest, and none are skipped.`;
  } else {
    lede += `. You have ${fit.minutesPerDay}.`;
    if (!fit.fits) lede += ` Raise it to ${raiseTo(fit.minutesNeeded)} and it fits.`;
  }
  const verdict = fit.fits ? 'It fits' : "It doesn't fit";
  return { verdict, lede, announce: `${verdict}. Needs ${fit.minutesNeeded} min ${totalPer}, you have ${fit.minutesPerDay}.` };
}
