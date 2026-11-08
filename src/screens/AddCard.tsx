// Add card (spec §1, the card flow; mockups/add-card.html). In a deck it adds to that deck; from
// Today it asks which deck first. Save card, or the keyboard's done key, saves; the form clears and
// stays open with the cursor on Front (D18). A half-typed card waits as a draft (D24).
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { useApp } from '../app/context';
import { useNow } from '../app/hooks';
import { ChevronDown } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { OUT_OF_SPACE, cards, notSaved } from '../lib/copy';
import { clearDraft, draftFor, writeDraft } from '../lib/draft';
import { isQuotaError } from '../lib/errors';
import { EmptySideError, MissingDeckError, addCard, cleanSide } from '../lib/saves';
import { orderDecks } from '../lib/today';
import { useTitle } from './useTitle';

type Status =
  | { kind: 'none' }
  | { kind: 'saved'; deckName: string; count: number; n: number }
  | { kind: 'error'; text: string };

type Side = 'front' | 'back';

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
  const selectRef = useRef<HTMLSelectElement>(null);

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
    if (fromToday) selectRef.current?.focus({ preventScroll: true });
    else placeCursor(front, back);
  });

  // Keep what's typed as the draft for this deck, even if the phone closes the app.
  useEffect(() => {
    if (deckId) writeDraft({ deckId, front, back });
  }, [deckId, front, back]);

  if (lists && fixedDeckId && !lists.decks.some((d) => d.id === fixedDeckId)) return <Navigate to="/" replace />;

  function pickDeck(id: string) {
    setPicked(id);
    setDeckError(false);
    const draft = !front && !back ? draftFor(id) : null;
    const f = draft?.front ?? front;
    const b = draft?.back ?? back;
    if (draft) {
      setFront(f);
      setBack(b);
    }
    // Choosing a deck moves the cursor to Front (spec §7), or to where its draft left off.
    requestAnimationFrame(() => placeCursor(f, b));
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (savingRef.current) return;
    if (!deckId) {
      setDeckError(true);
      selectRef.current?.focus();
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
      setStatus({ kind: 'saved', deckName: res.deck.name, count: res.count, n: saves.current });
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

  return (
    <div className="screen page-flow is-form" style={deckStyle(deck?.colour)}>
      <header className="form-bar">
        <Link className="btn-text" to={closeTo} onClick={() => deckId && clearDraft(deckId)}>
          Close
        </Link>
        <h1>Add card</h1>
        <span />
      </header>

      <form className="compose grow" id="add-card-form" noValidate onSubmit={submit}>
        {fromToday ? (
          <div className="field">
            <label htmlFor="deck">Deck</label>
            <div className="select-wrap">
              {deck && <span className="swatch" aria-hidden="true" />}
              <select
                ref={selectRef}
                className={deck ? 'input' : 'input no-swatch'}
                id="deck"
                value={picked}
                aria-invalid={deckError || undefined}
                aria-describedby={deckError ? 'deck-error' : undefined}
                onChange={(e) => pickDeck(e.target.value)}
              >
                <option value="" disabled>
                  Choose a deck
                </option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown />
            </div>
            {deckError && (
              <p className="field-error" id="deck-error">
                Choose a deck first
              </p>
            )}
          </div>
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
            onKeyDown={onBackKey}
            onChange={(e) => {
              setBack(e.target.value);
              if (invalid === 'back') setInvalid(null);
            }}
          />
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
        <button className="btn btn-primary" type="submit" form="add-card-form" disabled={saving}>
          Save card
        </button>
      </div>
    </div>
  );
}
