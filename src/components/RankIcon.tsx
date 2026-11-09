// The ten sushi rank badges (D79, mockups/rank-badges-plan.md): kawaii stickers, hand-drawn inline SVG
// in a 64×64 box. Each has the same four layers: a white die-cut edge with the dark outline and the
// plate (.rk-plate), the sushi (.rk-food), its face (.rk-face, with the eyes in .rk-eyes so the rank-up
// can blink them) and small extras (.rk-detail, hidden at 32px). Colours are the fixed --rk-* tokens in
// round1.css, the same in every theme, never the accent and never a deck colour. Inline colours from
// the plan's samples are classes here (.rk-f-* fills, .rk-s-* strokes), because a CSS variable can't be
// an SVG attribute. Decorative: the rank's name is always beside it. `locked` draws the silhouette.
import type { ReactNode } from 'react';
import type { Rank } from '../lib/xp';

export type BadgeSize = 32 | 56 | 120;

const RICE = 'M17 38C17 34.5 19.5 33 23 33H41C44.5 33 47 34.5 47 38V40C47 42.5 45 44.5 42.5 44.5H21.5C19 44.5 17 42.5 17 40Z';
const DRAPE = 'M11 34C13 25 22 20 32 21C42 22 50 26 53 31C54 34 51 35 48 34C40 32 26 32 18 35C15 36 11 37 11 34Z';

type Plate = 'ceramic' | 'wood' | 'lacquer' | 'gold';

function PlateLayer({ plate }: { plate: Plate }) {
  return (
    <>
      <g className="rk-plate">
        <circle className="rk-cut" cx={32} cy={32} r={30} />
        <circle className={`rk-disc rk-f-${plate}`} cx={32} cy={32} r={25.5} />
      </g>
      {plate === 'wood' && (
        <g className="rk-detail">
          <path className="rk-stroke rk-s-wood-d" strokeWidth={1.5} d="M14 22q7-3 14 0M38 52q6 1 11-2" />
        </g>
      )}
      {plate === 'lacquer' && <circle className="rk-detail rk-stroke rk-s-lacquer-ring" strokeWidth={1.5} cx={32} cy={32} r={22.5} />}
      {plate === 'gold' && <circle className="rk-detail rk-stroke rk-s-gold-d" strokeWidth={1.5} strokeDasharray=".1 3.4" cx={32} cy={32} r={22} />}
    </>
  );
}

/** Open eyes: dark ovals with a white glint. */
const Eyes = ({ y = 27, l = 28, r = 36, rx = 1.6, ry = 2 }: { y?: number; l?: number; r?: number; rx?: number; ry?: number }) => (
  <g className="rk-eyes">
    <ellipse className="rk-eye" cx={l} cy={y} rx={rx} ry={ry} />
    <circle className="rk-shine" cx={l + 0.5} cy={y - 0.7} r={rx * 0.38} />
    <ellipse className="rk-eye" cx={r} cy={y} rx={rx} ry={ry} />
    <circle className="rk-shine" cx={r + 0.5} cy={y - 0.7} r={rx * 0.38} />
  </g>
);

/** Pink cheeks, hidden at 32px. */
const Blush = ({ y = 29.5, l = 24.5, r = 39.5 }: { y?: number; l?: number; r?: number }) => (
  <g className="rk-detail">
    <ellipse className="rk-blush" cx={l} cy={y} rx={2.2} ry={1.2} />
    <ellipse className="rk-blush" cx={r} cy={y} rx={2.2} ry={1.2} />
  </g>
);

/** A four-point sparkle centred on (x, y), `s` from the centre to each tip (the plan's Omakase shape). */
const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

