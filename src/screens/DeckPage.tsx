// The deck page (mockups/deck.html): Review N cards for this deck, the test line, then its cards,
// newest first. Tap a card to edit or delete it. An address for a deck that no longer exists goes home.
// From 48em, Add card sits beside Review (like Today) instead of in the phone bar (UI-BENTO-1 §5).
// D63: with a test ahead, the daily share is a pace, not a limit, so the cards it holds back can be
// studied early from here (never from Today), with one outlined pill under the test line.
// D77: a row link opens the practice round (every card, shuffled, nothing saved).
// Round 1: the cover carries the deck's New / Learning / Solid bar; rows show the card text plain (§7).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { useBack } from '../app/Nav';
import { useNow, useSnapshot } from '../app/hooks';
import { BackIcon, Chevron, PlusIcon } from '../components/Icons';
import { StageMeter } from '../components/Tiles';
import { deckStyle } from '../components/deckStyle';
import { cards } from '../lib/copy';
import type { Card } from '../lib/db';
import { computeDue } from '../lib/queue';
import { isNewCard } from '../lib/scheduler';
import { planLine, studiedLine, studyEarlyCount, whenLine } from '../lib/testCopy';
import { plainMarks } from '../lib/marks';
import { testApplies } from '../lib/testMode';
import { stageCounts, stageLine } from '../lib/xp';
import { EditSheet } from './EditSheet';
import { useTitle } from './useTitle';

