// The one scheduler: ts-fsrs 6.0.0 (pinned), FSRS-7, created once at startup (spec §2, §7; fsrs-notes §5).
// Only the v6 calls are used: DefaultScheduler, newCard, review. No delay is set per rating here:
// the 1-minute learning and relearning steps are the only set delays, and the library applies them.
import {
  DefaultScheduler,
  type DefaultSchedulerCard,
  type DefaultSchedulerOptions,
  type DefaultSchedulerRevlog,
  type Grade,
  State,
} from 'ts-fsrs';

/** Spec §7's configuration, exactly. Change nothing else (fsrs-notes §5). */
export const SCHEDULER_CONFIG = {
  version: 'FSRS-7',
  desiredRetention: { 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.95 },
  learningSteps: ['1m'],
  relearningSteps: ['1m'],
  allowModelOverride: false,
} as const;

/** Written into the backup file (D54), never onto cards. */
export const SCHEDULER_STAMP = { package: 'ts-fsrs', version: '6.0.0', model: 'FSRS-7' } as const;

export type Scheduler = DefaultScheduler<'FSRS-7'>;
/** The scheduling fields exactly as ts-fsrs returns them (spec §4), including its cardId. */
export type SchedFields = DefaultSchedulerCard<'FSRS-7'>;
/** The review log exactly as ts-fsrs returns it (H5): the card as it was, plus rating and reviewTime. */
export type Revlog = DefaultSchedulerRevlog<'FSRS-7'>;
export type { Grade };
export { State };

export const SCHED_KEYS = [
  'stability',
  'stabilityFast',
  'difficulty',
  'dueAt',
  'lastReviewAt',
  'state',
  'scheduleStatus',
  'cardId',
  'reps',
  'lapses',
  'scheduledDays',
  'learningStep',
] as const satisfies readonly (keyof SchedFields)[];

export const REVLOG_KEYS = [
  'stability',
  'stabilityFast',
  'difficulty',
  'dueAt',
  'lastReviewAt',
  'reviewTime',
  'scheduleStatus',
  'rating',
  'state',
  'cardId',
  'scheduledDays',
  'learningStep',
] as const satisfies readonly (keyof Revlog)[];

/**
 * Creates the scheduler. It's async (the model loads on demand): await it before the first review.
 * The per-rating retention object (D27) isn't in ts-fsrs's docs, and the installed 6.0.0 options type
 * only declares `desiredRetention?: number`. At run time DefaultScheduler hands the value to its
 * desired-retention policy, whose schema accepts `number | Record<Grade, number>` and applies it per
 * rating (LS-1 checked the library source; fsrs-notes §9). So this is the one cast, and
 * tests/scheduler.test.ts pins the resulting config and the Easy interval it gives.
 */
export function createScheduler(): Promise<Scheduler> {
  return DefaultScheduler<'FSRS-7'>(SCHEDULER_CONFIG as unknown as DefaultSchedulerOptions<'FSRS-7'>);
}

/** Copies only the scheduling fields (drops id, deck, text). */
export function pickSched(card: SchedFields): SchedFields {
  const out: Record<string, unknown> = {};
  for (const key of SCHED_KEYS) out[key] = card[key];
  return out as SchedFields;
}

export function pickRevlog(revlog: Revlog): Revlog {
  const out: Record<string, unknown> = {};
  for (const key of REVLOG_KEYS) out[key] = revlog[key];
  return out as Revlog;
}

/**
 * D23: `now` is the later of the tap and the card's lastReviewAt, because FSRS-7 throws on a review
 * dated before the last one (fsrs-notes H8, scenario 13).
 */
export function reviewTime(tap: Date, lastReviewAt: Date | null): Date {
  if (lastReviewAt && lastReviewAt.getTime() > tap.getTime()) return new Date(lastReviewAt.getTime());
  return tap;
}

/** Runs one review on the stored copy. Pure: the input is not changed (scenario 12). */
export function reviewCard(scheduler: Scheduler, card: SchedFields, grade: Grade, tap: Date): { card: SchedFields; revlog: Revlog } {
  const sched = pickSched(card);
  const now = reviewTime(tap, sched.lastReviewAt);
  const result = scheduler.review({ card: sched, grade, now });
  return { card: pickSched(result.card), revlog: pickRevlog(result.revlog) };
}

/** A new card's scheduling fields: due the moment it's made (scenario 1). */
export function newCardFields(scheduler: Scheduler, cardId: string, now: Date): SchedFields {
  return pickSched(scheduler.newCard({ cardId, now }));
}

export function isNewCard(card: Pick<SchedFields, 'state'>): boolean {
  return card.state === State.New;
}
