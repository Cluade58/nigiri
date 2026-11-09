// Tiles shared by Today and Progress (plan §4, §6; round 1 plan §2, §5): You, Last 7 days, and the deck
// rows with their bar. Every number comes from saved reviews and cards (D67, D73). Charts are
// aria-hidden with a text twin.
import { format } from 'date-fns';
import { Link } from 'react-router';
import { cards, plural, NBSP } from '../lib/copy';
import type { Deck } from '../lib/db';
import { calendarWeeks, daysStudiedIn, heatStep, lastDays, streakOf, stripDays } from '../lib/progress';
import { RANKS, levelLine, levelOf, nextLine, rankIndex, rankStart, stageLine, type StageCounts } from '../lib/xp';
import { parseDayKey } from '../lib/time';
import { Chevron } from './Icons';
import { deckStyle } from './deckStyle';
import { RankIcon } from './RankIcon';

export const dateOfKey = (key: string) => {
  const p = parseDayKey(key)!;
  return new Date(p.y, p.m - 1, p.d);
};

/** "12 days in a row" (D67, round 1 plan §2). Streak 0 says how to start one, with no blame. */
export function StreakLines({ perDay, now }: { perDay: ReadonlyMap<string, number>; now: Date }) {
  const { current, best } = streakOf(perDay, now);
  return (
    <div className="you-streak">
      {current > 0 ? <p className="streak-num">{plural(current, 'day')} in a row</p> : <p className="streak-zero">Review a card to start a streak.</p>}
      {best >= 1 && <p className="t-secondary streak-best">Best: {plural(best, 'day')}</p>}
    </div>
  );
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * This week and the ones before it, Monday to Sunday (plan §2): past days ruled, studied days in the
 * heat steps, later days dashed, today ringed (filled once it has a review). aria-hidden: the caller
 * says it in words.
 */
export function WeekCal({ perDay, now, weeks }: { perDay: ReadonlyMap<string, number>; now: Date; weeks: number }) {
  const rows = calendarWeeks(perDay, now, weeks);
  return (
    <div className="week-cal" aria-hidden="true">
      {LETTERS.map((l, i) => (
        <span key={`h${i}`} className="wc-head">
          {l}
        </span>
      ))}
      {rows.flat().map((c) => {
        const state = c.isFuture ? 'is-later' : c.count > 0 ? `heat-${heatStep(c.count)}` : 'is-none';
        return <span key={c.key} className={`wc ${state}${c.isToday ? ' is-today' : ''}`} />;
      })}
    </div>
  );
}

/**
 * Done's strip (pass 2 R2): the last 7 days ending today, today last, each headed by its own weekday
 * initial. No later cells. aria-hidden: stripText says it in words. `fillToday` fills today's cell
 * 560 ms after it appears (plan §3).
 */
export function DayStrip({ perDay, now, fillToday = false }: { perDay: ReadonlyMap<string, number>; now: Date; fillToday?: boolean }) {
  const days = stripDays(perDay, now);
  return (
    <div className="week-cal" aria-hidden="true">
      {days.map((d) => (
        <span key={`h${d.key}`} className="wc-head">
          {d.letter}
        </span>
      ))}
      {days.map((d) => (
        <span
          key={d.key}
          className={`wc ${d.count > 0 ? `heat-${heatStep(d.count)}` : 'is-none'}${d.isToday ? ' is-today' : ''}${d.isToday && fillToday && d.count > 0 ? ' is-filling' : ''}`}
        />
      ))}
    </div>
  );
}

/** "Studied on 5 of the last 7 days." for Done's strip. */
export const stripText = (perDay: ReadonlyMap<string, number>, now: Date) => `Studied on ${daysStudiedIn(perDay, now, 7)} of the last 7 days.`;

/** "Studied on 9 of the last 22 days." for a WeekCal, counting to today. */
export function studiedText(perDay: ReadonlyMap<string, number>, now: Date, weeks: number): string {
  const past = calendarWeeks(perDay, now, weeks)
    .flat()
    .filter((c) => !c.isFuture);
  const studied = past.filter((c) => c.count > 0).length;
  return `Studied on ${studied} of the last ${past.length} days.`;
}

/** A 10px capsule (plan §2, §5): the progress colour inside a progress-coloured border. */
function XpMeter({ fraction }: { fraction: number }) {
  return (
    <div className="meter is-xp" aria-hidden="true">
      <span className="m-fill" style={{ width: `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(1)}%` }} />
    </div>
  );
}

/**
 * The You tile (plan §2, §4, D75, D79): the 56px rank badge, the rank as the heading, "Level 5, 1,240 XP", the XP meter, what's
 * left to the next level, then the streak. On Today it adds the four-week calendar and See progress.
 */
export function YouTile({ xp, perDay, now, onToday }: { xp: number; perDay: ReadonlyMap<string, number>; now: Date; onToday: boolean }) {
  const info = levelOf(xp);
  return (
    <section className="tile you" aria-labelledby="you-title">
      <div className="you-head">
        <RankIcon rank={info.rank} size={56} />
        <div className="you-id">
          <h2 className="you-rank" id="you-title">
            {info.rank}
          </h2>
          <p className="t-secondary">{levelLine(info)}</p>
        </div>
      </div>
      <XpMeter fraction={info.into / info.need} />
      <p className="you-next">{nextLine(info)}</p>
      {xp === 0 && <p className="you-next">Each card you write earns 15{NBSP}XP.</p>}
      <StreakLines perDay={perDay} now={now} />
      {onToday && (
        <>
          <WeekCal perDay={perDay} now={now} weeks={4} />
          <p className="sr-only">{studiedText(perDay, now, 4)}</p>
          <Link className="row-link see-progress" to="/progress">
            See progress
            <Chevron />
          </Link>
        </>
      )}
    </section>
  );
}

/**
 * Progress's Ranks tile (D80, rank-badges-plan.md "Chief's settlements"): all ten ranks in order, each a
 * 56px badge, the name and the level it starts at. Reached ranks in full, the current one adds "You're
 * here", ranks ahead are silhouettes with their name and level in ink-2. No accent. Each row's words
 * are said once, by its sr-only line.
 */
export function RankLadder({ xp }: { xp: number }) {
  const current = rankIndex(levelOf(xp).rank);
  return (
    <section className="tile ranks" aria-labelledby="ranks-title">
      <h2 className="tile-title" id="ranks-title">
        Ranks
      </h2>
      <ol className="rank-ladder">
        {RANKS.map((rank, i) => {
          const where = i < current ? 'reached' : i === current ? 'current rank' : 'not yet';
          return (
            <li key={rank} className={i === current ? 'is-current' : i > current ? 'is-ahead' : undefined}>
              <RankIcon rank={rank} size={56} locked={i > current} />
              <span className="rl-text" aria-hidden="true">
                <span className="rl-name">{rank}</span>
                <span className="rl-sub">
                  <span className="rl-level">Level {rankStart(rank)}</span>
                  {i === current && <span className="rl-here">You're here</span>}
                </span>
              </span>
              <span className="sr-only">{`${rank}, level ${rankStart(rank)}, ${where}`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * New / Learning / Solid (plan §5, D74): Solid in the progress colour, Learning in its light tint, New
 * empty, left to right, sized by count. aria-hidden: the words sit beside it.
 */
export function StageMeter({ counts, size }: { counts: StageCounts; size: 'row' | 'cover' }) {
  const total = counts.solid + counts.learning + counts.new;
  if (total === 0) return null;
  const parts = (['solid', 'learning', 'new'] as const).filter((k) => counts[k] > 0);
  return (
    <span className={`meter is-stages is-${size}`} aria-hidden="true">
      {parts.map((k) => (
        <span key={k} className={`m-${k}`} style={{ flexGrow: counts[k] }} />
      ))}
    </span>
  );
}

/** "84 cards reviewed, 12 added" (D50's numbers); a zero part is left out. */
export function weekLine(reviewed: number, added: number): string {
  if (reviewed > 0 && added > 0) return `${cards(reviewed)} reviewed, ${added}${NBSP}added`;
  if (reviewed > 0) return `${cards(reviewed)} reviewed`;
  return `${cards(added)} added`;
}

/** D71: the line's "reviewed" is the bars added up, so the two can never disagree. */
export function WeekTile({ perDay, now, added }: { perDay: ReadonlyMap<string, number>; now: Date; added: number }) {
  const days = lastDays(perDay, now, 7);
  const reviewed = days.reduce((sum, d) => sum + d.count, 0);
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <section className="tile week" aria-labelledby="week-title">
      <h2 className="tile-title" id="week-title">
        Last 7 days
      </h2>
      <p className="week-line">{weekLine(reviewed, added)}</p>
      <div className="bars" aria-hidden="true">
        {days.map((d) => (
          <div key={d.key} className="bar-col">
            <div className="bar-plot">
              {d.count > 0 && (
                <div className="bar-fill" style={{ height: `${(d.count / max) * 100}%` }}>
                  <span className="bar-n">{d.count}</span>
                </div>
              )}
            </div>
            <span className={d.isToday ? 'bar-day is-today' : 'bar-day'}>{d.isToday ? 'Today' : format(dateOfKey(d.key), 'EEE')}</span>
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {days.map((d) => (
          <li key={d.key}>
            {d.isToday ? 'Today' : format(dateOfKey(d.key), 'EEEE')}: {d.count > 0 ? `${cards(d.count)} reviewed` : 'none'}
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface DeckRow {
  deck: Deck;
  count: number;
  due: number;
  testDay: string | null;
  stages: StageCounts;
}

/**
 * The deck list's ruled rows (Today's Decks tile and the Decks tab). `stages` (the Decks tab, pass 2 O2)
 * writes the stage counts into the sub line: "12 cards: 4 solid, 3 new", after the test day when a test is
 * ahead: "Test Nov 18. 35 cards: 30 learning, 5 new" (UI-CRIT-7 c, D78). Only non-zero parts; it wraps.
 */
export function DeckRows({ rows, stages: withStages = false }: { rows: readonly DeckRow[]; stages?: boolean }) {
  return (
    <ul className="decks">
      {rows.map(({ deck, count, due, testDay, stages }) => {
        const spelled = withStages && count > 0;
        return (
          <li key={deck.id}>
            <Link className="deck" to={`/deck/${deck.id}`} style={deckStyle(deck.colour)}>
              <span className="swatch" aria-hidden="true" />
              <span>
                <span className="name">{deck.name}</span>{' '}
                <span className="sub">
                  {spelled ? `${testDay ? `${testDay}. ` : ''}${cards(count)}: ${stageLine(stages)}` : (testDay ?? (count === 0 ? 'No cards yet' : cards(count)))}
                </span>
                {count > 0 && (
                  <>
                    <StageMeter counts={stages} size="row" />
                    {!spelled && <span className="sr-only">, {stageLine(stages)}</span>}
                  </>
                )}
              </span>
              <span className={due > 0 ? 'due' : 'due is-none'}>{due > 0 ? `${due}\u00A0due` : ''}</span>
              <Chevron />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