export function DeckPage() {
  const { deckId } = useParams();
  const now = useNow();
  const snap = useSnapshot(now);
  const location = useLocation();
  const [editing, setEditing] = useState<Card | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const back = useBack('/decks', `/deck/${deckId}/`);

  const view = useMemo(() => {
    if (!snap) return null;
    const deck = snap.decks.find((d) => d.id === deckId);
    if (!deck) return { deck: null } as const;
    const list = snap.cards.filter((c) => c.deckId === deck.id);
    const result = computeDue({ cards: list, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now });
    const newestFirst = [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
    const saved = snap.tests.get(deck.id);
    // D44: facts only. After test day the deck acts as if it has no test (D30), so it's "Add a test" again.
    const test = testApplies(saved, now)
      ? {
          when: whenLine(saved.date, now),
          studied: studiedLine(list.filter((c) => !isNewCard(c)).length, list.length),
          plan: planLine(result.shares.get(deck.id) ?? null, saved.date, now),
          // D63: new cards the share holds back today. On test day and the day before nothing is held
          // back (everything is due), and once every card is studied there's nothing left to hold.
          early: studyEarlyCount(result.heldBack.size, saved.date, now),
        }
      : null;
    return { deck, list: newestFirst, due: result.due.length, test, stages: stageCounts(list) } as const;
  }, [snap, deckId, now]);

  useTitle(view?.deck?.name ?? 'Deck');

  // Arriving from another screen, focus starts at the deck's name (focus-on-route-change).
  useEffect(() => {
    if (view?.deck && location.key !== 'default') heading.current?.focus({ preventScroll: true });
    // Only when the page first has its deck.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view?.deck?.id]);

  if (!view) return <div className="booting" aria-busy="true" />;
  if (!view.deck) return <Navigate to="/" replace />;
  const { deck, list, due, test, stages } = view;
  const n = list.length;
  const counts = n === 0 ? 'No cards yet' : due > 0 ? `${cards(n)}, ${due}\u00A0due` : cards(n);

  function closeSheet(deleted: boolean) {
    setEditing(null);
    requestAnimationFrame(() => {
      if (!deleted && opener.current?.isConnected) opener.current.focus();
      else heading.current?.focus();
    });
  }

  return (
    <>
      <div inert={editing !== null}>
        <main className="screen deck-screen" style={deckStyle(deck.colour)}>
          {/* The cover: the deck's colour as a wash, holding Back, the name and the counts (plan §3). */}
          <div className="deck-cover">
            <header className="form-bar">
              <Link className="btn-text back-link" to={back.to} onClick={back.onClick}>
                <BackIcon />
                Back
              </Link>
              <span />
              <span />
            </header>
            <h1 className="t-hero" ref={heading} tabIndex={-1}>
              {deck.name}
            </h1>
            {/* While a test is set, "of 35" is in the test line and the due count is on the button. */}
            {!test && <p className="t-secondary counts">{counts}</p>}
            {/* Round 1 plan §5: New / Learning / Solid, with the words beside it. */}
            {n > 0 && (
              <div className="cover-stages">
                <StageMeter counts={stages} size="cover" />
                <p className="t-secondary stage-line">{stageLine(stages)}</p>
              </div>
            )}
          </div>

          <div className="lead">
            {due > 0 ? (
              <div className="study-row deck-actions">
                <Link className="btn btn-primary" to={`/deck/${deck.id}/review`}>
                  Review {cards(due)}
                </Link>
                <Link className="btn btn-secondary" to={`/deck/${deck.id}/add`}>
                  <PlusIcon />
                  Add card
                </Link>
              </div>
            ) : (
              <>
                {n === 0 ? <p className="t-secondary">Add a card whenever something is worth remembering.</p> : <p className="nothing">Nothing due right now</p>}
                <div className="study-row deck-actions">
                  <Link className="btn btn-primary is-add" to={`/deck/${deck.id}/add`}>
                    <PlusIcon />
                    Add card
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* One block in every state, so focus survives a recount: the test link (P-UI-3: Add a test, or
              the test's facts and Edit test, read last), then D63's pill under the plan, inside the rules. */}
          <div className={test && test.early > 0 ? 'test-block has-early' : 'test-block'}>
            <Link className={test ? 'test-line has-test' : 'test-line'} to={`/deck/${deck.id}/test`}>
              {test ? (
                <span className="test-info">
                  {/* A space after each fact, so the link's spoken name doesn't run them together (P-UI-9). */}
                  <span className="when">{test.when}</span> <span className="t-secondary">{test.studied}</span>{' '}
                  {test.plan && <span className="t-secondary">{test.plan}</span>}{' '}
                </span>
              ) : (
                <span className="t-secondary">No test date yet</span>
              )}
              <span className="link-label">{test ? 'Edit test' : 'Add a test'}</span>
            </Link>
            {test && test.early > 0 && (
              <div className="early">
                {/* Outlined and compact, never the filled button: Review stays this page's one main action. */}
                <Link className="btn btn-secondary btn-compact" to={`/deck/${deck.id}/review?early=1`}>
                  Study {cards(test.early)} early
                </Link>
                {due > 0 && (
                  <p className="t-secondary early-note">
                    The {cards(due)} due now {due === 1 ? 'comes' : 'come'} first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* D77: the whole deck once, shuffled, rating nothing. Under the test row, only with cards. */}
          {n > 0 && (
            <Link className="row-link practice-row" to={`/deck/${deck.id}/practice`}>
              Practice all {cards(n)}
              <Chevron />
            </Link>
          )}

          {n > 0 && (
            <section className="sec" aria-labelledby="cards-title" style={{ marginTop: 'var(--s4)' }}>
              <div className="sec-head">
                <h2 className="t-title" id="cards-title">
                  Cards
                </h2>
                <span className="t-meta">Tap one to edit it</span>
              </div>
              <ul className="card-list">
                {list.map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={(e) => {
                        opener.current = e.currentTarget;
                        setEditing(card);
                      }}
                    >
                      <span className="fb">
                        <span className="f">{plainMarks(card.front)}</span> <span className="b">{plainMarks(card.back)}</span>
                      </span>
                      {/* D61(6): rows that open something carry a chevron (rule 3). */}
                      <Chevron />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

      </div>

      {editing && <EditSheet key={editing.id} card={editing} onClose={closeSheet} />}
    </>
  );
}
