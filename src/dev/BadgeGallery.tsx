// Dev only (B5): all ten rank badges at 32, 56 and 120px, plus locked at 56 and 120, on a tile, for
// screenshots. Open #/dev/badges (add ?theme=midnight before the hash for another theme). App.tsx
// adds the route only under import.meta.env.DEV, so neither the route nor this module is in the build.
import './badgeGallery.css';
import { RankIcon, type BadgeSize } from '../components/RankIcon';
import { RANKS, rankStart } from '../lib/xp';

const ROWS: { label: string; size: BadgeSize; locked?: boolean }[] = [
  { label: '32', size: 32 },
  { label: '56', size: 56 },
  { label: '120', size: 120 },
  { label: 'Locked 56', size: 56, locked: true },
  { label: 'Locked 120', size: 120, locked: true },
];

export default function BadgeGallery() {
  return (
    <main className="dev-gallery">
      <h1>Rank badges</h1>
      <div className="tile dev-gallery-tile">
        <table>
          <thead>
            <tr>
              <th scope="col">Size</th>
              {RANKS.map((r) => (
                <th key={r} scope="col">
                  {r}
                  <span>Level {rankStart(r)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {RANKS.map((r) => (
                  <td key={r}>
                    <RankIcon rank={r} size={row.size} locked={row.locked} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="dev-gallery-page">On the page background:</p>
      <div className="dev-gallery-strip">
        {RANKS.map((r) => (
          <RankIcon key={r} rank={r} size={56} />
        ))}
        {RANKS.map((r) => (
          <RankIcon key={`l${r}`} rank={r} size={56} locked />
        ))}
      </div>
    </main>
  );
}
