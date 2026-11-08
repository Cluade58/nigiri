// Today: the bento (UI-BENTO-1, accepted as D51). Study, then Tests, Last 7 days and Decks.
// Reading order = DOM order = focus order at every width. Copy from mockups/home*.html and the plan.
// With no Tests tile, Last 7 days sits under Study in the first rail, so from 48em the rails are
// [Study, Last 7 days] | [Decks] and end near each other (UI-CRIT-1 required 3). The DOM order stays
// Study, Last 7 days, Decks, so phones and focus order don't change.
import { useMemo } from 'react';
import { Link } from 'react-router';
import { Chevron, GearIcon, PlusIcon } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { WIDE, useMediaQuery, useNow, useSnapshot } from '../app/hooks';
import { cards, plural } from '../lib/copy';
import { computeDue } from '../lib/queue';
import { isNewCard } from '../lib/scheduler';
import type { Snapshot } from '../lib/snapshot';
import { fitLine, planLine, shortWhen, studiedLine, whenLine } from '../lib/testCopy';
import { fitCheck, testApplies } from '../lib/testMode';
import { lastSevenDays, minutesLine, nextDueAt, nextDueLine, orderDecks, showWelcomeBack, todayTitle } from '../lib/today';
import { useTitle } from './useTitle';

type StudyState = 'first' | 'nocards' | 'due' | 'clear';

function todayView(snap: Snapshot, now: Date) {
  const due = computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now });
  const dueCount = due.due.length;
  const state: StudyState = snap.decks.length === 0 ? 'first' : snap.cards.length === 0 ? 'nocards' : dueCount > 0 ? 'due' : 'clear';
  const countByDeck = new Map<string, number>();
  const studiedByDeck = new Map<string, number>();
  for (const c of snap.cards) {
    countByDeck.set(c.deckId, (countByDeck.get(c.deckId) ?? 0) + 1);
    if (!isNewCard(c)) studiedByDeck.set(c.deckId, (studiedByDeck.get(c.deckId) ?? 0) + 1);
  }
  const next = state === 'clear' ? nextDueAt(snap.cards, due.dueIds, due.heldBack, now) : null;
  const ordered = orderDecks(snap.decks, snap.tests, now);
  // D50: the Tests tile lists every test today or ahead, soonest first (same day: newest deck first,
  // which orderDecks already does), then one fit line for all of them (D33, D61(3)).
  const tests = ordered.flatMap((deck) => {
    const t = snap.tests.get(deck.id);
    if (!testApplies(t, now)) return [];
    const total = countByDeck.get(deck.id) ?? 0;
    return [
      {
        deck,
        when: whenLine(t.date, now),
        studied: studiedLine(studiedByDeck.get(deck.id) ?? 0, total),
        plan: planLine(due.shares.get(deck.id) ?? null, t.date, now),
      },
    ];
  });
  const fit =
    tests.length > 0
      ? fitLine(fitCheck(snap.decks.map((d) => ({ deckId: d.id, cardCount: countByDeck.get(d.id) ?? 0, test: snap.tests.get(d.id) })), snap.settings.minutesPerDay, now))
      : null;
  return {
    tests,
    fit,
    state,
    dueCount,
    minutes: minutesLine(dueCount),
    welcome: showWelcomeBack({ now, dueCount, lastReviewAt: snap.lastReviewAt, cardCreatedAts: snap.cards.map((c) => c.createdAt) }),
    week: lastSevenDays(snap.cards, snap.recentReviews, now),
    nextLine: next ? nextDueLine(next, now) : null,
    decks: ordered.map((deck) => {
      const t = snap.tests.get(deck.id);
      return {
        deck,
        count: countByDeck.get(deck.id) ?? 0,
        due: due.dueByDeck.get(deck.id) ?? 0,
        // A deck with a test ahead shows its test day in place of its count (mockups/home.html).
        testDay: testApplies(t, now) ? shortWhen(t.date, now) : null,
      };
    }),
  };
}

function AddCardButton({ filled, wide }: { filled: boolean; wide: boolean }) {
  // One element that switches outlined/filled, so focus survives a recount (UI-BENTO-1).
  const cls = filled ? 'btn btn-primary is-add' : 'btn btn-secondary';
  return (
    <Link className={wide ? cls : `${cls} btn-wide`} to="/add">
      <PlusIcon />
      Add card
    </Link>
  );
}

function NewDeckButton({ wide }: { wide: boolean }) {
  return (
    <Link className={wide ? 'btn btn-primary is-add' : 'btn btn-primary btn-wide'} to="/new-deck">
      <PlusIcon />
      New deck
    </Link>
  );
}

