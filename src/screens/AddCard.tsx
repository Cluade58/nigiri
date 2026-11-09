// Add card (spec §1, the card flow; mockups/add-card.html). In a deck it adds to that deck; from
// Today it asks which deck first. Save card, or the keyboard's done key, saves; the form clears and
// stays open with the cursor on Front (D18). A half-typed card waits as a draft (D24).
// Round 1 plan §6: cards saved since this screen opened are listed under the form ("Added this time"),
// newest first; tap one to edit or delete it in the edit sheet. Nothing about the list is stored.
// Plan §7: a hint under Back says how to make bold text and lists.
// D81: when the cards written on this visit take you to a new rank, the Added header says so, with the
// 56px badge. Worked out from XP when the screen opened and XP now; nothing is stored.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../app/context';
import { useNow } from '../app/hooks';
import { CheckChip, Chevron } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { NBSP, OUT_OF_SPACE, cards, notSaved } from '../lib/copy';
import type { Card, Deck } from '../lib/db';
import { clearDraft, draftFor, writeDraft } from '../lib/draft';
import { isQuotaError } from '../lib/errors';
import { EmptySideError, MissingDeckError, addCard, cleanSide } from '../lib/saves';
import { FORMAT_HINT, plainMarks } from '../lib/marks';
import { orderDecks } from '../lib/today';
import { loadXp } from '../lib/snapshot';
import { XP_PER_CARD, levelOf, rankIndex } from '../lib/xp';
import { RankIcon } from '../components/RankIcon';
import { EditSheet } from './EditSheet';
import { useTitle } from './useTitle';

type Status =
  | { kind: 'none' }
  | { kind: 'saved'; deckId: string; deckName: string; count: number; n: number }
  | { kind: 'error'; text: string };

type Side = 'front' | 'back';

/** One card saved on this screen. `edits` bumps when the edit sheet changed its text (it gets the highlighter). */
interface Added {
  card: Card;
  deck: Deck;
  edits: number;
}

