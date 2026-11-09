// Navigation (D68, plan §5). Under 64em a bottom tab bar (Today, Decks, Progress, Settings); from 64em a
// left sidebar with the wordmark, your rank (D80, links to Progress), the same four rows, outlined Review
// and Add card, and the deck list. Only one of the
// two is in the page at a time. The current tab is marked by weight and an ink bar, never the accent.
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router';
import { BarsIcon, CardsIcon, GearIcon, PlusIcon, SunIcon } from '../components/Icons';
import { deckStyle } from '../components/deckStyle';
import { RankIcon } from '../components/RankIcon';
import { cards } from '../lib/copy';
import { computeDue } from '../lib/queue';
import { orderDecks } from '../lib/today';
import { levelOf, xpOf } from '../lib/xp';
import { useMediaQuery, useNow, useReviewHistory, useSnapshot } from './hooks';

export const DESKTOP = '(min-width: 64em)';

type Tab = 'today' | 'decks' | 'progress' | 'settings';

const TABS: readonly { tab: Tab; to: string; label: string; icon: () => ReactNode }[] = [
  { tab: 'today', to: '/', label: 'Today', icon: SunIcon },
  { tab: 'decks', to: '/decks', label: 'Decks', icon: CardsIcon },
  { tab: 'progress', to: '/progress', label: 'Progress', icon: BarsIcon },
  { tab: 'settings', to: '/settings', label: 'Settings', icon: GearIcon },
];

/** Which tab a screen belongs to; null where the tab bar hides (Review, Done, forms, the test screen). */
export function tabOf(path: string): Tab | null {
  if (path === '/') return 'today';
  if (path === '/decks' || /^\/deck\/[^/]+$/.test(path)) return 'decks';
  if (path === '/progress') return 'progress';
  if (path === '/settings' || path === '/settings/how') return 'settings';
  return null;
}

/** The sidebar hides on Review and Done (the review route) and on the practice round (D77). */
export function isReviewPath(path: string): boolean {
  return path === '/review' || /^\/deck\/[^/]+\/(review|practice)$/.test(path);
}

/**
 * Where each history entry came from, within this visit: the path of the entry before it. A reload
 * starts empty, so "Back" with nothing known goes to a fixed screen instead of leaving the app.
 */
const cameFrom = new Map<string, string | null>();
let lastKey: string | null = null;
let lastPath: string | null = null;

function useHistoryTrail() {
  const location = useLocation();
  const type = useNavigationType();
  useEffect(() => {
    if (type === 'PUSH') cameFrom.set(location.key, lastPath);
    else if (type === 'REPLACE' && lastKey !== null) cameFrom.set(location.key, cameFrom.get(lastKey) ?? null);
    lastKey = location.key;
    lastPath = location.pathname;
  }, [location.key, location.pathname, type]);
}

/**
 * Settlement 3: the deck page's Back goes back through history when the screen before it is in the
 * app and isn't one of this deck's own screens (its Add card, review or test), otherwise to /decks.
 */
export function useBack(fallback: string, ownPrefix: string): { to: string; onClick: (e: { preventDefault: () => void }) => void } {
  const location = useLocation();
  const navigate = useNavigate();
  return {
    to: fallback,
    onClick: (e) => {
      const prev = cameFrom.get(location.key);
      if (prev && prev !== location.pathname && !prev.startsWith(ownPrefix)) {
        e.preventDefault();
        navigate(-1);
      }
    },
  };
}

/**
 * CR-4 m2: while a sheet is open over a screen, the tab bar and sidebar are inert too, like the screen
 * behind it. A count, so two holders can't undo each other; the Shell reads it, so a nav that appears
 * while the sheet is open (resize, rotation) starts inert.
 */
let navHolds = 0;
const navListeners = new Set<() => void>();
function setNavHolds(n: number) {
  navHolds = n;
  for (const l of navListeners) l();
}
function useNavInert(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      navListeners.add(onChange);
      return () => navListeners.delete(onChange);
    },
    () => navHolds > 0,
    () => false,
  );
}
/** Call from a modal sheet: the main navigation is inert while it's mounted. */
export function useHoldNav(): void {
  useEffect(() => {
    setNavHolds(navHolds + 1);
    return () => setNavHolds(navHolds - 1);
  }, []);
}