export function Today() {
  useTitle('Nigiri');
  const now = useNow();
  const snap = useSnapshot(now);
  const wide = useMediaQuery(WIDE);
  const view = useMemo(() => (snap ? todayView(snap, now) : null), [snap, now]);

  if (!view) return <div className="booting" aria-busy="true" />;
  const { state } = view;
  const showWeek = view.week.added > 0 || view.week.reviewed > 0;
  const showDecks = state !== 'first';
  const hasTests = view.tests.length > 0 && view.fit !== null;
  const week = showWeek && (
    <section className="tile week" aria-labelledby="week-title">
      <h2 className="tile-title" id="week-title">
        Last 7 days
      </h2>
      {view.week.added > 0 && <p>{plural(view.week.added, 'card')} added</p>}
      {view.week.reviewed > 0 && <p>{plural(view.week.reviewed, 'card')} reviewed</p>}
    </section>
  );

  return (
    <>
      <main className={wide ? 'today' : 'today has-bar'}>
        <header className="app-head">
          <span className="brand">Nigiri</span>
          <Link className="btn-icon" to="/settings" aria-label="Settings">
            <GearIcon />
          </Link>
        </header>

        <div className="rails">
          <div className="rail rail-now">
            <section className="tile study" aria-labelledby="today-title">
              {state === 'first' ? (
                <>
                  <h1 className="t-hero" id="today-title">
                    Make your first deck
                  </h1>
                  <p className="t-secondary first-lines">
                    One for each class or unit.
                    <br />
                    Then you write the cards, and Nigiri picks when each one comes back.
                  </p>
                  {wide && (
                    <div className="study-row">
                      <NewDeckButton wide />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h1 id="today-title">{todayTitle(now)}</h1>
                  {view.welcome && (
                    <p className="t-secondary welcome">
                      Welcome back.
                      <br />
                      The cards waiting longest come first.
                    </p>
                  )}
                  {state === 'nocards' && <p className="t-secondary empty-note">Add a card whenever something is worth remembering.</p>}
                  {state === 'clear' && <p className="nothing">Nothing due right now</p>}
                  {state === 'clear' && view.nextLine && <p className="t-secondary next-due">{view.nextLine}</p>}
                  {(state === 'due' || wide) && (
                    <div className="study-row">
                      {state === 'due' ? (
                        <Link className="btn btn-primary" to="/review" aria-describedby="lead-note">
                          Review {cards(view.dueCount)}
                        </Link>
                      ) : null}
                      {wide ? <AddCardButton filled={state !== 'due'} wide /> : null}
                    </div>
                  )}
                  {state === 'due' && (
                    <p className="t-secondary lead-note" id="lead-note">
                      {view.minutes}
                      <br />
                      Every rating saves, so you can stop anytime.
                    </p>
                  )}
                </>
              )}
            </section>
            {hasTests && view.fit && (
              <section className="tile tests-tile" aria-labelledby="tests-title">
                <div className="tile-head is-bare">
                  <h2 className="tile-title" id="tests-title">
                    Tests
                  </h2>
                </div>
                <ul className="decks">
                  {view.tests.map(({ deck, when, studied, plan }) => (
                    <li key={deck.id}>
                      <Link className="deck test-row" to={`/deck/${deck.id}`} style={deckStyle(deck.colour)}>
                        <span className="swatch" aria-hidden="true" />
                        <span className="test-facts">
                          {/* Spaces between the facts, so the link's spoken name doesn't run them together. */}
                          <span className="name">{deck.name}</span> <span className="when">{when}</span> <span className="sub">{studied}</span>{' '}
                          {plan && <span className="sub plan">{plan}</span>}
                        </span>
                        <Chevron />
                      </Link>
                    </li>
                  ))}
                </ul>
                {/* The fit verdict is in words, never colour alone; no highlighter here (UI-BENTO-1). */}
                <p className="fit-line">
                  <strong>{view.fit.verdict}</strong>
                  {view.fit.rest}
                </p>
              </section>
            )}
            {!hasTests && week}
          </div>

          {((hasTests && showWeek) || showDecks) && (
            <div className="rail rail-yours">
              {hasTests && week}
              {showDecks && (
                <section className="tile decks-tile" aria-labelledby="decks-title">
                  <div className="tile-head">
                    <h2 className="tile-title" id="decks-title">
                      Decks
                    </h2>
                    <Link className="btn btn-secondary" to="/new-deck">
                      <PlusIcon />
                      New deck
                    </Link>
                  </div>
                  <ul className="decks">
                    {view.decks.map(({ deck, count, due, testDay }) => (
                      <li key={deck.id}>
                        <Link className="deck" to={`/deck/${deck.id}`} style={deckStyle(deck.colour)}>
                          <span className="swatch" aria-hidden="true" />
                          <span>
                            <span className="name">{deck.name}</span>{' '}
                            <span className="sub">{testDay ?? (count === 0 ? 'No cards yet' : cards(count))}</span>
                          </span>
                          <span className={due > 0 ? 'due' : 'due is-none'}>{due > 0 ? `${due}\u00A0due` : ''}</span>
                          <Chevron />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {!wide && (
        <nav className="bar is-today" aria-label="Make cards">
          <div className="bar-inner">{state === 'first' ? <NewDeckButton wide={false} /> : <AddCardButton filled={state !== 'due'} wide={false} />}</div>
        </nav>
      )}
    </>
  );
}