export function AddCard({ deckId: fixedDeckId }: { deckId?: string }) {
  useTitle('Add card');
  const { db, scheduler } = useApp();
  const now = useNow();
  const lists = useLiveQuery(async () => ({ decks: await db.decks.toArray(), tests: await db.tests.toArray() }), [db]);
  const fromToday = fixedDeckId === undefined;

  const [picked, setPicked] = useState<string>('');
  const deckId = fixedDeckId ?? picked;
  const [front, setFront] = useState(() => (fixedDeckId ? (draftFor(fixedDeckId)?.front ?? '') : ''));
  const [back, setBack] = useState(() => (fixedDeckId ? (draftFor(fixedDeckId)?.back ?? '') : ''));
  const [status, setStatus] = useState<Status>({ kind: 'none' });
  const [invalid, setInvalid] = useState<Side | null>(null);
  const [deckError, setDeckError] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Set in the same tick as the tap, so a second submit before the next render does nothing (CR-1 M4). */
  const savingRef = useRef(false);
  const saves = useRef(0);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);
  const firstChipRef = useRef<HTMLInputElement>(null);
  const [added, setAdded] = useState<Added[]>([]);
  const [editing, setEditing] = useState<Card | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  /** Where focus goes once the edit sheet has closed and the form is no longer inert (CR-6 m2). */
  const pendingFocus = useRef<'opener' | 'front' | null>(null);
  /** Bumped when pendingFocus is set, so the effect below runs after that render. */
  const [focusTick, setFocusTick] = useState(0);

  // D81: XP when this screen opened (read once), and XP now (live, so an edit-sheet delete counts too).
  const [startXp, setStartXp] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    loadXp(db).then(
      (r) => {
        if (alive) setStartXp(r.xp.total);
      },
      () => {}, // no rank-up line then; saving still works
    );
    return () => {
      alive = false;
    };
  }, [db]);
  const xpNow = useLiveQuery(() => loadXp(db).then((r) => r.xp.total), [db]);
  const newRank =
    startXp !== null && xpNow !== undefined && rankIndex(levelOf(xpNow).rank) > rankIndex(levelOf(startXp).rank) ? levelOf(xpNow).rank : null;

  const decks = useMemo(() => (lists ? orderDecks(lists.decks, new Map(lists.tests.map((t) => [t.deckId, t])), now) : []), [lists, now]);
  const deck = decks.find((d) => d.id === deckId);

  /** The draft rule (mockups/add-card.html?draft): the first empty side, or the end of Back. */
  function placeCursor(f: string, b: string) {
    if (!f) frontRef.current?.focus({ preventScroll: true });
    else if (!b) backRef.current?.focus({ preventScroll: true });
    else {
      const el = backRef.current;
      el?.focus({ preventScroll: true });
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }

  // First focus: the deck picker from Today, otherwise Front (or where the draft left off).
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (focused.current || !lists) return;
    focused.current = true;
    // From Today, focus starts on the first deck chip (no keyboard pops up), with nothing picked.
    if (fromToday) firstChipRef.current?.focus({ preventScroll: true });
    else placeCursor(front, back);
  });

  // Keep what's typed as the draft for this deck, even if the phone closes the app.
  useEffect(() => {
    if (deckId) writeDraft({ deckId, front, back });
  }, [deckId, front, back]);

  // CR-6 m2: focus moves only after React has drawn the form without `inert`, so it can't be lost.
  useEffect(() => {
    const target = pendingFocus.current;
    if (editing !== null || target === null) return;
    pendingFocus.current = null;
    if (target === 'opener' && opener.current?.isConnected) opener.current.focus();
    else frontRef.current?.focus({ preventScroll: true });
  }, [editing, focusTick]);

  if (lists && fixedDeckId && !lists.decks.some((d) => d.id === fixedDeckId)) return <Navigate to="/" replace />;

  function pickDeck(id: string) {
    setPicked(id);
    setDeckError(false);
    const draft = !front && !back ? draftFor(id) : null;
    if (draft) {
      setFront(draft.front);
      setBack(draft.back);
    }
  }

  /**
   * A tap on a chip (or Enter on one) moves the cursor to Front, or to where that deck's draft left off
   * (spec §7, the draft rule), and scrolls it into view. Arrow keys only pick: focus stays on the chips.
   * It runs after React has drawn the picked deck's draft.
   */
  function toFront() {
    requestAnimationFrame(() => {
      placeCursor(frontRef.current?.value ?? '', backRef.current?.value ?? '');
      (document.activeElement as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (savingRef.current) return;
    if (!deckId) {
      setDeckError(true);
      firstChipRef.current?.focus();
      return;
    }
    // D60: a card needs both sides. Nothing saves; the line says which side, and the cursor goes there.
    const empty: Side | null = !cleanSide(front) ? 'front' : !cleanSide(back) ? 'back' : null;
    if (empty) {
      setInvalid(empty);
      setStatus({ kind: 'error', text: `Not saved: the ${empty} is empty.` });
      (empty === 'front' ? frontRef : backRef).current?.focus();
      return;
    }
    // D18: focus moves to Front in the same tap, before the save finishes, so the keyboard stays up.
    frontRef.current?.focus();
    setInvalid(null);
    savingRef.current = true;
    setSaving(true);
    // What this save sends. Anything typed while it saves is the start of the next card (QA-1 F2).
    const sent = { front, back };
    try {
      const res = await addCard(db, scheduler, { deckId, ...sent }, new Date());
      // Clear a side only if it still holds what was sent; anything changed during the save stays, in
      // full (CR-2 m1). The draft follows what's left (two empty sides clear it).
      setFront((cur) => (cur === sent.front ? '' : cur));
      setBack((cur) => (cur === sent.back ? '' : cur));
      saves.current += 1;
      setStatus({ kind: 'saved', deckId: res.deck.id, deckName: res.deck.name, count: res.count, n: saves.current });
      setAdded((list) => (list.some((a) => a.card.id === res.card.id) ? list : [{ card: res.card, deck: res.deck, edits: 0 }, ...list]));
      // Plan §6: the list grows under the form; Front stays in view for the next card.
      frontRef.current?.scrollIntoView?.({ block: 'nearest' });
    } catch (err) {
      if (err instanceof EmptySideError) {
        setInvalid(err.side);
        setStatus({ kind: 'error', text: `Not saved: the ${err.side} is empty.` });
      } else if (err instanceof MissingDeckError) {
        setStatus({ kind: 'error', text: notSaved('Save card') });
      } else {
        // What you typed stays, and the button comes back on (spec §3, check 5).
        setStatus({ kind: 'error', text: isQuotaError(err) ? OUT_OF_SPACE : notSaved('Save card') });
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // The keyboard's next key moves to Back; its done key saves. Shift+Enter still makes a new line.
  function onFrontKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      backRef.current?.focus();
    }
  }
  function onBackKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const closeTo = fromToday ? '/' : `/deck/${fixedDeckId}`;

  /** The edit sheet closed: re-read the card, drop it if it was deleted, mark it if its text changed. */
  async function closeSheet(deleted: boolean) {
    const closing = editing;
    const id = closing?.id;
    setEditing(null);
    // 'gone': deleted (here or elsewhere); null: the read failed, so the row stays as it was.
    let fresh: Card | 'gone' | null = 'gone';
    if (id && !deleted) {
      try {
        fresh = (await db.cards.get(id)) ?? 'gone';
      } catch {
        fresh = null;
      }
    }
    const result = fresh;
    if (id) {
      setAdded((list) =>
        list.flatMap((a) => {
          if (a.card.id !== id || result === null) return [a];
          if (result === 'gone') return [];
          const changed = result.front !== a.card.front || result.back !== a.card.back;
          return [{ ...a, card: result, edits: changed ? a.edits + 1 : a.edits }];
        }),
      );
    }
    pendingFocus.current = result !== 'gone' ? 'opener' : 'front';
    setFocusTick((n) => n + 1);
    // QA-6 / CR-6 m1: a deleted card leaves the "Saved. Biology has N cards." line one too high.
    // Re-count that deck; `n` stays, so the highlighter doesn't replay.
    if (closing && result === 'gone') {
      const deckOf = closing.deckId;
      try {
        const count = await db.cards.where('deckId').equals(deckOf).count();
        setStatus((s) => (s.kind === 'saved' && s.deckId === deckOf ? { ...s, count } : s));
      } catch {
        // The line stays as it was; the next save corrects it.
      }
    }
  }

  return (
    <>
      <div className="screen page-flow is-form" style={deckStyle(deck?.colour)} inert={editing !== null}>
        <header className="form-bar">
          <Link className="btn-text" to={closeTo} onClick={() => deckId && clearDraft(deckId)}>
            Close
          </Link>
          <h1>Add card</h1>
          <span />
        </header>

        <form className="compose grow" id="add-card-form" noValidate onSubmit={submit}>
          {fromToday ? (
            <fieldset className={deckError ? 'field chips-field is-invalid' : 'field chips-field'} aria-describedby={deckError ? 'deck-error' : undefined}>
              <legend>Deck</legend>
              {/* One radio group: one tab stop, arrow keys move between decks. Nothing starts picked (D70(1)). */}
              <div className="chips">
                {decks.map((d, i) => (
                  <label
                    key={d.id}
                    className="chip"
                    style={deckStyle(d.colour)}
                    onClick={(e) => {
                      // A real tap or click (detail > 0), not the click an arrow key fires on the radio.
                      if (e.detail > 0) toFront();
                    }}
                  >
                    <input
                      ref={i === 0 ? firstChipRef : undefined}
                      type="radio"
                      name="deck"
                      value={d.id}
                      checked={picked === d.id}
                      // The fieldset's description isn't read when focus lands on a radio, so each radio carries it.
                      aria-describedby={deckError ? 'deck-error' : undefined}
                      onChange={() => pickDeck(d.id)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        if (picked !== d.id) pickDeck(d.id);
                        toFront();
                      }}
                    />
                    <span className="chip-mark" aria-hidden="true">
                      <span className="swatch" />
                      <CheckChip />
                    </span>
                    <span className="chip-name">{d.name}</span>
                  </label>
                ))}
              </div>
              {deckError && (
                <p className="field-error" id="deck-error">
                  Choose a deck first
                </p>
              )}
            </fieldset>
          ) : (
            <p className="for-deck">
              <span className="swatch is-small" aria-hidden="true" />
              {deck?.name ?? ''}
            </p>
          )}

          <div className="field">
            <label htmlFor="front">Front</label>
            <textarea
              ref={frontRef}
              className="input front"
              id="front"
              rows={2}
              enterKeyHint="next"
              placeholder="A question or a term"
              value={front}
              aria-invalid={invalid === 'front' || undefined}
              onKeyDown={onFrontKey}
              onChange={(e) => {
                setFront(e.target.value);
                if (invalid === 'front') setInvalid(null);
              }}
            />
          </div>

          <div className="field">
            <label htmlFor="back">Back</label>
            <textarea
              ref={backRef}
              className="input back"
              id="back"
              rows={3}
              enterKeyHint="done"
              placeholder="The answer, in your own words"
              value={back}
              aria-invalid={invalid === 'back' || undefined}
              aria-describedby="back-hint"
              onKeyDown={onBackKey}
              onChange={(e) => {
                setBack(e.target.value);
                if (invalid === 'back') setInvalid(null);
              }}
            />
            <p className="helper format-hint" id="back-hint">
              {FORMAT_HINT}
            </p>
          </div>
        </form>

        <div className="action-zone">
          <p className={status.kind === 'error' ? 'status is-error' : 'status'} role="status">
            {status.kind === 'saved' && (
              <>
                Saved. <span className="deck-name">{status.deckName}</span> has{' '}
                <span className="mark" key={status.n}>
                  {cards(status.count)}
                </span>
                .
              </>
            )}
            {status.kind === 'error' && status.text}
          </p>
          <p className="sr-only" aria-live="polite">
            {newRank && added.length > 0 ? `New rank: ${newRank}.` : ''}
          </p>
          <button className="btn btn-primary" type="submit" form="add-card-form" disabled={saving}>
            Save card
          </button>
        </div>

        {added.length > 0 && (
          <section className="added" aria-labelledby="added-title">
            <div className="added-head">
              <h2 id="added-title">Added this time</h2>
              <span className="added-xp">+{(XP_PER_CARD * added.length).toLocaleString()}{NBSP}XP</span>
            </div>
            {newRank && (
              <p className="added-rank" key={newRank}>
                <RankIcon rank={newRank} size={56} />
                <span>New rank: {newRank}.</span>
              </p>
            )}
            <ul className="card-list added-list">
              {added.map(({ card, deck: d, edits }) => (
                <li key={card.id}>
                  <button
                    type="button"
                    style={deckStyle(d.colour)}
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      setEditing(card);
                    }}
                  >
                    <span className="side-square" aria-hidden="true" />
                    <span className="fb">
                      <span className="f">
                        {edits > 0 ? (
                          <span className="mark" key={edits}>
                            {plainMarks(card.front)}
                          </span>
                        ) : (
                          plainMarks(card.front)
                        )}
                      </span>{' '}
                      <span className="b">{plainMarks(card.back)}</span>
                    </span>
                    <Chevron />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {editing && <EditSheet key={editing.id} card={editing} onClose={(deleted) => void closeSheet(deleted)} />}
    </>
  );
}
