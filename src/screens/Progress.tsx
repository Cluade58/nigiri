// Progress (D66, D67, plan §6; round 1 plan §4): the You tile (rank, level, XP and the streak), an
// 8-week calendar of days studied, the totals since you started, the last 7 days, and the ten ranks (D80). All counted from saved reviews and cards; nothing new is stored.
// No filled button here: nothing on this screen is an action.
import { format } from 'date-fns';
import { useMemo, useRef } from 'react';
import { useNow, useReviewHistory, useSnapshot } from '../app/hooks';
import { RankLadder, WeekTile, YouTile, dateOfKey } from '../components/Tiles';
import { cards, NBSP } from '../lib/copy';
import { calendarWeeks, cardsPerDay, heatStep, totalsOf, type CalendarCell } from '../lib/progress';
import { lastSevenDays } from '../lib/today';
import { xpOf } from '../lib/xp';
import { useArrivalFocus } from './useArrivalFocus';
import { useTitle } from './useTitle';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "12 November, 24 cards" / "12 November, none" / "today, 12 November, 3 cards". */
function cellText(c: CalendarCell): string {
  const day = format(dateOfKey(c.key), 'd MMMM');
  return `${c.isToday ? 'today, ' : ''}${day}, ${c.count > 0 ? cards(c.count) : 'none'}`;
}

export function Progress() {
  useTitle('Progress');
  const now = useNow();
  const snap = useSnapshot(now);
  const history = useReviewHistory();
  const heading = useRef<HTMLHeadingElement>(null);
  useArrivalFocus(heading, snap !== undefined && history !== undefined);
  const perDay = useMemo(() => cardsPerDay(history ?? []), [history]);
  // xpOf walks every card and review: only again when they change, not on every minute tick.
  const xp = useMemo(() => (snap && history ? xpOf(snap.cards, history).total : 0), [snap, history]);

  if (!snap || !history) return <div className="booting" aria-busy="true" />;
  const weeks = calendarWeeks(perDay, now, 8);
  const past = weeks.flat().filter((c) => !c.isFuture);
  const studied = past.filter((c) => c.count > 0).length;
  const totals = totalsOf(perDay, snap.cards);
  const week = lastSevenDays(snap.cards, snap.recentReviews, now);

  return (
    <main className="tiles-page progress-page">
      <header className="page-head">
        <h1 ref={heading} tabIndex={-1}>
          Progress
        </h1>
      </header>
      {/* Pass 2 C3: phone and DOM order You, Days studied, Since you started, Last 7 days. From 64em,
          two rails whose content sets their heights; below that the rails don't draw a box. */}
      <div className="progress-grid">
        <div className="p-rail">
          <div className="g-streak">
            <YouTile xp={xp} perDay={perDay} now={now} onToday={false} />
          </div>

          <section className="tile g-cal" aria-labelledby="cal-title">
            <h2 className="tile-title" id="cal-title">
              Days studied
            </h2>
            <table className="cal">
              <caption className="sr-only">Days studied, last 8 weeks</caption>
              <thead>
                <tr>
                  <td className="cal-gutter" />
                  {WEEKDAYS.map((d) => (
                    <th key={d} scope="col" abbr={d}>
                      {d[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((row, i) => {
                  // A month's name sits on the row where it starts, and on the first row, so the top row is never unnamed.
                  const label = row.find((c) => c.date === 1) ?? (i === 0 ? row[0] : undefined);
                  return (
                    <tr key={row[0].key}>
                      <td className="cal-gutter" aria-hidden="true">
                        {label ? format(dateOfKey(label.key), 'MMM') : ''}
                      </td>
                      {row.map((c) =>
                        c.isFuture ? (
                          <td key={c.key} className="day is-future" />
                        ) : (
                          <td key={c.key} className={`day heat-${heatStep(c.count)}${c.isToday ? ' is-today' : ''}`}>
                            <span className="cell">
                              <span aria-hidden="true">{c.date}</span>
                              <span className="sr-only">{cellText(c)}</span>
                            </span>
                          </td>
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="t-secondary cal-line">
              {studied > 0 ? `Studied on ${studied} of the last ${past.length}${NBSP}days.` : 'Days you review cards fill in here.'}
            </p>
          </section>
        </div>

        <div className="p-rail">
          <section className="tile totals g-totals" aria-labelledby="totals-title">
            <h2 className="tile-title" id="totals-title">
              Since you started
            </h2>
            <dl className="totals-list">
              <div>
                <dt>Days studied</dt>
                <dd>{totals.daysStudied}</dd>
              </div>
              <div>
                <dt>Cards reviewed</dt>
                <dd>{totals.cardsReviewed}</dd>
              </div>
              <div>
                <dt>Cards made</dt>
                <dd>{totals.cardsMade}</dd>
              </div>
            </dl>
          </section>

          {(week.added > 0 || week.reviewed > 0) && (
            <div className="g-week">
              <WeekTile perDay={perDay} now={now} added={week.added} />
            </div>
          )}
        </div>
      </div>
      {/* D80: the ten ranks under the grid, full width; two columns inside the tile from 48em. */}
      <div className="g-ranks">
        <RankLadder xp={xp} />
      </div>
    </main>
  );
}
