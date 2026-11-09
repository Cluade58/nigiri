// Review (mockups/review-*.html). The question, Show answer, the four keys with the hint line,
// "12 left" and the bar; Waiting ("Next card in 0:48"); and Done. Focused: no other screen chrome.
// Every rating saves as it's tapped (spec §3), so ✕ is the pause and Today's button is the resume (D42).
// `early` (D63, from the deck page's "Study 3 cards early" only) also queues the new cards Test mode's
// share holds back; the order, "N left", the countdown and Done work as in any session.
// Round 1 (plan §3, §7, §8a): the card's marks render on both sides, a short answer reads larger, and
// Done adds the streak strip, the XP ledger (each part's change since the session began, D73) and a
// level-up line.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, Navigate } from 'react-router';
import { Rating } from 'ts-fsrs';
import { useApp } from '../app/context';
import { RankIcon } from '../components/RankIcon';
import { DayStrip, stripText } from '../components/Tiles';
import { CheckSmall, CloseIcon } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { NBSP, OUT_OF_SPACE, cards as cardsText, notSaved, plural } from '../lib/copy';
import type { Card, Deck } from '../lib/db';
import { isQuotaError } from '../lib/errors';
import { computeDue, leftCount, pickNext, progressFraction } from '../lib/queue';
import { saveRating, snapshotOf, type CardSnapshot, type RatingResult } from '../lib/saves';
import { formatReturn, isNewCard, previewDue, type Grade, type Scheduler } from '../lib/scheduler';
import { heldBackDueTomorrow, nextDueLine, sessionDeckRows, type SessionDeckRow } from '../lib/doneSummary';
import { cardsPerDay, streakOf } from '../lib/progress';
import { loadSnapshot, loadXp, withSavedRating, type Snapshot } from '../lib/snapshot';
import { testApplies } from '../lib/testMode';
import { startOfLocalDay } from '../lib/time';
import { orderDecks } from '../lib/today';
import { levelOf, type XpParts, type XpReview } from '../lib/xp';
import { CardPile } from './CardPile';
import { StorageError } from './StorageError';
import { useTitle } from './useTitle';

const KEYS: readonly { grade: Grade; label: string }[] = [
  { grade: Rating.Again, label: 'Again' },
  { grade: Rating.Hard, label: 'Hard' },
  { grade: Rating.Good, label: 'Good' },
  { grade: Rating.Easy, label: 'Easy' },
];

/** D16: for 400 ms after the answer or the next card appears, taps on that spot do nothing. */
const GUARD_MS = 400;
/** Milliseconds since `at` (performance.now() time), outside render. */
const sinceMs = (at: number) => performance.now() - at;
const stamp = () => performance.now();
const HINT = 'Forgot it? Tap Again. Right but slow? Hard.';

type Phase =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'gone' }
  | { kind: 'card'; card: Card; snap: CardSnapshot; revealed: boolean; at: number; revealAt: Date | null }
  | { kind: 'wait'; dueAt: Date }
  | { kind: 'done' };

type SavedRating = Extract<RatingResult, { status: 'saved' }>;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const spoken = (s: number) => (s >= 60 ? `about ${Math.round(s / 60)} minute${Math.round(s / 60) === 1 ? '' : 's'}` : `${s} second${s === 1 ? '' : 's'}`);