const DRAWINGS: Record<Rank, { plate: Plate; art: ReactNode }> = {
  'Rice Grain': {
    plate: 'ceramic',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d="M32 14C35 15 41.5 22 41.5 33C41.5 42.5 37.5 49 32 49C26.5 49 22.5 42.5 22.5 33C22.5 22 29 15 32 14Z" />
        </g>
        <path className="rk-stroke rk-s-ceramic-d" strokeWidth={1.4} d="M25.2 30Q25.4 24.5 28.6 20.8" />
        <g className="rk-face">
          <g className="rk-eyes">
            <path className="rk-mouth" d="M25.5 33q2 1.8 4 0M34.5 33q2 1.8 4 0" />
          </g>
          <circle className="rk-mouth" cx={32} cy={38.2} r={1.3} />
          <Blush y={36.5} l={25.8} r={38.2} />
        </g>
        <g className="rk-detail">
          <path className="rk-stroke rk-s-ceramic-d" strokeWidth={1.5} d="M45 21q-3-2.5 0-5q3-2.5 0-5" />
        </g>
      </>
    ),
  },
  'Cucumber Roll': {
    plate: 'ceramic',
    art: (
      <>
        <g className="rk-food">
          <circle className="rk-f-nori" cx={32} cy={33} r={16} />
          <circle className="rk-f-rice" cx={32} cy={33} r={12.5} />
          <circle className="rk-f-cucumber-d" cx={32} cy={38.5} r={5.5} />
          <circle className="rk-f-cucumber rk-bare" cx={32} cy={38.5} r={3.9} />
        </g>
        <g className="rk-face">
          <g className="rk-eyes">
            <circle className="rk-eye" cx={27.5} cy={26} r={1.5} />
            <circle className="rk-shine" cx={28} cy={25.4} r={0.55} />
            <circle className="rk-eye" cx={36.5} cy={26} r={1.5} />
            <circle className="rk-shine" cx={37} cy={25.4} r={0.55} />
          </g>
          <path className="rk-mouth" d="M30 29q2 2 4 0" />
          <Blush y={29} l={24} r={40} />
        </g>
        <g className="rk-detail">
          <circle className="rk-f-cucumber-d" cx={30.8} cy={37.6} r={0.7} />
          <circle className="rk-f-cucumber-d" cx={33.2} cy={37.6} r={0.7} />
          <circle className="rk-f-cucumber-d" cx={32} cy={39.8} r={0.7} />
        </g>
      </>
    ),
  },
  Tamago: {
    plate: 'ceramic',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <rect className="rk-f-egg" x={13} y={20.5} width={38} height={14} rx={3.5} />
        </g>
        <path className="rk-stroke rk-s-egg-d" strokeWidth={1} d="M15 24.3H49M15 32H49" />
        <g className="rk-food">
          <rect className="rk-f-nori" x={39.5} y={19.5} width={6.5} height={25.5} rx={1.5} />
        </g>
        <g className="rk-face">
          <g className="rk-eyes">
            <path className="rk-mouth" d="M22.8 28.4l1.8-2 1.8 2M30.6 28.4l1.8-2 1.8 2" />
          </g>
          <path className="rk-mouth" d="M26.9 30.2q1.6 1.8 3.2 0" />
          <Blush y={30.8} l={21.5} r={36} />
        </g>
        <g className="rk-detail">
          <path className="rk-f-nori rk-s-line" strokeWidth={1} d="M42.75 30.5l-3.4-2.1v4.2ZM42.75 30.5l3.4-2.1v4.2Z" />
        </g>
      </>
    ),
  },
  'Sweet Shrimp': {
    plate: 'wood',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <path className="rk-f-shrimp" d="M43 27.5C45 23.5 48 19.5 52.5 17.5C53.5 21.5 52.5 25.5 50.5 28C48.5 30 45.5 30 43.5 29.5Z" />
          <path className="rk-f-shrimp" d="M12 33C13 26 21 22 30 22.5C37 23 42 24.5 45 26.5C46 27.5 45.5 29.5 44 30C37 32 26 32 18 35C15 36 12 36 12 33Z" />
        </g>
        <g className="rk-detail">
          <path className="rk-f-shrimp-tail rk-bare" d="M46.5 26C48 23 50 20.5 52 19.3C52.4 22 51.6 24.8 50 26.8C48.8 28 47.5 28.2 46.5 27.8Z" />
        </g>
        <path className="rk-stroke rk-s-shrimp-l" strokeWidth={2} d="M18.5 26q2 3.5 1.2 7.8M24.5 23.8q2 4 1.2 8.2M37 23.6q1.6 3.4 1 6.8" />
        <g className="rk-face">
          <Eyes y={27.3} l={28} r={34.5} rx={1.9} ry={2.4} />
          <path className="rk-f-line" d="M29.8 30.4q1.45 2.4 2.9 0Z" />
          <Blush y={30.2} l={24.6} r={38.2} />
        </g>
      </>
    ),
  },
  Salmon: {
    plate: 'wood',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <path className="rk-f-salmon" d={DRAPE} />
        </g>
        <path className="rk-stroke rk-s-salmon-l" strokeWidth={2.2} d="M15 32L19 26M20 30.5L24 24.5M44 31L47 26M48 32.5L50.5 28.5" />
        <g className="rk-face">
          <Eyes />
          <path className="rk-mouth" d="M30.5 29.5q1.5 1.6 3 0" />
          <Blush />
        </g>
        <g className="rk-detail">
          <path className="rk-f-cucumber rk-s-line" strokeWidth={1.2} d="M41 47C44 43.5 50 43.5 51 46C49 49 44 49.5 41 47Z" />
          <path className="rk-stroke rk-s-cucumber-d" strokeWidth={1} d="M42.5 47L49 46" />
        </g>
      </>
    ),
  },
  Yellowtail: {
    plate: 'wood',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <path className="rk-f-hamachi" d={DRAPE} />
        </g>
        <path className="rk-stroke rk-s-hamachi-edge" strokeWidth={2.2} d="M15 28.5C18 24.5 24 23 32 23.5C40 24 46 26.5 49.5 29.5" />
        <g className="rk-face">
          <g className="rk-eyes">
            <ellipse className="rk-eye" cx={28} cy={27.3} rx={1.6} ry={2} />
            <circle className="rk-shine" cx={28.5} cy={26.6} r={0.6} />
            <path className="rk-mouth" d="M34.5 27.6q1.5-1.7 3 0" />
          </g>
          <path className="rk-mouth" d="M30.5 30q1.5 1.6 3 0" />
          <Blush y={30} />
        </g>
        <g className="rk-detail">
          <circle className="rk-f-cucumber rk-s-cucumber-d" strokeWidth={0.8} cx={41.2} cy={24.6} r={1.3} />
          <circle className="rk-f-cucumber rk-s-cucumber-d" strokeWidth={0.8} cx={44.9} cy={26.2} r={1.3} />
          <circle className="rk-f-cucumber rk-s-cucumber-d" strokeWidth={0.8} cx={43.6} cy={22.6} r={1.3} />
        </g>
      </>
    ),
  },
  Ikura: {
    plate: 'lacquer',
    art: (
      <>
        <g className="rk-food">
          <rect className="rk-f-rice" x={17.5} y={25} width={29} height={7} rx={3} />
          <circle className="rk-f-ikura" cx={24.5} cy={21.5} r={3.6} />
          <circle className="rk-f-ikura" cx={31.5} cy={20} r={3.6} />
          <circle className="rk-f-ikura" cx={38.5} cy={21.5} r={3.6} />
          <circle className="rk-f-ikura" cx={20.8} cy={26.3} r={3.6} />
          <circle className="rk-f-ikura" cx={27.6} cy={25.4} r={3.6} />
          <circle className="rk-f-ikura" cx={34.6} cy={25.4} r={3.6} />
          <circle className="rk-f-ikura" cx={41.4} cy={26.3} r={3.6} />
          <rect className="rk-f-nori" x={16.5} y={28.5} width={31} height={17} rx={4} />
        </g>
        <path className="rk-stroke rk-s-nori-l" strokeWidth={1.2} d="M20 32.2H44" />
        <g className="rk-detail">
          <circle className="rk-shine" cx={23.4} cy={20.4} r={0.9} />
          <circle className="rk-shine" cx={30.4} cy={18.9} r={0.9} />
          <circle className="rk-shine" cx={37.4} cy={20.4} r={0.9} />
          <circle className="rk-shine" cx={19.7} cy={25.2} r={0.9} />
          <circle className="rk-shine" cx={26.5} cy={24.3} r={0.9} />
          <circle className="rk-shine" cx={33.5} cy={24.3} r={0.9} />
          <circle className="rk-shine" cx={40.3} cy={25.2} r={0.9} />
        </g>
        <g className="rk-face">
          <g className="rk-eyes">
            <ellipse className="rk-eye-w" cx={27.5} cy={36.5} rx={1.8} ry={2.2} />
            <circle className="rk-eye" cx={27.8} cy={36.1} r={0.9} />
            <ellipse className="rk-eye-w" cx={36.5} cy={36.5} rx={1.8} ry={2.2} />
            <circle className="rk-eye" cx={36.8} cy={36.1} r={0.9} />
          </g>
          <path className="rk-f-blush rk-s-white" strokeWidth={1} d="M30 39.6q2 3.8 4 0Z" />
          <Blush y={40} l={23.2} r={40.8} />
        </g>
        <g className="rk-detail">
          <path className="rk-f-white rk-s-line" strokeWidth={0.8} d={sparkle(42.5, 16.5, 3)} />
        </g>
      </>
    ),
  },
  Chutoro: {
    plate: 'lacquer',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <path className="rk-f-chutoro" d={DRAPE} />
        </g>
        <path className="rk-stroke rk-s-chutoro-l" strokeWidth={1.6} d="M14.5 31.5q3-4 7.5-5M43 30.5q3.5-2.5 7-2M18 34q3-1.6 6-1.8M41 32.2q3-.8 6 0" />
        <g className="rk-face">
          <Eyes y={27.5} />
          <path className="rk-mouth" d="M26 23.6l3.2.6M38 23.6l-3.2.6" />
          <path className="rk-mouth" d="M30.5 30.3q1.5 1.1 3 0" />
          <Blush y={30} />
        </g>
        <g className="rk-detail">
          <path className="rk-f-gold rk-s-line" strokeWidth={0.8} d="M42 23.4l2.6-1 .6 2.1-2.4.9Z" />
        </g>
      </>
    ),
  },
  Otoro: {
    plate: 'lacquer',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <path
            className="rk-f-otoro"
            d="M10 35C12 25 22 20 32 21C42 22 51 26 54 32C55 35.5 53 38 51 36.5C50 35.5 49.5 34.5 48 34C40 32 26 32 18 35C16 35.8 15 38.5 12.5 38.5C10.5 38.5 9.8 37 10 35Z"
          />
        </g>
        <path className="rk-stroke rk-s-otoro-l" strokeWidth={1.4} d="M14 31q4-3 8-1M20 25.8q4-2.6 8-1.5M37 24.8q4-.6 8 1.6M43 31q4-2 8 0M26 32q3-1.2 6-.6M12.8 35.5q1.6-.4 2.8.6" />
        <g className="rk-face">
          <g className="rk-eyes">
            <path className="rk-mouth" d="M27 27.5q1.5-2.2 3 0M34 27.5q1.5-2.2 3 0" />
          </g>
          <path className="rk-f-line" d="M30.6 29.4q1.4 2.8 2.8 0Z" />
          <Blush />
        </g>
        <g className="rk-detail">
          <path className="rk-f-gold rk-s-line" strokeWidth={0.8} d="M41.5 23.6l2.5-1 .5 2-2.2.8Z" />
          <path className="rk-f-white rk-s-line" strokeWidth={0.8} d={sparkle(14, 18.5, 3.2)} />
          <path className="rk-f-white rk-s-line" strokeWidth={0.8} d={sparkle(50, 17, 2.5)} />
        </g>
      </>
    ),
  },
  Omakase: {
    plate: 'gold',
    art: (
      <>
        <g className="rk-food">
          <path className="rk-f-rice" d={RICE} />
          <path className="rk-f-otoro" d={DRAPE} />
          <path className="rk-f-gold" d="M26 20.5L25 13.5L29 16.5L32 11.5L35 16.5L39 13.5L38 20.5Z" />
        </g>
        <path className="rk-stroke rk-s-otoro-l" strokeWidth={1.4} d="M15 31q4-3 8-1M42 30q4-1.5 7 0M17 34q3-1 5-.5" />
        <circle className="rk-detail rk-f-gem" cx={32} cy={17.3} r={1.2} />
        <g className="rk-face">
          <g className="rk-eyes">
            <path className="rk-mouth" d="M27 27.5q1.5-2.2 3 0M34 27.5q1.5-2.2 3 0" />
          </g>
          <path className="rk-f-line" d="M30.6 29.4q1.4 2.8 2.8 0Z" />
          <Blush />
        </g>
        <g className="rk-detail rk-sparkles">
          <path className="rk-f-gold" d="M42 24.5l2.5-1 .5 2-2.2.8Z" />
          <path d="M14 16.5Q14 20 17.5 20Q14 20 14 23.5Q14 20 10.5 20Q14 20 14 16.5Z" />
          <path d="M50 15.5Q50 18 52.5 18Q50 18 50 20.5Q50 18 47.5 18Q50 18 50 15.5Z" />
          <path d="M49 44Q49 47 52 47Q49 47 49 50Q49 47 46 47Q49 47 49 44Z" />
        </g>
      </>
    ),
  },
};

export function RankIcon({ rank, size = 56, locked = false }: { rank: Rank; size?: BadgeSize; locked?: boolean }) {
  const { plate, art } = DRAWINGS[rank];
  return (
    <svg
      className={locked ? 'rank-badge is-locked' : 'rank-badge'}
      data-size={size}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <PlateLayer plate={plate} />
      {art}
    </svg>
  );
}
