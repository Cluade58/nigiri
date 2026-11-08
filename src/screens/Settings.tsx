// Settings (mockups/settings.html; spec §6; D39b, D43, D54, D60): Backup first, then Theme, then the
// row that opens "How Nigiri picks your cards". No Reminders row: step 4 is out of this draft (D52).
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useApp } from '../app/context';
import { BackIcon, CheckTheme, Chevron } from '../components/Icons';
import { backupFileName, checkBackup, exportBackupText, replaceAll, restoreRejectLine, type BackupData } from '../lib/backup';
import { cards, plural } from '../lib/copy';
import { isQuotaError } from '../lib/errors';
import { requestPersistence } from '../lib/persist';
import { THEMES, THEME_NAMES, currentTheme, saveTheme, type Theme } from '../lib/theme';
import { useArrivalFocus } from './useArrivalFocus';
import { useTitle } from './useTitle';

/**
 * One line at a time, under the button it answers (UI-CRIT-2 req 1): Export's under Export backup,
 * Restore's under its helper line. Both stay in the DOM for aria-live; an empty one takes no height.
 */
type Status =
  | { kind: 'none' }
  | { kind: 'exported'; name: string }
  | { kind: 'ok'; text: string }
  | { kind: 'error'; at: 'export' | 'restore'; text: string };

// QA-1 F1: every Restore failure says that nothing changed and names the next tap.
const UNREADABLE = "Not restored. Nigiri couldn't read that file, so nothing changed. Tap Restore a backup to try again.";
const COUNT_FAILED = 'Not restored. Nothing changed. Tap Restore a backup again.';
const WRITE_FAILED = 'Not restored. Nothing changed. Tap Replace everything again.';
const RESTORE_FULL = 'Not restored. Free up space on your phone, then try again.';

interface Pending {
  data: BackupData;
  here: { decks: number; cards: number };
}

/** Hands the file to the browser's download (the anchor download works offline, with no server). */
function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  // Some browsers read the blob after click() returns, so it's freed a little later.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const decksAndCards = (decks: number, n: number) => `${plural(decks, 'deck')} and ${cards(n)}`;

