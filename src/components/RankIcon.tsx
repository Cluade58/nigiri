// The sushi rank icons (round 1 plan §1, D75): drawn in ink with one shade fill, never in colour, so
// deck colours and the accent keep their roles in all four themes. Decorative: the rank's name is
// always beside it. Paths are the plan's, drawn in its order. Fills and strokes come from hero.css
// (.ri-*), because a CSS variable can't be an SVG attribute.
import type { ReactNode } from 'react';
import type { Rank } from '../lib/xp';

const BASE = 'M11 37h26a4 4 0 0 0 4-4v-1c0-4-3-7-7-7H14c-4 0-7 3-7 7v1a4 4 0 0 0 4 4z';
const DRAPE = 'M5 27C8 18 16 14 25 15C34 16 41 19 43 24C43 27 40 28 37 27C30 25 20 25 12 28C9 29 5 30 5 27Z';

const DRAWINGS: Record<Rank, ReactNode> = {
  Rice: (
    <>
      <path className="ri-rice" d="M12 38h24a5 5 0 0 0 5-5v-3c0-6-5-11-11-11H18c-6 0-11 5-11 11v3a5 5 0 0 0 5 5z" />
      <path className="ri-line" strokeWidth={1.5} d="M15 26l2 1.5 M24 23l2-1 M32 27l-2 1.5 M19 32l2-1 M28 33l2 1" />
    </>
  ),
  Tamago: (
    <>
      <path className="ri-rice" d={BASE} />
      <rect className="ri-shade" x={7} y={14} width={34} height={11} rx={3} />
      <path className="ri-line" strokeWidth={1.25} d="M10 18h28 M10 21.5h28" />
      <rect className="ri-nori" x={21} y={12} width={6} height={26} rx={1} />
    </>
  ),
  Cucumber: (
    <>
      <circle className="ri-nori" cx={24} cy={24} r={16} />
      <circle className="ri-rice is-bare" cx={24} cy={24} r={12} />
      <circle className="ri-shade" strokeWidth={1.5} cx={24} cy={24} r={5} />
      <circle className="ri-seed" cx={22.5} cy={22.5} r={1} />
      <circle className="ri-seed" cx={25.5} cy={22.8} r={1} />
      <circle className="ri-seed" cx={24} cy={25.8} r={1} />
      <path className="ri-line" strokeWidth={1.25} d="M15 20l1.5 1 M31 28l1.5-1 M18 31l1.5 1" />
    </>
  ),
  Salmon: (
    <>
      <path className="ri-rice" d={BASE} />
      <path className="ri-shade" d={DRAPE} />
      <path className="ri-stripe" strokeWidth={2.5} d="M14 24l5-8 M22 24l5-8.5 M30 24l4-7.5" />
    </>
  ),
  Tuna: (
    <>
      <path className="ri-rice" d={BASE} />
      <path className="ri-shade" d="M6 25L9 16Q10 14 12 14L38 15Q40 15 41 17L42 24Q42 26 40 26L8 27Q6 27 6 25Z" />
    </>
  ),
  Otoro: (
    <>
      <path className="ri-rice" d={BASE} />
      <path className="ri-shade" d={DRAPE} />
      <path className="ri-line" strokeWidth={1.25} d="M10 23Q16 19 22 22 M18 18Q25 15 30 19 M26 24Q32 20 39 22" />
    </>
  ),
  Master: (
    <>
      <rect className="ri-shade" x={4} y={33} width={40} height={5} rx={1.5} />
      <path className="ri-line" d="M10 38v4 M38 38v4" />
      <rect className="ri-rice" x={7} y={26} width={16} height={7} rx={3.5} />
      <rect className="ri-rice" x={25} y={26} width={16} height={7} rx={3.5} />
      <path className="ri-shade" d="M6 26Q15 17 24 24Q15 27 6 26Z" />
      <path className="ri-shade" d="M24 26Q33 17 42 24Q33 27 24 26Z" />
      <path className="ri-stripe" d="M30 24l2-3 M35 24l2-3" />
    </>
  ),
};

export function RankIcon({ rank, size = 48 }: { rank: Rank; size?: 48 | 64 }) {
  return (
    <svg className="rank-icon" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false">
      {DRAWINGS[rank]}
    </svg>
  );
}
