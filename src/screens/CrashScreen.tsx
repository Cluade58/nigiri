// D61(2): a crash while drawing, or a scheduler that won't load, gets its own screen. D25's storage
// screen would tell someone their storage won't open, which is wrong here and could push them to
// delete the app. Every save is one transaction, so the cards are safe. No highlighter: nothing changed.
// Like the storage screen, it doesn't move focus: it's the whole page, and its heading comes first.
import { useState } from 'react';
import { useTitle } from './useTitle';

export function CrashScreen() {
  useTitle('Something went wrong');
  const [reloading, setReloading] = useState(false);

  return (
    <div className="screen page-flow is-form">
      <main className="empty grow" aria-labelledby="crash-title">
        <h1 className="t-hero" id="crash-title">
          Something went wrong
        </h1>
        <p className="body">Your cards are still saved on this phone.</p>
      </main>
      <div className="action-zone">
        <p className="status" role="status" />
        <button
          className="btn btn-primary"
          type="button"
          disabled={reloading}
          onClick={() => {
            setReloading(true);
            location.reload();
          }}
        >
          Reload Nigiri
        </button>
      </div>
    </div>
  );
}
