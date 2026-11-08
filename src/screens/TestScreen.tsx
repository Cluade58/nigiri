// Add a test / Edit test (mockups/deck-test.html; spec §2; D29–D33, D44, D51(5), D57, D59, D61(5)).
// A date (today or later), the minutes-a-day stepper, the live fit check over every deck with a test
// today or ahead, and the plan in one line. Save test writes the test and the minutes together.
// Nothing here writes a card (D29). Order: fit, then Save test (sticky on phones only), then Remove test
// behind a rule, never inside the sticky bar (D36).
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useApp } from '../app/context';
import { useNow, useSnapshot } from '../app/hooks';
import { MinusIcon, PlusSmall } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { OUT_OF_SPACE, notSaved } from '../lib/copy';
import type { Deck } from '../lib/db';
import { isQuotaError } from '../lib/errors';
import { MissingDeckError, removeTest, saveTestPlan } from '../lib/saves';
import { isNewCard } from '../lib/scheduler';
import type { Snapshot } from '../lib/snapshot';
import { planLine, relativeDay, studiedLine, testScreenFit } from '../lib/testCopy';
import { MAX_MINUTES_PER_DAY, MIN_MINUTES_PER_DAY, deckNewCardShare, fitCheck, testApplies } from '../lib/testMode';
import { addDaysToKey, isDayKey, localDayKey } from '../lib/time';
import { useArrivalFocus } from './useArrivalFocus';
import { useTitle } from './useTitle';

const clampMinutes = (n: number) => Math.min(MAX_MINUTES_PER_DAY, Math.max(MIN_MINUTES_PER_DAY, Math.round(n)));

export function TestScreen({ deckId }: { deckId: string }) {
  const now = useNow();
  const snap = useSnapshot(now);
  if (!snap) return <div className="booting" aria-busy="true" />;
  const deck = snap.decks.find((d) => d.id === deckId);
  if (!deck) return <Navigate to="/" replace />;
  return <TestForm deck={deck} snap={snap} now={now} />;
}