export function Review({ deckId, early = false }: { deckId?: string; early?: boolean }) {
  const { db, scheduler } = useApp();
  const [phase, setPhaseState] = useState<Phase>({ kind: 'loading' });
  const [data, setData] = useState<Snapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [session, setSession] = useState<ReadonlySet<string>>(() => new Set());
  const [saved, setSaved] = useState(0);
  const [rated, setRated] = useState<Grade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState('');
  /** D45: for each deck with a test ahead, how many of its cards weren't studied when the session began. */
  const [startUnstudied, setStartUnstudied] = useState<ReadonlyMap<string, number> | null>(null);
  /** D73: XP when the session began, so Done shows each part's change (null if that read failed). */
  const [startXp, setStartXp] = useState<XpParts | null>(null);
  /** Plan §3: whether today already had a review before this session (then today's cell doesn't fill on Done). */
  const [hadToday, setHadToday] = useState(true);

  // Callbacks read the latest values through refs; rendering reads state.
  const phaseRef = useRef<Phase>(phase);
  const dataRef = useRef<Snapshot | null>(null);
  const sessionRef = useRef<Set<string>>(new Set());
  const busy = useRef(false);
  /**
   * Bumped at every rating tap. A once-a-minute or back-on-screen re-read notes it when it starts and
   * throws its result away if a rating came in meanwhile, so an older read never overwrites the counts
   * the rating's own re-read set (CR-1 M5).
   */
  const ratings = useRef(0);
  /** True between a rating and the next card, so focus can move from the keys to Show answer. */
  const afterRating = useRef(false);
  const showRef = useRef<HTMLButtonElement>(null);

  useTitle(phase.kind === 'done' ? 'Done' : 'Review');

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const scope = useCallback((snap: Snapshot) => (deckId ? snap.cards.filter((c) => c.deckId === deckId) : snap.cards), [deckId]);
  // Only a deck's own session can study ahead (D63: never from Today).
  const includeHeldBack = early && deckId !== undefined;
  const dueOf = useCallback(
    (snap: Snapshot, t: Date) =>
      computeDue({ cards: scope(snap), tests: snap.tests, firstReviewAt: snap.firstReviewAt, now: t }, { includeHeldBack }).due,
    [scope, includeHeldBack],
  );

  /**
   * Reads the cards again. If that read fails after a saved rating, the last snapshot carries on with
   * the saved rating applied (withSavedRating), so the counts and Test mode's share stay right.
   */
  const refresh = useCallback(
    async (saved?: SavedRating): Promise<{ snap: Snapshot; t: Date }> => {
      const t = new Date();
      let snap: Snapshot;
      try {
        snap = await loadSnapshot(db, t);
      } catch (e) {
        const old = dataRef.current;
        if (!old) throw e;
        snap = saved ? withSavedRating(old, saved) : old;
      }
      dataRef.current = snap;
      setData(snap);
      setNow(t);
      return { snap, t };
    },
    [db],
  );

  /** The clock's re-read while a card is shown. A rating tapped while it was reading wins: its result is dropped. */
  const backgroundRefresh = useCallback(async () => {
    const started = ratings.current;
    const t = new Date();
    let snap: Snapshot;
    try {
      snap = await loadSnapshot(db, t);
    } catch {
      return; // the last snapshot stays; the next tick tries again
    }
    if (ratings.current !== started) return;
    dataRef.current = snap;
    setData(snap);
    setNow(t);
  }, [db]);

  /** Picked again after every rating (D3): a due card, a countdown to one within 90 s, or Done. */
  const advance = useCallback(
    (snap: Snapshot, t: Date) => {
      if (deckId && !snap.decks.some((d) => d.id === deckId)) {
        setPhase({ kind: 'gone' });
        return;
      }
      setError(null);
      const pick = pickNext(dueOf(snap, t), scope(snap), sessionRef.current, t);
      if (pick.kind === 'card') setPhase({ kind: 'card', card: pick.card, snap: snapshotOf(pick.card), revealed: false, at: stamp(), revealAt: null });
      else if (pick.kind === 'wait') setPhase({ kind: 'wait', dueAt: pick.dueAt });
      else setPhase({ kind: 'done' });
    },
    [deckId, dueOf, scope, setPhase],
  );

  const refreshAndAdvance = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { snap, t } = await refresh();
      advance(snap, t);
    } finally {
      busy.current = false;
    }
  }, [advance, refresh]);

  // Start: read the cards, then pick the first one.
  useEffect(() => {
    let alive = true;
    // The XP read is separate: if it fails, Done just leaves the XP out.
    const xpRead = loadXp(db).then(
      (r) => r.xp,
      () => null,
    );
    Promise.all([refresh(), xpRead])
      .then(([{ snap, t }, xp]) => {
        if (!alive) return;
        setStartXp(xp);
        const todayStart = startOfLocalDay(t).getTime();
        setHadToday(snap.recentReviews.some((r) => r.reviewTime.getTime() >= todayStart));
        const unstudied = new Map<string, number>();
        for (const c of scope(snap)) {
          if (isNewCard(c) && testApplies(snap.tests.get(c.deckId), t)) unstudied.set(c.deckId, (unstudied.get(c.deckId) ?? 0) + 1);
        }
        setStartUnstudied(unstudied);
        advance(snap, t);
      })
      .catch(() => {
        if (alive) setPhase({ kind: 'failed' });
      });
    return () => {
      alive = false;
    };
  }, [advance, db, refresh, scope, setPhase]);

  // The clock. Waiting ticks every second, but the time shown always comes from the card's dueAt;
  // at zero the screen picks again. Otherwise the count is redone once a minute, and whenever the
  // app comes back on screen (a clock that jumped mid-wait shows the card).
  const waiting = phase.kind === 'wait';
  useEffect(() => {
    const id = window.setInterval(
      () => {
        const t = new Date();
        setNow(t);
        const p = phaseRef.current;
        if (p.kind === 'wait' && t.getTime() >= p.dueAt.getTime()) void refreshAndAdvance();
        else if (p.kind === 'card' && !waiting && !busy.current) void backgroundRefresh();
      },
      waiting ? 1000 : 60_000,
    );
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || busy.current) return;
      const p = phaseRef.current;
      if (p.kind === 'wait') void refreshAndAdvance();
      else if (p.kind === 'card') void backgroundRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [waiting, backgroundRefresh, refreshAndAdvance]);

  function show() {
    const p = phaseRef.current;
    if (p.kind !== 'card' || p.revealed) return;
    if (sinceMs(p.at) < GUARD_MS) return;
    setPhase({ ...p, revealed: true, at: stamp(), revealAt: new Date() });
  }

  async function rate(grade: Grade, label: string) {
    const p = phaseRef.current;
    if (p.kind !== 'card' || !p.revealed || busy.current) return;
    if (sinceMs(p.at) < GUARD_MS) return;
    busy.current = true;
    ratings.current += 1;
    const tap = new Date();
    // The keys turn off at the tap and stay off until the next card appears.
    setRated(grade);
    setError(null);
    let result: RatingResult;
    try {
      result = await saveRating(db, scheduler, p.snap, grade, tap);
    } catch (err) {
      // Nothing was logged; the keys come back on, and the line says what to tap (check 5).
      busy.current = false;
      setRated(null);
      const text = isQuotaError(err) ? OUT_OF_SPACE : notSaved(label);
      setError(text);
      setLive(text);
      return;
    }
    if (result.status === 'saved') {
      sessionRef.current.add(result.card.id);
      setSession(new Set(sessionRef.current));
      setSaved((n) => n + 1);
    }
    try {
      const { snap, t } = await refresh(result.status === 'saved' ? result : undefined);
      if (result.status === 'saved') {
        const left = leftCount(dueOf(snap, t), scope(snap), sessionRef.current, t);
        setLive(grade === Rating.Again ? `Again. It comes back later in this session. ${left}${NBSP}left.` : `Rated ${label}. ${left}${NBSP}left.`);
      }
      afterRating.current = true;
      advance(snap, t);
    } finally {
      busy.current = false;
      setRated(null);
    }
  }

  // Focus: the answer when it appears (CardPile moves it there, so it's read out); Show answer when a
  // new card replaces the keys after a rating (the keys it was on are gone). The first card moves no focus.
  const phaseKey = phase.kind === 'card' ? `${phase.card.id}:${phase.snap.reps}:${phase.revealed}` : phase.kind;
  useLayoutEffect(() => {
    const p = phaseRef.current;
    if (p.kind !== 'card' || p.revealed || !afterRating.current) return;
    afterRating.current = false;
    if (!document.activeElement || document.activeElement === document.body) showRef.current?.focus({ preventScroll: true });
  }, [phaseKey]);

  if (phase.kind === 'gone') return <Navigate to="/" replace />;
  if (phase.kind === 'failed') {
    return (
      <StorageError
        onRetry={async () => {
          try {
            await refreshAndAdvance();
            return true;
          } catch {
            return false;
          }
        }}
      />
    );
  }
  if (phase.kind === 'loading' || !data) return <div className="booting" aria-busy="true" />;
  if (phase.kind === 'done') {
    return (
      <Done
        count={session.size}
        milestone={milestoneOf(data, startUnstudied, session, now)}
        startXp={startXp}
        hadToday={hadToday}
        rows={sessionDeckRows(session, data.cards, data.decks)}
        next={session.size > 0 ? nextDueLine(scope(data), now, heldBackDueTomorrow(scope(data), data.tests, data.firstReviewAt, now)) : null}
      />
    );
  }

  const due = dueOf(data, now);
  const left = leftCount(due, scope(data), session, now);
  const fraction = progressFraction(saved, left);
  const card = phase.kind === 'card' ? phase.card : null;
  const deck = card ? data.decks.find((d) => d.id === card.deckId) : undefined;
  const secondsLeft = phase.kind === 'wait' ? Math.max(0, Math.ceil((phase.dueAt.getTime() - now.getTime()) / 1000)) : 0;
  // The pile under the card: cards left including this one, ≥3 → 2 layers, 2 → 1, 1 → none.
  const layers = left >= 3 ? 2 : left === 2 ? 1 : 0;
  const times = phase.kind === 'card' ? returnTimes(scheduler, phase, now) : null;

  return (
    <div className="session-wrap">
      <div className="session is-review" style={deckStyle(deck?.colour)}>
        <header className="session-bar">
          <Link className="btn-icon" to="/" aria-label="End session. Your ratings are saved.">
            <CloseIcon />
          </Link>
          <span className="count">
            {left}
            {NBSP}left
          </span>
          <span />
        </header>
        <div
          className="progress"
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={saved + left}
          aria-valuenow={saved}
          aria-valuetext={`${saved} reviewed, ${left} left`}
        >
          <span style={{ width: `${(fraction * 100).toFixed(1)}%` }} />
        </div>

        {phase.kind === 'wait' ? (
          // Nothing is due, but a card from this session comes back within 90 seconds (spec §2).
          <main className="card wait">
            <h1 className="t-hero">
              Next card in{' '}
              <span className="clock" aria-hidden="true">
                {clock(secondsLeft)}
              </span>
              <span className="sr-only">{spoken(secondsLeft)}</span>
            </h1>
            <p className="t-secondary">Cards you're still learning come back after a short wait. Your ratings are saved.</p>
          </main>
        ) : (
          <CardPile card={phase.card} deck={deck} revealed={phase.revealed} layers={layers} cardKey={`${phase.card.id}:${phase.snap.reps}`} />
        )}

        <div className="action-zone">
          {phase.kind === 'card' && phase.revealed && <p className={error ? 'hint is-error' : 'hint'}>{error ?? HINT}</p>}
          <div className="slot">
            {phase.kind === 'wait' ? (
              <Link className="btn btn-secondary btn-wide" to="/">
                Done for now
              </Link>
            ) : !phase.revealed ? (
              <button className="btn btn-primary" type="button" ref={showRef} onClick={show}>
                Show answer
              </button>
            ) : (
              <div className="keys" role="group" aria-label="How well did you know it?">
                {KEYS.map(({ grade, label }) => (
                  <button
                    key={grade}
                    className={rated === grade ? 'key is-rated' : 'key'}
                    type="button"
                    disabled={rated !== null}
                    // "Good, back in 5 days". A hidden ", back in " span would be read with a space before the
                    // comma (an out-of-flow span counts as a block), so the name is set here from the same words.
                    aria-label={times?.[grade] ? `${label}, back in ${times[grade]}` : undefined}
                    onClick={() => void rate(grade, label)}
                  >
                    <span className="k-label">
                      <CheckSmall />
                      {label}
                    </span>
                    {/* D69: when it comes back, from the same calculation a tap saves; nothing if that fails. */}
                    {times?.[grade] && <span className="k-time">{times[grade]}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>
      </div>
    </div>
  );
}

/**
 * D69: the return time under each key, once the answer shows. Measured at the later of the reveal and
 * the latest minute tick, from D23's review time. Nothing is saved; a failure shows no times.
 */
function returnTimes(scheduler: Scheduler, phase: Extract<Phase, { kind: 'card' }>, now: Date): Partial<Record<Grade, string>> | null {
  if (!phase.revealed || !phase.revealAt) return null;
  try {
    const at = new Date(Math.max(phase.revealAt.getTime(), now.getTime()));
    const { from, dueAt } = previewDue(scheduler, phase.card, at);
    const out: Partial<Record<Grade, string>> = {};
    for (const { grade } of KEYS) out[grade] = formatReturn(dueAt[grade].getTime() - from.getTime());
    return out;
  } catch {
    return null;
  }
}

interface Milestone {
  deck: Deck;
  total: number;
}

/**
 * D45: a deck with a test ahead that had cards not studied when the session began, and now has every
 * card studied, with some of them rated in this session. With two, the soonest test wins (D41's order).
 */
function milestoneOf(data: Snapshot, startUnstudied: ReadonlyMap<string, number> | null, session: ReadonlySet<string>, now: Date): Milestone | null {
  if (!startUnstudied) return null;
  for (const deck of orderDecks(data.decks, data.tests, now)) {
    if (!testApplies(data.tests.get(deck.id), now) || (startUnstudied.get(deck.id) ?? 0) === 0) continue;
    const deckCards = data.cards.filter((c) => c.deckId === deck.id);
    if (deckCards.length === 0 || deckCards.some(isNewCard) || !deckCards.some((c) => session.has(c.id))) continue;
    return { deck, total: deckCards.length };
  }
  return null;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plan §3: the total counts 0 → N over 480 ms (ease-out), starting 600 ms after it appears. Reduced
 * motion: N at once. Leaving cancels the timer and the frame. Only the visible digits use it; the
 * spoken total is the final number from the start.
 */
function useCountUp(target: number, delay = 600, duration = 480): number {
  const reduce = reduceMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const timer = window.setTimeout(() => {
      const start = performance.now();
      const step = (t: number) => {
        const p = Math.min(1, Math.max(0, (t - start) / duration));
        setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [target, delay, duration, reduce]);
  return reduce ? target : shown;
}

const signed = (n: number) => `${n < 0 ? '−' : '+'}${Math.abs(n).toLocaleString()}`;

/**
 * Plan §3(d, e): the ledger. Each row is that part's change since the session began, non-zero rows
 * only; the total is their sum, so it is D73's change. Then the level-up line, if the level went up.
 */
function XpLedger({ start, end }: { start: XpParts; end: XpParts }) {
  const rows = [
    { label: 'Cards reviewed', n: end.review - start.review },
    { label: 'Cards written', n: end.writing - start.writing },
    { label: 'Bonus: every waiting card reviewed', n: end.bonus - start.bonus },
  ].filter((r) => r.n !== 0);
  const total = rows.reduce((sum, r) => sum + r.n, 0);
  const final = `${signed(total)}${NBSP}XP`;
  const shown = useCountUp(total);
  const before = levelOf(start.total);
  const after = levelOf(end.total);
  const up = after.level > before.level;

  if (rows.length === 0) return <p className="done-zero">No new XP: these cards already counted today.</p>;
  return (
    <div className="done-xp">
      <p className="xp-total">
        <span aria-hidden="true" style={{ minWidth: `${final.length}ch` }}>
          {signed(shown)}
          {NBSP}XP
        </span>
        <span className="sr-only">{final}</span>
      </p>
      <dl className="totals-list xp-rows">
        {rows.map((r, i) => (
          <div key={r.label} style={{ animationDelay: `${600 + i * 80}ms` }}>
            <dt>{r.label}</dt>
            <dd>{signed(r.n)}</dd>
          </div>
        ))}
      </dl>
      {up && (
        <p className="level-up" style={{ animationDelay: `${600 + rows.length * 80}ms` }}>
          <RankIcon rank={after.rank} size={64} />
          <span>{after.rank !== before.rank ? `Up to level ${after.level}: ${after.rank}.` : `Up to level ${after.level}.`}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Done (mockups/review-done.html; round 1 plan §3): "Done", one real number (D45), the streak with this
 * week's strip, then the XP this session earned. The XP and the streak come from one read after the
 * session, compared with the read when it began. "Back to home" works at any moment.
 */
function Done({
  count,
  milestone,
  startXp,
  hadToday,
  rows,
  next,
}: {
  count: number;
  milestone: Milestone | null;
  startXp: XpParts | null;
  hadToday: boolean;
  rows: readonly SessionDeckRow[];
  next: string | null;
}) {
  const { db } = useApp();
  const heading = useRef<HTMLHeadingElement>(null);
  const [after, setAfter] = useState<{ xp: XpParts; reviews: XpReview[]; now: Date } | null>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    let alive = true;
    loadXp(db).then(
      (r) => {
        if (alive) setAfter({ ...r, now: new Date() });
      },
      () => {}, // no streak or XP lines then; Done and Back to home still work
    );
    return () => {
      alive = false;
    };
  }, [db]);
  const perDay = after ? cardsPerDay(after.reviews) : null;
  const streak = after && perDay ? streakOf(perDay, after.now).current : 0;
  return (
    <div className="session-wrap">
      <div className="session">
        <main className="done">
          <h1 className="t-hero" tabIndex={-1} ref={heading}>
            <span className="mark" style={{ '--hl': 'var(--hl-done)', '--hl-alpha': 1 } as CSSProperties}>
              Done
            </span>
          </h1>
          {milestone ? (
            // The milestone replaces the count: one line, no tap needed, the deck name in its own
            // highlighter, swiped after Done's (none under reduced motion). The name and its full stop
            // move to the next line as one piece.
            <p className="done-count">
              You've studied all {cardsText(milestone.total)} in{' '}
              <span className="keep">
                <span className="mark" style={{ ...deckStyle(milestone.deck.colour), animationDelay: '600ms' }}>
                  {milestone.deck.name}
                </span>
                .
              </span>
            </p>
          ) : (
            count > 0 && <p className="done-count">{cardsText(count)} reviewed.</p>
          )}
          {after && perDay && streak > 0 && (
            <div className="done-streak">
              <p className="done-streak-line">{plural(streak, 'day')} in a row.</p>
              <DayStrip perDay={perDay} now={after.now} fillToday={!hadToday} />
              <p className="sr-only">{stripText(perDay, after.now)}</p>
            </div>
          )}
          {after && startXp && count > 0 && <XpLedger start={startXp} end={after.xp} />}
          {/* Pass 2 R3: which decks this session covered, and when the next cards come back. No motion. */}
          {rows.length > 0 && (
            <section className="done-session" aria-labelledby="session-title">
              <h2 id="session-title">This session</h2>
              <dl className="totals-list session-rows">
                {rows.map(({ deck, count: n }) => (
                  <div key={deck.id} style={deckStyle(deck.colour)}>
                    <dt>
                      <span className="side-square" aria-hidden="true" />
                      <span className="session-deck">{deck.name}</span>
                    </dt>
                    <dd>{cardsText(n)}</dd>
                  </div>
                ))}
              </dl>
              {next && <p className="done-next">{next}</p>}
            </section>
          )}
          <div className="actions">
            <Link className="btn btn-primary" to="/">
              Back to home
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