function TabBar({ current, inert }: { current: Tab; inert: boolean }) {
  return (
    <nav className="tab-bar" aria-label="Main" inert={inert}>
      {TABS.map(({ tab, to, label, icon: Icon }) => (
        <Link key={tab} className="tab" to={to} aria-current={tab === current ? 'page' : undefined}>
          <Icon />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function Sidebar({ current, path, inert }: { current: Tab | null; path: string; inert: boolean }) {
  const now = useNow();
  const snap = useSnapshot(now);
  const history = useReviewHistory();
  // D80: the rank under the wordmark. xpOf walks every card and review. The snapshot reloads each
  // minute (useNow), which gives a new cards array, so this recounts about once a minute and after
  // any card or review change, not on every render.
  const cardList = snap?.cards;
  const rank = useMemo(() => (cardList && history ? levelOf(xpOf(cardList, history).total) : null), [cardList, history]);
  const view = useMemo(() => {
    if (!snap) return null;
    const due = computeDue({ cards: snap.cards, tests: snap.tests, firstReviewAt: snap.firstReviewAt, now }).due.length;
    return { due, decks: orderDecks(snap.decks, snap.tests, now) };
  }, [snap, now]);
  const deckMatch = /^\/deck\/([^/]+)/.exec(path);
  const currentDeck = deckMatch ? decodeURIComponent(deckMatch[1]) : null;

  return (
    <nav className="sidebar" aria-label="Main" inert={inert}>
      <div className="side-brand">Nigiri</div>
      {rank && (
        <Link className="side-rank" to="/progress">
          <RankIcon rank={rank.rank} size={32} />
          <span className="side-rank-text">
            <span className="side-rank-name">{rank.rank}</span>
            <span className="side-rank-level">Level {rank.level}</span>
          </span>
        </Link>
      )}
      <ul className="side-tabs">
        {TABS.map(({ tab, to, label, icon: Icon }) => (
          <li key={tab}>
            <Link className="side-row" to={to} aria-current={tab === current ? 'page' : undefined}>
              <Icon />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {view && (
        <div className="side-actions">
          {/* Round 1 plan §8b: on Today the Study tile has the one Review button. */}
          {view.due > 0 && path !== '/' && (
            <Link className="btn btn-secondary btn-wide" to="/review">
              Review {cards(view.due)}
            </Link>
          )}
          {view.decks.length > 0 ? (
            <Link className="btn btn-secondary btn-wide" to="/add">
              <PlusIcon />
              Add card
            </Link>
          ) : (
            <Link className="btn btn-secondary btn-wide" to="/new-deck">
              <PlusIcon />
              New deck
            </Link>
          )}
        </div>
      )}
      {view && view.decks.length > 0 && (
        <div className="side-decks">
          <div className="side-decks-head">
            <span>Decks</span>
            <Link className="btn-icon" to="/new-deck" aria-label="New deck">
              <PlusIcon />
            </Link>
          </div>
          <ul className="side-deck-list">
            {view.decks.map((d) => (
              <li key={d.id}>
                <Link className="side-deck" to={`/deck/${d.id}`} style={deckStyle(d.colour)} aria-current={d.id === currentDeck ? 'page' : undefined}>
                  <span className="side-square" aria-hidden="true" />
                  <span className="side-deck-name">{d.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

/**
 * Every screen sits inside this frame, which adds the tab bar or the sidebar where they belong.
 * CR-4 m3: the screen (<Outlet/>) is always at the same place in the tree, inside the same two divs;
 * only their classes and the nav beside them change. Crossing 64em (an iPad turned, a window resized)
 * then never remounts the screen, so an open edit sheet keeps what was typed.
 */
export function Shell() {
  useHistoryTrail();
  const { pathname } = useLocation();
  const desktop = useMediaQuery(DESKTOP);
  const inert = useNavInert();
  const tab = tabOf(pathname);
  const sidebar = desktop && !isReviewPath(pathname);
  const tabBar = !desktop && tab !== null;

  return (
    <div className={sidebar ? 'shell with-sidebar' : 'shell'}>
      {sidebar && <Sidebar current={tab} path={pathname} inert={inert} />}
      <div className={sidebar ? 'side-main' : tabBar ? 'tabbed' : undefined}>
        <Outlet />
      </div>
      {tabBar && <TabBar current={tab} inert={inert} />}
    </div>
  );
}