function TestForm({ deck, snap, now }: { deck: Deck; snap: Snapshot; now: Date }) {
  const { db } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const today = localDayKey(now);

  // Fixed when the screen opens: a test that has passed doesn't apply (D30), so it's "Add a test" again.
  const [initial] = useState(() => {
    const saved = snap.tests.get(deck.id);
    const editing = testApplies(saved, now);
    // Add a test starts on tomorrow, as drawn in mockups/deck-test.html.
    return { editing, date: editing ? saved.date : addDaysToKey(today, 1), minutes: clampMinutes(snap.settings.minutesPerDay) };
  });
  const { editing } = initial;
  useTitle(editing ? 'Edit test' : 'Add a test');

  const [date, setDate] = useState(initial.date);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [minutesText, setMinutesText] = useState(String(initial.minutes));
  const [dateError, setDateError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [removeStatus, setRemoveStatus] = useState('');
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  /** Set in the same tick as the tap, so a second Save test or Remove test before the next render does nothing (CR-1 M4). */
  const busyRef = useRef(false);
  const [announce, setAnnounce] = useState('');
  const dateRef = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useArrivalFocus(heading);

  const past = isDayKey(date) && date < today;
  const validDate = isDayKey(date) && !past;
  const shownDateError = past ? 'Pick today or a later day.' : dateError;

  const view = useMemo(() => {
    const deckCards = snap.cards.filter((c) => c.deckId === deck.id);
    const countByDeck = new Map<string, number>();
    for (const c of snap.cards) countByDeck.set(c.deckId, (countByDeck.get(c.deckId) ?? 0) + 1);
    if (!validDate) return null;
    const test = { deckId: deck.id, date };
    // D33, D61(3): every deck with a test today or ahead, this one with the date as typed.
    const fit = fitCheck(
      snap.decks.map((d) => ({ deckId: d.id, cardCount: countByDeck.get(d.id) ?? 0, test: d.id === deck.id ? test : snap.tests.get(d.id) })),
      minutes,
      now,
    );
    const name = (id: string) => snap.decks.find((d) => d.id === id)?.name ?? '';
    const screen = testScreenFit(fit, deck.id, deckCards.length, name);
    const share = deckNewCardShare(deckCards, test, snap.firstReviewAt, now);
    const plan = planLine(share, date, now);
    const studied = deckCards.filter((c) => !isNewCard(c)).length;
    const planText = plan ? `${plan}.` : deckCards.length > 0 ? `${studiedLine(studied, deckCards.length)}.` : null;
    return { screen, planText };
  }, [snap, deck.id, date, minutes, now, validDate]);

  // One short announcement, 500 ms after the last change (the long text isn't a live region).
  const announceText = view?.screen?.announce ?? '';
  const firstAnnounce = useRef(true);
  useEffect(() => {
    if (firstAnnounce.current) {
      firstAnnounce.current = false;
      return;
    }
    const id = window.setTimeout(() => setAnnounce(announceText), 500);
    return () => window.clearTimeout(id);
  }, [announceText]);

  /** Back to the deck page: one step back when it's where we came from, so Back doesn't return here. */
  function leave() {
    if (location.key !== 'default') navigate(-1);
    else navigate(`/deck/${deck.id}`, { replace: true });
  }

  function step(by: number) {
    const next = clampMinutes(minutes + by);
    setMinutes(next);
    setMinutesText(String(next));
  }

  function typeMinutes(text: string) {
    setMinutesText(text);
    const n = Number.parseInt(text, 10);
    if (/^\d+$/.test(text.trim()) && n >= MIN_MINUTES_PER_DAY && n <= MAX_MINUTES_PER_DAY) setMinutes(n);
  }

  /** On leaving the field, a number out of range snaps to the nearest end; anything else goes back. */
  function settleMinutes() {
    const n = Number.parseInt(minutesText, 10);
    const next = Number.isFinite(n) ? clampMinutes(n) : minutes;
    setMinutes(next);
    setMinutesText(String(next));
  }

  async function save(e?: FormEvent) {
    e?.preventDefault();
    if (busyRef.current) return;
    setStatus('');
    setRemoveStatus('');
    if (!date) {
      setDateError('Pick a test date.');
      dateRef.current?.focus();
      return;
    }
    if (!validDate) {
      setDateError(past ? 'Pick today or a later day.' : 'Pick a test date.');
      dateRef.current?.focus();
      return;
    }
    // The number as typed counts, even if the field still has focus.
    const n = Number.parseInt(minutesText, 10);
    const perDay = Number.isFinite(n) ? clampMinutes(n) : minutes;
    setMinutes(perDay);
    setMinutesText(String(perDay));
    busyRef.current = true;
    setBusy('save');
    try {
      await saveTestPlan(db, { deckId: deck.id, date, minutesPerDay: perDay });
      leave(); // the guard stays on: this screen is leaving
    } catch (err) {
      if (err instanceof MissingDeckError) {
        navigate('/', { replace: true });
        return;
      }
      setStatus(isQuotaError(err) ? OUT_OF_SPACE : notSaved('Save test'));
      busyRef.current = false;
      setBusy(null);
    }
  }

  // No confirm: removing a test changes only the share and the fit check, never a card (D29).
  async function remove() {
    if (busyRef.current) return;
    setStatus('');
    setRemoveStatus('');
    busyRef.current = true;
    setBusy('remove');
    try {
      await removeTest(db, deck.id);
      leave();
    } catch {
      setRemoveStatus('Not removed. Tap Remove test again.');
      busyRef.current = false;
      setBusy(null);
    }
  }

  const atMin = minutes <= MIN_MINUTES_PER_DAY;
  const atMax = minutes >= MAX_MINUTES_PER_DAY;
  const fit = view?.screen ?? null;

  return (
    <div className="screen page-flow is-form test-screen" style={deckStyle(deck.colour)}>
      <header className="form-bar">
        <Link
          className="btn-text"
          to={`/deck/${deck.id}`}
          onClick={(e) => {
            e.preventDefault();
            leave();
          }}
        >
          Cancel
        </Link>
        <h1 ref={heading} tabIndex={-1}>
          {editing ? 'Edit test' : 'Add a test'}
        </h1>
        <span />
      </header>

      <form className="form grow" id="test-form" noValidate onSubmit={(e) => void save(e)}>
        <p className="for-deck">
          <span className="swatch is-small" aria-hidden="true" />
          {deck.name}
        </p>

        <div className="field">
          <label htmlFor="test-date">Test date</label>
          <input
            ref={dateRef}
            className="input"
            id="test-date"
            type="date"
            min={today}
            value={date}
            required
            aria-invalid={shownDateError ? true : undefined}
            aria-describedby="date-help"
            onChange={(e) => {
              setDate(e.target.value);
              setDateError(null);
            }}
          />
          {shownDateError ? (
            <p className="field-error" id="date-help">
              {shownDateError}
            </p>
          ) : (
            <p className="helper" id="date-help">
              {validDate ? relativeDay(date, now) : ''}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="minutes">Minutes a day</label>
          <div className="stepper">
            <button
              className="step"
              type="button"
              aria-label="Fewer minutes"
              aria-controls="minutes"
              aria-disabled={atMin || undefined}
              onClick={() => {
                if (!atMin) step(-5);
              }}
            >
              <MinusIcon />
            </button>
            <input
              className="input"
              id="minutes"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={minutesText}
              aria-describedby="min-help"
              onChange={(e) => typeMinutes(e.target.value)}
              onBlur={settleMinutes}
            />
            <button
              className="step"
              type="button"
              aria-label="More minutes"
              aria-controls="minutes"
              aria-disabled={atMax || undefined}
              onClick={() => {
                if (!atMax) step(5);
              }}
            >
              <PlusSmall />
            </button>
            <span className="unit">min</span>
          </div>
          <p className="helper" id="min-help">
            Your study time each day, for all your decks.
          </p>
        </div>

        {fit && (
          <section className="fit" aria-labelledby="fit-title">
            <h2 className="t-hero" id="fit-title">
              <span className="mark" key={fit.verdict}>
                {fit.verdict}
              </span>
            </h2>
            <p className="lede">{fit.lede}</p>
            {view?.planText && <p className="t-secondary plan">{view.planText}</p>}
          </section>
        )}
        <p className="sr-only" role="status">
          {announce}
        </p>
      </form>

      <div className="action-zone test-zone">
        <p className={status ? 'status is-error' : 'status'} role="status">
          {status}
        </p>
        <button className="btn btn-primary" type="submit" form="test-form" disabled={busy !== null}>
          Save test
        </button>
      </div>

      {editing && (
        <div className="remove-zone">
          <p className={removeStatus ? 'status is-error' : 'status'} role="status">
            {removeStatus}
          </p>
          <button className="btn-text" type="button" onClick={() => void remove()} disabled={busy !== null}>
            Remove test
          </button>
        </div>
      )}
    </div>
  );
}
