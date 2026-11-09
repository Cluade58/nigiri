# Sushi rank badges: design plan (ui-designer, 2026-11-09)

The user approved all three of ui-designer's recommendations on 2026-11-09 ("Yes, use all three"):
- **Art:** hand-written inline SVG, drawn by the agents. No Gemini.
- **Curve:** the gentler XP curve below.
- **Top rank:** Omakase.

The user's original ask: "For eah level, tel the ui designer to find a skill to generate pictures of otoro rice and the levels, make it prety cute and gamified. Use better levels also. More cool sushi maybe".

## XP curve and ranks (changes `src/lib/xp.ts`)

- `needFor(L) = 100 + 40 × (L − 1)`. Total XP to reach level L is `100(L−1) + 20(L−1)(L−2)`.
- `RANK_STARTS = [1, 3, 6, 9, 12, 16, 20, 25, 31, 38]`.
- `rankOf` uses `RANK_STARTS`. `nextLine` needs no change.
- The XP amounts stay the same, and D73's rule holds: the rating never changes XP. learning-specialist should confirm the curve.

| # | Rank | Levels | XP to reach | Day reached (135 XP/day, illustrative; LS-5 ceil: 0, 2, 7, 15, 25, 43, 65, 100, 152, 225) | Flavour line |
|---|---|---|---|---|---|
| 1 | Rice Grain | 1–2 | 0 | 0 | Every chef starts with one grain. |
| 2 | Cucumber Roll | 3–5 | 240 | 2 | Small, crisp, and rolled tight. |
| 3 | Tamago | 6–8 | 900 | 7 | You've earned your first nori belt. |
| 4 | Sweet Shrimp | 9–11 | 1,920 | 14 | Tail up. You're getting the hang of it. |
| 5 | Salmon | 12–15 | 3,300 | 24 | The one everybody orders. |
| 6 | Yellowtail | 16–19 | 5,700 | 42 | Smooth, cool, a little fancy. |
| 7 | Ikura | 20–24 | 8,740 | 65 | Every card a little jewel. |
| 8 | Chutoro | 25–30 | 13,440 | 100 | Marbled. Halfway to legend. |
| 9 | Otoro | 31–37 | 20,400 | 151 | Melts in your mouth. Rare air. |
| 10 | Omakase | 38+ | 30,340 | 225 | The chef trusts you with anything. |

XP can go down when cards are deleted. Show only the current rank, never "lost a rank".

## Art direction: kawaii sushi stickers

- **Four layers** in each round sticker: the dark nori outline, a white die-cut border (r30), a plate disc (r25.5), and one sushi piece with a face.
- **Faces** get happier with each rank:
  - **Eyes:** dark ovals with a white glint.
  - **Mouth:** small.
  - **Blush:** pink, hidden at 32px.
- **Strokes:** 2 units for the sticker edge and 1.5 for the food, in a 64×64 viewBox.
- **Colours:** at most 4 food colours, plus the outline, white and blush.
- **Plate tiers:**
  - ranks 1–3: ceramic `#F1ECE2`
  - ranks 4–6: wood `#E6C796` with grain lines
  - ranks 7–9: black lacquer `#2B2530` with a `#B8323A` inner ring
  - rank 10: gold `#F6D27A` with a dotted `#C98F1B` ring
- **The same fixed sticker in every theme.** The dark outline carries the edge on light themes, and the white die-cut carries it on Midnight.
- **New colours** live only in fixed `--rk-*` tokens and are used nowhere else. They never use the theme accent, and never sit in a deck-colour slot (ranks are round stickers with faces, while deck colours are flat swatches).
- **Badges are `aria-hidden`**, and the rank name is always shown next to them.
- **No sunburst or rays** behind the top rank: they read as the Rising Sun flag.

**Locked ranks:** the same SVG with class `is-locked`. Face and details are hidden. Fills are `color-mix(in srgb, var(--ink) 10%, var(--page))` and strokes are `color-mix(in srgb, var(--ink) 50%, var(--page))`, which is about 3.1:1 on Snow and 4.8:1 on Midnight.

**Sizes:**
- 32px in the desktop sidebar, with `.rk-detail` hidden.
- 56px on the You tile.
- 120px for the rank-up on Done.

These replace today's 48 and 64.

## Spec for each rank

Each badge's parts go in four groups: `.rk-plate`, `.rk-food`, `.rk-face` and `.rk-detail`.

