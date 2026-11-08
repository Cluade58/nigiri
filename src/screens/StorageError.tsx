// D25: shown instead of Today when the app can't open its storage at all (mockups/storage-error.html).
// Never an empty Today: cards made there wouldn't save. No highlighter: nothing changed.
import { useEffect, useRef, useState } from 'react';
import { OPEN_TIMEOUT_MS } from '../app/startup';
import { NBSP } from '../lib/copy';
import { useTitle } from './useTitle';

export function StorageError({ onRetry }: { onRetry: () => Promise<boolean> }) {
  useTitle("Nigiri can't open your cards");
  const [trying, setTrying] = useState(false);
  const [again, setAgain] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function retry() {
    if (trying) return;
    setAgain(false);
    setTrying(true);
    const opened = await onRetry();
    if (!mounted.current || opened) return;
    // The tap never looks dead: the line says so, and focus goes back to the button.
    setTrying(false);
    setAgain(true);
    requestAnimationFrame(() => button.current?.focus());
  }

  return (
    <div className="screen page-flow is-form">
      <main className="empty grow" aria-labelledby="storage-title">
        <h1 className="t-hero" id="storage-title">
          Nigiri can't open your cards
        </h1>
        <p className="body">It can't tell why, or whether your cards are still there. One of these may fix it:</p>
        <ul className="fixes">
          <li>Open Nigiri in a normal window, not a private one.</li>
          <li>Let your browser save data for this site.</li>
          <li>Free up space on your phone.</li>
        </ul>
        <p className="warn">Don't remove Nigiri from your home screen or clear its site data. That could delete any cards it still has.</p>
      </main>

      <div className="action-zone">
        {/* One line above Try again (UI-CRIT-2 req 2): while it waits, then if it still can't. The zone
            grows upward, so the button keeps its place. */}
        <p className={again ? 'status is-error' : trying ? 'status is-pending' : 'status'} role="status">
          {again ? "Still can't open your cards." : trying ? `Opening your cards. This can take up to ${OPEN_TIMEOUT_MS / 1000}${NBSP}seconds.` : ''}
        </p>
        <button className="btn btn-primary" type="button" ref={button} onClick={retry} disabled={trying}>
          Try again
        </button>
      </div>
    </div>
  );
}
