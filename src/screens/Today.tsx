// Today: the bento (UI-BENTO-1, D51; Card as hero, plan §4; D72-2; round 1 plan §2, §8c, §9). Three
// blocks in DOM = phone = focus order: Study and Tests, then Getting started (first run), You and Last
// 7 days, then Decks. From 48em a grid puts Study/Tests top left, Decks under it, and the rest in the
// right column (no CSS `order`). With no deck yet: Study, then Getting started.
// The tab bar (under 64em) or the sidebar (from 64em) is drawn by the Shell, not here.
import { useMemo } from 'react';
import { Link } from 'react-router';
import { DESKTOP } from '../app/Nav';
import { useMediaQuery, useNow, useReviewHistory, useSnapshot } from '../app/hooks';
import { Chevron, PlusIcon, StepCheck } from '../components/Icons';
import { DeckRows, WeekTile, YouTile } from '../components/Tiles';
import { deckStyle } from '../components/deckStyle';
import { cards } from '../lib/copy';
import { deckRowsOf } from '../lib/deckRows';
import { cardsPerDay } from '../lib/progress';
import { computeDue } from '../lib/queue';
import { isNewCard } from '../lib/scheduler';
import type { Snapshot } from '../lib/snapshot';
import { fitLine, planLine, studiedLine, whenLine } from '../lib/testCopy';
import { fitCheck, testApplies } from '../lib/testMode';
import { lastSevenDays, minutesLine, nextDueAt, nextDueLine, orderDecks, showWelcomeBack, todayTitle } from '../lib/today';
import { xpOf } from '../lib/xp';
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
    decks: deckRowsOf(snap, now, due.dueByDeck),
    // Plan §8c: until the first review ever.
    gettingStarted: snap.lastReviewAt === null ? { decks: snap.decks.length, cards: snap.cards.length } : null,
  };
}

/**
 * Plan §8c (D75 settlement 1): three steps until the first review ever. Not links. A done step is an
 * ink disc with a check; step 3 ticks with the first review, when the tile goes, so it never shows ticked.
 */
function GettingStarted({ decks, cards: made }: { decks: number; cards: number }) {
  const steps = [
    { text: 'Make a deck', done: decks >= 1, sub: null },
    { text: 'Write a few cards', done: made >= 3, sub: made >= 1 && made < 3 ? `${made} written so far` : null },
    { text: 'Review your cards', done: false, sub: null },
  ];
  return (
    <section className="tile getting-started" aria-labelledby="gs-title">
      <h2 className="tile-title" id="gs-title">
        Getting started
      </h2>
      <ol className="gs-steps">
        {steps.map((st, i) => (
          <li key={st.text} className={st.done ? 'gs-step is-done' : 'gs-step'}>
            <span className="gs-mark" aria-hidden="true">
              {st.done ? <StepCheck /> : i + 1}
            </span>
            <span className="gs-text">
              {st.text}
              {st.done && <span className="sr-only">, done</span>}
              {st.sub && <span className="gs-sub">{st.sub}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function AddCardButton({ filled }: { filled: boolean }) {
  return (
    <Link className={filled ? 'btn btn-primary btn-wide is-add' : 'btn btn-secondary btn-wide'} to="/add">
      <PlusIcon />
      Add card
    </Link>
  );
}

export function Today() {
  useTitle('Nigiri');
  const now = useNow();
  const snap = useSnapshot(now);
  const history = useReviewHistory();
  const desktop = useMediaQuery(DESKTOP);
  const view = useMemo(() => (snap ? todayView(snap, now) : null), [snap, now]);
  const perDay = useMemo(() => cardsPerDay(history ?? []), [history]);
  const xp = useMemo(() => (snap && history ? xpOf(snap.cards, history).total : null), [snap, history]);

  // m4: Study doesn't wait on the full review history; You and Last 7 days appear when it arrives.
  if (!view) return <div className="booting" aria-busy="true" />;
  const { state } = view;
  const first = state === 'first';
  const showWeek = !first && (view.week.added > 0 || view.week.reviewed > 0);
  const hasTests = view.tests.length > 0 && view.fit !== null;

  return (
    <main className="today">
      <header className="app-head">
        <span className="brand">Nigiri</span>
      </header>

      <div className="rails">
        <div className="rail rail-now">
          <section className="tile study" aria-labelledby="today-title">
            {first ? (
              <>
                <h1 className="t-hero" id="today-title">
                  Make your first deck
                </h1>
                <p className="t-secondary first-lines">
                  One for each class or unit.
                  <br />
                  Then you write the cards, and Nigiri picks when each one comes back.
                </p>
                <div className="study-row">
                  <Link className="btn btn-primary btn-wide is-add" to="/new-deck">
                    <PlusIcon />
                    New deck
                  </Link>
                </div>
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
                {state === 'due' ? (
                  <>
                    <p className="due-focus">
                      <span className="num">{view.dueCount}</span> {view.dueCount === 1 ? 'card due' : 'cards due'}
                    </p>
                    <div className="study-row">
                      <Link className="btn btn-primary btn-wide" to="/review" aria-describedby="lead-note">
                        Review {cards(view.dueCount)}
                      </Link>
                    </div>
                    <p className="t-secondary lead-note" id="lead-note">
                      {view.minutes}
                      <br />
                      Every rating saves, so you can stop anytime.
                    </p>
                    {/* From 64em the sidebar has Add card, so the tile drops it. */}
                    {!desktop && (
                      <div className="study-row is-add-row">
                        <AddCardButton filled={false} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="study-row">
                    <AddCardButton filled />
                  </div>
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
        </div>

        {(view.gettingStarted || (!first && xp !== null)) && (
          <div className="rail rail-yours">
            {view.gettingStarted && <GettingStarted decks={view.gettingStarted.decks} cards={view.gettingStarted.cards} />}
            {!first && xp !== null && <YouTile xp={xp} perDay={perDay} now={now} onToday />}
            {!first && xp !== null && showWeek && <WeekTile perDay={perDay} now={now} added={view.week.added} />}
          </div>
        )}

        {!first && (
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
            <DeckRows rows={view.decks} />
          </section>
        )}
      </div>
    </main>
  );
}