1. **Rice Grain** (ceramic): one plump upright grain as the face. Sleepy closed-arc eyes and a tiny "o" mouth. Detail: a small steam curl.
2. **Cucumber Roll** (ceramic): kappa maki seen from above, with a nori ring, white rice and a green centre (`#7DBF5A` / `#3F7D3A`). Dot eyes and a smile on the rice. Detail: three seed freckles.
3. **Tamago** (ceramic): a yellow egg block (`#FFD45C`, layer lines `#E9A93A`) on rice, with a nori belt. Happy "^ ^" eyes. Detail: a little knot on the belt.
4. **Sweet Shrimp** (wood): an orange shrimp (`#FF8A5C`, stripes `#FFE1D3`) over rice, tail flicked up. Big open eyes. Detail: the tail fan is `#E8573C`.
5. **Salmon** (wood): a salmon slice (`#FF8C69`) with pale fat stripes. Confident smile and blush. Detail: a shiso leaf. See the sample.
6. **Yellowtail** (wood): a cream slice (`#F7E3C8`) with a pink edge (`#F2A7A0`). Winks with one eye. Detail: three green scallion dots.
7. **Ikura** (lacquer): a gunkan piled with glossy orange pearls (`#FF6A2B`), each with a white glint. White eyes on the nori band, excited open mouth. Detail: a sparkle on one pearl.
8. **Chutoro** (lacquer): a pink-red tuna slice (`#F07A86`) with marbling (`#FFD1D6`). Determined eyebrows. Detail: one gold-leaf fleck.
9. **Otoro** (lacquer): a pale pink slice (`#F7A6B4`), heavily marbled and drooping as if melting. Blissful eyes and an open happy mouth. Detail: two sparkles and gold leaf.
10. **Omakase** (gold): the otoro piece, blissful, wearing a small gold crown with a red gem. Detail: three white sparkles. See the sample.

## Shared CSS

```css
:root{--rk-line:#2B2530;--rk-rice:#FFFBF2;--rk-blush:#FF9BB0;--rk-gold:#F6D27A;--rk-gold-d:#C98F1B}
.rank-badge{display:block;flex:none}
.rank-badge *{stroke-linecap:round;stroke-linejoin:round}
.rk-cut{fill:#fff;stroke:var(--rk-line);stroke-width:2}
.rk-disc{stroke:var(--rk-line);stroke-width:1.5}
.rk-food>*{stroke:var(--rk-line);stroke-width:1.5}
.rk-eye{fill:var(--rk-line)} .rk-shine{fill:#fff}
.rk-mouth{fill:none;stroke:var(--rk-line);stroke-width:1.4}
.rk-blush{fill:var(--rk-blush);opacity:.8}
.rk-stroke{fill:none}
.rank-badge[data-size="32"] .rk-detail{display:none}
.rank-badge.is-locked :is(.rk-face,.rk-detail,.rk-stroke){display:none}
.rank-badge.is-locked :is(.rk-plate,.rk-food)>*{fill:color-mix(in srgb,var(--ink) 10%,var(--page));stroke:color-mix(in srgb,var(--ink) 50%,var(--page))}
```

In React, move each inline `style=` colour into a class, following the existing `.ri-*` pattern in `RankIcon.tsx`.

## Sample 1: Salmon (rank 5)

```html
<svg class="rank-badge" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" focusable="false">
  <g class="rk-plate">
    <circle class="rk-cut" cx="32" cy="32" r="30"/>
    <circle class="rk-disc" cx="32" cy="32" r="25.5" style="fill:#E6C796"/>
  </g>
  <g class="rk-detail"><path class="rk-stroke" style="stroke:#C9A36B;stroke-width:1.5" d="M14 22q7-3 14 0M38 52q6 1 11-2"/></g>
  <g class="rk-food">
    <path style="fill:var(--rk-rice)" d="M17 38C17 34.5 19.5 33 23 33H41C44.5 33 47 34.5 47 38V40C47 42.5 45 44.5 42.5 44.5H21.5C19 44.5 17 42.5 17 40Z"/>
    <path style="fill:#FF8C69" d="M11 34C13 25 22 20 32 21C42 22 50 26 53 31C54 34 51 35 48 34C40 32 26 32 18 35C15 36 11 37 11 34Z"/>
  </g>
  <path class="rk-stroke" style="stroke:#FFE0D2;stroke-width:2.2" d="M15 32L19 26M20 30.5L24 24.5M44 31L47 26M48 32.5L50.5 28.5"/>
  <g class="rk-face">
    <ellipse class="rk-eye" cx="28" cy="27" rx="1.6" ry="2"/><circle class="rk-shine" cx="28.5" cy="26.3" r=".6"/>
    <ellipse class="rk-eye" cx="36" cy="27" rx="1.6" ry="2"/><circle class="rk-shine" cx="36.5" cy="26.3" r=".6"/>
    <path class="rk-mouth" d="M30.5 29.5q1.5 1.6 3 0"/>
    <g class="rk-detail"><ellipse class="rk-blush" cx="24.5" cy="29.5" rx="2.2" ry="1.2"/><ellipse class="rk-blush" cx="39.5" cy="29.5" rx="2.2" ry="1.2"/></g>
  </g>
  <g class="rk-detail">
    <path style="fill:#7DBF5A;stroke:var(--rk-line);stroke-width:1.2" d="M41 47C44 43.5 50 43.5 51 46C49 49 44 49.5 41 47Z"/>
    <path class="rk-stroke" style="stroke:#3F7D3A;stroke-width:1" d="M42.5 47L49 46"/>
  </g>
</svg>
```

## Sample 2: Omakase (rank 10)

