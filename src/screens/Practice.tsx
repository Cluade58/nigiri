// The practice round (D77; round1-plan.md "Pass 2 changes"). From the deck page: every card in the deck,
// shuffled once at the start, in Review's layout and card. Show answer, then Next card in the same spot,
// with the same 400 ms guard. No rating keys, no hint line, no return times.
// It writes nothing: no review, no card change, no XP, no streak, no draft. The only storage it touches
// is one read of the deck and its cards when it starts.
// Focus stays on the one button from Show answer to Next card (a keyboard round is Enter, Enter per card);
// the answer is announced through the polite live region instead (QA-7 m1, D78).
// Done: "Practice done." and "12 cards. Nothing was rescheduled." with Back to deck (filled) and Practice
// again (outlined, D78), which reshuffles the cards already read and starts over, still writing nothing.
// No tab bar or sidebar.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, Navigate } from 'react-router';
import { useApp } from '../app/context';
import { CloseIcon } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { NBSP, cards as cardsText } from '../lib/copy';
import type { Card, Deck } from '../lib/db';
import { plainMarks } from '../lib/marks';
import { shuffled } from '../lib/practice';
import { CardPile } from './CardPile';
import { StorageError } from './StorageError';
import { useTitle } from './useTitle';

/** D16: for 400 ms after a card or its answer appears, a tap on that spot does nothing. */
const GUARD_MS = 400;

type Load = { kind: 'loading' } | { kind: 'failed' } | { kind: 'gone' } | { kind: 'empty' } | { kind: 'ready'; deck: Deck; order: Card[] };

export function Practice({ deckId }: { deckId: string }) {
  const { db } = useApp();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [live, setLive] = useState('');
  /** performance.now() when the current card or answer appeared. */
  const shownAt = useRef(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** Set by Practice again, so the new round's Show answer takes focus (Done's buttons are gone). */
  const restarted = useRef(false);
  const done = load.kind === 'ready' && index >= load.order.length;
  useTitle(done ? 'Practice done' : 'Practice');

  /** The one read: the deck and its cards. The order is shuffled here, once. */
  const read = useCallback(async (): Promise<Load> => {
    const [deck, list] = await Promise.all([db.decks.get(deckId), db.cards.where('deckId').equals(deckId).toArray()]);
    if (!deck) return { kind: 'gone' };
    if (list.length === 0) return { kind: 'empty' };
    shownAt.current = performance.now();
    return { kind: 'ready', deck, order: shuffled(list) };
  }, [db, deckId]);

  useEffect(() => {
    let alive = true;
    read().then(
      (l) => {
        if (alive) setLoad(l);
      },
      () => {
        if (alive) setLoad({ kind: 'failed' });
      },
    );
    return () => {
      alive = false;
    };
  }, [read]);

  useEffect(() => {
    if (done || !restarted.current) return;
    restarted.current = false;
    buttonRef.current?.focus({ preventScroll: true });
  }, [done, load]);

  if (load.kind === 'gone') return <Navigate to="/" replace />;
  if (load.kind === 'empty') return <Navigate to={`/deck/${deckId}`} replace />;
  if (load.kind === 'failed') {
    return (
      <StorageError
        onRetry={async () => {
          try {
            setLoad(await read());
            return true;
          } catch {
            return false;
          }
        }}
      />
    );
  }
  if (load.kind === 'loading') return <div className="booting" aria-busy="true" />;

  const { deck, order } = load;
  const total = order.length;
  if (done) {
    const again = () => {
      // Same deck, same cards (no second read, nothing written), a new order.
      restarted.current = true;
      shownAt.current = performance.now();
      setLoad({ kind: 'ready', deck, order: shuffled(order) });
      setIndex(0);
      setRevealed(false);
      setLive('');
    };
    return <PracticeDone deckId={deck.id} total={total} onAgain={again} />;
  }

  const card = order[index];
  const left = total - index;
  const layers = left >= 3 ? 2 : left === 2 ? 1 : 0;

  function tap() {
    if (performance.now() - shownAt.current < GUARD_MS) return;
    shownAt.current = performance.now();
    if (!revealed) {
      setRevealed(true);
      setLive(`Answer: ${plainMarks(card.back).trim()}`);
      return;
    }
    setRevealed(false);
    setIndex((i) => i + 1);
    const nextLeft = left - 1;
    setLive(nextLeft > 0 ? `Next card. ${nextLeft}${NBSP}left.` : '');
  }

  return (
    <div className="session-wrap">
      <div className="session is-review is-practice" style={deckStyle(deck.colour)}>
        <header className="session-bar">
          <Link className="btn-icon" to={`/deck/${deck.id}`} aria-label="End practice. Nothing was rescheduled.">
            <CloseIcon />
          </Link>
          <span className="count">
            Practice, {left}
            {NBSP}left
          </span>
          <span />
        </header>
        <div
          className="progress"
          role="progressbar"
          aria-label="Practice progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index}
          aria-valuetext={`${index} done, ${left} left`}
        >
          <span style={{ width: `${((index / total) * 100).toFixed(1)}%` }} />
        </div>

        <CardPile card={card} deck={deck} revealed={revealed} layers={layers} cardKey={`${card.id}:${index}`} focusAnswer={false} />

        <div className="action-zone">
          <div className="slot">
            {/* One button in one spot, so focus stays on it from Show answer to Next card and back. */}
            <button className="btn btn-primary" type="button" onClick={tap} ref={buttonRef}>
              {revealed ? 'Next card' : 'Show answer'}
            </button>
          </div>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {live}
        </p>
      </div>
    </div>
  );
}

function PracticeDone({ deckId, total, onAgain }: { deckId: string; total: number; onAgain: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="session-wrap">
      <div className="session">
        <main className="done is-practice">
          <h1 className="t-hero" tabIndex={-1} ref={heading}>
            <span className="mark" style={{ '--hl': 'var(--hl-done)', '--hl-alpha': 1 } as CSSProperties}>
              Practice done.
            </span>
          </h1>
          <p className="done-count">{cardsText(total)}. Nothing was rescheduled.</p>
          <div className="actions">
            <Link className="btn btn-primary" to={`/deck/${deckId}`}>
              Back to deck
            </Link>
            <button className="btn btn-secondary" type="button" onClick={onAgain}>
              Practice again
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
