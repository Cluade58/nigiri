// The Decks tab (D68, plan §5): every deck in Today's order, and New deck. While decks exist there's no
// filled button here; with none, one way forward.
import { useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { useNow, useSnapshot } from '../app/hooks';
import { PlusIcon } from '../components/Icons';
import { DeckRows } from '../components/Tiles';
import { deckRowsOf } from '../lib/deckRows';
import { useArrivalFocus } from './useArrivalFocus';
import { useTitle } from './useTitle';

export function Decks() {
  useTitle('Decks');
  const now = useNow();
  const snap = useSnapshot(now);
  const rows = useMemo(() => (snap ? deckRowsOf(snap, now) : null), [snap, now]);
  const heading = useRef<HTMLHeadingElement>(null);
  useArrivalFocus(heading, rows !== null);

  if (!rows) return <div className="booting" aria-busy="true" />;
  if (rows.length === 0) {
    return (
      <main className="screen decks-screen">
        <div className="empty">
          <h1 className="t-hero" ref={heading} tabIndex={-1}>
            Make your first deck
          </h1>
          <p className="t-secondary">One for each class or unit.</p>
          <div className="study-row">
            <Link className="btn btn-primary btn-wide is-add" to="/new-deck">
              <PlusIcon />
              New deck
            </Link>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="screen decks-screen">
      <header className="top">
        <h1 ref={heading} tabIndex={-1}>
          Decks
        </h1>
        <Link className="btn btn-secondary btn-compact" to="/new-deck">
          <PlusIcon />
          New deck
        </Link>
      </header>
      <DeckRows rows={rows} stages />
    </main>
  );
}