```html
<svg class="rank-badge" viewBox="0 0 64 64" width="120" height="120" aria-hidden="true" focusable="false">
  <g class="rk-plate">
    <circle class="rk-cut" cx="32" cy="32" r="30"/>
    <circle class="rk-disc" cx="32" cy="32" r="25.5" style="fill:var(--rk-gold)"/>
  </g>
  <circle class="rk-detail rk-stroke" cx="32" cy="32" r="22" style="stroke:var(--rk-gold-d);stroke-width:1.5;stroke-dasharray:.1 3.4"/>
  <g class="rk-food">
    <path style="fill:var(--rk-rice)" d="M17 38C17 34.5 19.5 33 23 33H41C44.5 33 47 34.5 47 38V40C47 42.5 45 44.5 42.5 44.5H21.5C19 44.5 17 42.5 17 40Z"/>
    <path style="fill:#F7A6B4" d="M11 34C13 25 22 20 32 21C42 22 50 26 53 31C54 34 51 35 48 34C40 32 26 32 18 35C15 36 11 37 11 34Z"/>
    <path style="fill:var(--rk-gold)" d="M26 20.5L25 13.5L29 16.5L32 11.5L35 16.5L39 13.5L38 20.5Z"/>
  </g>
  <path class="rk-stroke" style="stroke:#FFE6EA;stroke-width:1.4" d="M15 31q4-3 8-1M42 30q4-1.5 7 0M17 34q3-1 5-.5"/>
  <circle class="rk-detail" cx="32" cy="17.3" r="1.2" style="fill:#E5484D"/>
  <g class="rk-face">
    <path class="rk-mouth" d="M27 27.5q1.5-2.2 3 0M34 27.5q1.5-2.2 3 0"/>
    <path style="fill:var(--rk-line)" d="M30.6 29.4q1.4 2.8 2.8 0Z"/>
    <g class="rk-detail"><ellipse class="rk-blush" cx="24.5" cy="29.5" rx="2.2" ry="1.2"/><ellipse class="rk-blush" cx="39.5" cy="29.5" rx="2.2" ry="1.2"/></g>
  </g>
  <g class="rk-detail" style="fill:#fff;stroke:var(--rk-line);stroke-width:1">
    <path d="M42 24.5l2.5-1 .5 2-2.2.8Z" style="fill:var(--rk-gold)"/>
    <path d="M14 16.5Q14 20 17.5 20Q14 20 14 23.5Q14 20 10.5 20Q14 20 14 16.5Z"/>
    <path d="M50 15.5Q50 18 52.5 18Q50 18 50 20.5Q50 18 47.5 18Q50 18 50 15.5Z"/>
    <path d="M49 44Q49 47 52 47Q49 47 49 50Q49 47 46 47Q49 47 49 44Z"/>
  </g>
</svg>
```

## The rank-up moment on Done

- **When:** only when the rank changes, about 10 times a year. Ordinary level-ups keep today's one line.
- **Layout:** a centred block right after the +XP total:
  - the 120px badge
  - the rank name, at the XP total's size
  - "Level N" and the flavour line, in secondary text
- **No extra tap:** "Back to home" stays the one filled button. This contradicts gamification-plan.md's "One tap to continue", so chief settles it. Designer recommends no tap.
- **Motion** (about 0.9s, after the XP count-up):
  1. **Plop (0–320ms):** the badge drops 16px and squashes on landing (scale 1.06 by 0.92), easing `cubic-bezier(.175,.885,.32,1.275)`.
  2. **Sparkles (320–500ms):** three sparkles appear 60ms apart, then fade by 1.2s.
  3. **Blink (at 1.4s):** one blink. Nothing loops, there's no confetti, sound or rays, and only transform and opacity animate.
- **Reduced motion:** the final state appears at once.
- **Screen readers:** one polite line, "New rank: Salmon. Level 12."

## Checks for the build

1. At 390×844 with a rank-up, the badge, name and "Back to home" all fit without scrolling.
2. At 32, 56 and 120px, in Snow and Midnight:
   - the sticker edge is visible
   - at 32px, plate, food and eyes show, with no blush or sparkles
   - the locked outline is at least 3:1
3. No badge uses the theme accent or sits in a deck-colour slot, in all four themes.

## Chief's settlements (2026-11-09, D80–D81)
- **No tap** for the rank-up; Back to home stays the one filled button.
- **Rank ladder on Progress:** a "Ranks" tile listing all ten in order, each row a 56px badge, the rank name and "Level N" (its start level). Reached ranks in full; the current one adds "You're here" (15px ink, 600); unreached ranks use `is-locked`, with their name and level still shown in ink-2. No accent. Phone: one column of rows (≥56px); desktop: two columns inside the tile. sr text per row: "Salmon, level 12, reached" / "current rank" / "not yet".
- **Sidebar (≥64em):** a 32px badge with the rank name and "Level N" under the wordmark, linking to Progress (≥48px row).
- **Rank-up on Add card:** when this visit crosses a rank, the "Added this time" header gets the 56px badge and "New rank: Cucumber Roll." (plop only; reduced motion: none; polite sr line).
- **Two ranks in one session:** show only the final rank.
- **Seed:** add a seed whose Done crosses a rank boundary (e.g. ending 1–60 XP below 900 before the session).
