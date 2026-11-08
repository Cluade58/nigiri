// The edit sheet (mockups/deck.html?edit). Save changes writes only the front and back: the schedule
// stays (spec §3). Delete card asks first, then removes the card and its reviews together (D5).
// A failed save keeps the sheet open with what you typed, and one line says what to tap (D17).
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useApp } from '../app/context';
import { WIDE } from '../app/hooks';
import { OUT_OF_SPACE, notSaved } from '../lib/copy';
import type { Card } from '../lib/db';
import { isQuotaError } from '../lib/errors';
import { EmptySideError, cleanSide, deleteCard, saveCardText } from '../lib/saves';

/** Text boxes grow to fit, so the whole answer shows while you fix it. */
function grow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}

export function EditSheet({ card, onClose }: { card: Card; onClose: (deleted: boolean) => void }) {
  const { db } = useApp();
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  /** One line above Save changes: a failed save (red), or why a scrim tap or Escape didn't close (ink). */
  const [status, setStatusState] = useState<{ kind: 'error' | 'note'; text: string } | null>(null);
  const [invalid, setInvalid] = useState<'front' | 'back' | null>(null);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  /** Set in the same tick as the tap, so a second Save changes or Delete card before the next render does nothing (CR-1 M4). */
  const busyRef = useRef(false);
  /**
   * From 48em the sheet is a centred dialog, which would grow both ways when a line appears. Before the
   * first line, its bottom edge is held where it is, so it grows upward and Save changes doesn't move.
   */
  const [heldBottom, setHeldBottom] = useState<number | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    grow(frontRef.current);
    grow(backRef.current);
    const el = backRef.current;
    if (el) {
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  function setStatus(next: { kind: 'error' | 'note'; text: string } | null) {
    const el = sheet.current;
    if (next && heldBottom === null && el && window.matchMedia(WIDE).matches) {
      setHeldBottom(Math.max(0, window.innerHeight - el.getBoundingClientRect().bottom));
    }
    setStatusState(next);
  }
  const fail = (text: string) => setStatus({ kind: 'error', text });

  async function save() {
    if (busyRef.current) return;
    setStatus(null);
    const empty = !cleanSide(front) ? 'front' : !cleanSide(back) ? 'back' : null;
    if (empty) {
      setInvalid(empty);
      fail(`Not saved: the ${empty} is empty.`);
      (empty === 'front' ? frontRef : backRef).current?.focus();
      return;
    }
    busyRef.current = true;
    setBusy('save');
    try {
      await saveCardText(db, card.id, { front, back });
      onClose(false);
    } catch (err) {
      if (err instanceof EmptySideError) fail(`Not saved: the ${err.side} is empty.`);
      else fail(isQuotaError(err) ? OUT_OF_SPACE : notSaved('Save changes'));
      busyRef.current = false;
      setBusy(null);
    }
  }

  async function remove() {
    if (busyRef.current) return;
    setStatus(null);
    if (!window.confirm("Delete this card? This can't be undone.")) return;
    busyRef.current = true;
    setBusy('delete');
    try {
      await deleteCard(db, card.id);
      onClose(true);
    } catch {
      fail('Not deleted. Tap Delete card again.');
      busyRef.current = false;
      setBusy(null);
    }
  }

  // D61(7): the scrim (and Escape, its keyboard twin) closes the sheet only when nothing has changed.
  // With changes the sheet stays open, and Cancel is the way out, so a stray tap can't lose an edit.
  // The line says so (UI-CRIT-1 required 1), and focus goes to the heading, not a field, so a phone
  // doesn't raise its keyboard.
  const changed = front !== card.front || back !== card.back;
  function dismiss() {
    if (busyRef.current) return;
    if (!changed) {
      onClose(false);
      return;
    }
    setStatus({ kind: 'note', text: 'Not closed. Tap Save changes to keep your edits, or Cancel.' });
    titleRef.current?.focus({ preventScroll: true });
  }

  // Tab stays inside the sheet (everything behind it is inert). The heading, focused after a scrim tap
  // or Escape, sits before the first control, so Shift+Tab from it wraps to the last one (CR-2 m2).
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
      return;
    }
    if (e.key !== 'Tab' || !sheet.current) return;
    const items = [...sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea')];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const onControl = items.some((el) => el === active);
    if (e.shiftKey && (active === first || !onControl)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !onControl)) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <div className="scrim" onClick={dismiss} />
      <div
        className={heldBottom === null ? 'sheet' : 'sheet is-held'}
        style={heldBottom === null ? undefined : ({ '--held-bottom': `${heldBottom}px` } as CSSProperties)}
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onKeyDown={onKeyDown}
      >
        <span className="grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="t-title" id="sheet-title" ref={titleRef} tabIndex={-1}>
            Edit card
          </h2>
          <button className="btn-text" type="button" onClick={() => onClose(false)}>
            Cancel
          </button>
        </div>
        <div className="compose">
          <div className="field">
            <label htmlFor="e-front">Front</label>
            <textarea
              ref={frontRef}
              className="input front"
              id="e-front"
              rows={1}
              value={front}
              aria-invalid={invalid === 'front' || undefined}
              onChange={(e) => {
                setFront(e.target.value);
                if (invalid === 'front') setInvalid(null);
                grow(e.target);
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="e-back">Back</label>
            <textarea
              ref={backRef}
              className="input back"
              id="e-back"
              rows={3}
              value={back}
              aria-invalid={invalid === 'back' || undefined}
              onChange={(e) => {
                setBack(e.target.value);
                if (invalid === 'back') setInvalid(null);
                grow(e.target);
              }}
            />
          </div>
        </div>
        {/* One line for both buttons, inside the dialog (aria-modal hides everything outside it). */}
        <div>
          <p className={status ? `status is-${status.kind}` : 'status'} role="status" aria-live="polite">
            {status?.text}
          </p>
          <button className="btn btn-primary" type="button" onClick={save} disabled={busy !== null}>
            Save changes
          </button>
        </div>
        <button className="btn-text" type="button" onClick={remove} disabled={busy !== null} style={{ justifySelf: 'center' }}>
          Delete card
        </button>
      </div>
    </>
  );
}