/** A calendar date in a line, such as "(2026-02-30)", never breaks across lines (UI-CRIT-2 req 3). */
const DATE = /(\(?\d{4}-\d{2}-\d{2}\)?)/;
function keepDates(text: string): ReactNode {
  return text.split(DATE).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="no-break">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function Settings() {
  useTitle('Settings');
  const { db } = useApp();
  const [status, setStatus] = useState<Status>({ kind: 'none' });
  const [busy, setBusy] = useState<'export' | 'read' | 'restore' | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  /** A failed Replace everything: shown inside the dialog, which stays open (the page behind is inert). */
  const [restoreError, setRestoreError] = useState<string | null>(null);
  /** Set in the same tick as the tap, so a second Export, Restore or Replace before the next render does nothing (CR-1 M4). */
  const busyRef = useRef(false);
  const [theme, setTheme] = useState<Theme>(() => currentTheme());
  const fileRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useArrivalFocus(heading);

  async function exportNow() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('export');
    setStatus({ kind: 'none' });
    try {
      const now = new Date();
      const text = await exportBackupText(db, now);
      const name = backupFileName(now);
      download(name, text);
      setStatus({ kind: 'exported', name });
    } catch {
      setStatus({ kind: 'error', at: 'export', text: 'Not exported. Tap Export backup again.' });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function chooseFile() {
    if (busyRef.current) return;
    setStatus({ kind: 'none' });
    fileRef.current?.click();
  }

  // D12, D54: the whole file is checked before anything is touched, and a bad file changes nothing.
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again still works
    if (!file || busyRef.current) return;
    busyRef.current = true;
    setBusy('read');
    try {
      let text: string;
      try {
        text = await file.text();
      } catch {
        setStatus({ kind: 'error', at: 'restore', text: UNREADABLE });
        return;
      }
      const checked = checkBackup(text);
      if (!checked.ok) {
        setStatus({ kind: 'error', at: 'restore', text: restoreRejectLine(checked.message) });
        return;
      }
      const here = await db.transaction('r', db.decks, db.cards, async () => ({ decks: await db.decks.count(), cards: await db.cards.count() }));
      setRestoreError(null);
      setPending({ data: checked.data, here });
    } catch {
      setStatus({ kind: 'error', at: 'restore', text: COUNT_FAILED });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  async function confirmRestore() {
    if (!pending || busyRef.current) return;
    busyRef.current = true;
    setBusy('restore');
    setRestoreError(null);
    const { data } = pending;
    try {
      // One transaction over all five stores: it all happens, or nothing does. The theme and the draft
      // live outside the database, so they're left alone (D39d, D54).
      await replaceAll(db, data);
      void requestPersistence();
      // Only a restore that worked lets go of the picked file and closes the dialog.
      setPending(null);
      setStatus({ kind: 'ok', text: `Restored. ${decksAndCards(data.decks.length, data.cards.length)}.` });
      requestAnimationFrame(() => restoreRef.current?.focus());
    } catch (err) {
      // The dialog stays open with the same file, and its own line says what to tap (QA-1 F1).
      setRestoreError(isQuotaError(err) ? RESTORE_FULL : WRITE_FAILED);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  function cancelRestore() {
    if (busyRef.current) return;
    setPending(null);
    setRestoreError(null);
    requestAnimationFrame(() => restoreRef.current?.focus());
  }

  const exportLine = status.kind === 'exported' || (status.kind === 'error' && status.at === 'export');
  const restoreLine = status.kind === 'ok' || (status.kind === 'error' && status.at === 'restore');
  const lineClass = status.kind === 'error' ? 'status is-error' : 'status';

  // One tap applies it and saves it on this phone: no Save button and no message (D39b).
  function pickTheme(t: Theme) {
    saveTheme(t);
    setTheme(t);
  }

  return (
    <>
      <main className="screen settings is-column" inert={pending !== null}>
        <header className="form-bar">
          <Link className="btn-text back-link" to="/">
            <BackIcon />
            Home
          </Link>
          <span />
          <span />
        </header>
        <h1 className="t-section settings-title" ref={heading} tabIndex={-1}>
          Settings
        </h1>

        <section className="sec is-first" aria-labelledby="backup-title">
          <h2 className="t-title" id="backup-title">
            Backup
          </h2>
          <p className="t-secondary">Your cards are only on this phone. Export a backup now and then.</p>
          <button className="btn btn-primary" type="button" onClick={() => void exportNow()} disabled={busy !== null}>
            Export backup
          </button>
          {/* Under the button it answers, so neither button moves when a line appears (UI-CRIT-2 req 1). */}
          <p className={exportLine ? lineClass : 'status'} role="status">
            {status.kind === 'exported' ? (
              <>
                {/* The file name never breaks across lines, so it can be read and found as one piece. */}
                Exported. Look for <span className="file-name">{status.name}</span> in your downloads.
              </>
            ) : (
              exportLine && status.kind === 'error' && status.text
            )}
          </p>
          <div className="after-btn">
            <button className="btn-text" type="button" ref={restoreRef} onClick={chooseFile} disabled={busy !== null}>
              Restore a backup
            </button>
          </div>
          <p className="helper">Replaces every deck and card on this phone.</p>
          <p className={restoreLine ? lineClass : 'status'} role="status">
            {restoreLine && (status.kind === 'ok' || status.kind === 'error') && keepDates(status.text)}
          </p>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden tabIndex={-1} onChange={(e) => void onFile(e)} />
        </section>

        <section className="sec" aria-labelledby="theme-title">
          <h2 className="t-title" id="theme-title">
            Theme
          </h2>
          <ul className="themes" role="radiogroup" aria-labelledby="theme-title">
            {THEMES.map((t) => (
              <li key={t} role="none">
                <label className="theme">
                  <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => pickTheme(t)} />
                  <span className="chip" data-theme={t} aria-hidden="true">
                    Aa
                  </span>
                  <span className="name">{THEME_NAMES[t]}</span>
                  <CheckTheme />
                </label>
              </li>
            ))}
          </ul>
        </section>

        {/* D43: the one optional explainer, last. Never linked from the review screen. */}
        <Link className="row-link" to="/settings/how">
          How Nigiri picks your cards
          <Chevron />
        </Link>
      </main>

      {pending && (
        <RestoreConfirm pending={pending} busy={busy === 'restore'} error={restoreError} onConfirm={() => void confirmRestore()} onCancel={cancelRestore} />
      )}
    </>
  );
}

/** The confirm says what's replaced (D54), and suggests exporting first when there's something to keep. */
function RestoreConfirm({
  pending,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  pending: Pending;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const { here, data } = pending;
  const incoming = decksAndCards(data.decks.length, data.cards.length);

  // A modal dialog: Tab stays inside, Escape cancels, and the page behind can't be reached.
  // Focus starts on Cancel, because Replace everything can't be undone.
  useLayoutEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    cancelRef.current?.focus();
    return () => {
      if (d?.open) d.close();
    };
  }, []);

  // After a failed Replace everything, focus goes back to it: the line above it says to tap it again.
  useEffect(() => {
    if (!busy && error) confirmRef.current?.focus();
  }, [busy, error]);

  return (
    <dialog
      ref={ref}
      className="sheet confirm"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 className="t-title" id="confirm-title">
        Replace everything on this phone?
      </h2>
      <p id="confirm-body">
        {here.decks > 0 ? (
          <>
            Your {decksAndCards(here.decks, here.cards)} here are replaced by the backup's {incoming}. Export first if you want to keep what's here.
          </>
        ) : (
          // Builder's wording for a phone with no decks (reported as undecided).
          <>This phone has no decks yet. The backup brings in {incoming}.</>
        )}
      </p>
      <div>
        {/* Inside the dialog: everything behind it is inert, so a line there would never be seen or read. */}
        <p className={error ? 'status is-error' : 'status'} role="status" aria-live="polite">
          {error}
        </p>
        <div className="confirm-actions">
          <button className="btn btn-primary" type="button" ref={confirmRef} onClick={onConfirm} disabled={busy}>
            Replace everything
          </button>
          <button className="btn-text" type="button" ref={cancelRef} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
