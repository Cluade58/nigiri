# Card as hero: design plan (UI-HERO-1, accepted by chief 2026-11-08)

Source: ui-designer, task UI-HERO-1 (frontend-design two passes; Impeccable critique heuristics and ui-ux-pro-max pro-rules as checklists; no render yet). Decisions behind it: D65–D70 in PROJECT-STATE.md. **Chief's settlements are at the end and win over anything above them.**

## 0. Direction: the index card on the desk
- The hero is the Review card: ink border like the keys, top strip in the deck's highlighter, on a small pile that shrinks.
- Everything else stays quiet: Today gets one big number, Progress a real calendar, the deck page a coloured cover.
- Accent only where it was: the filled button, the rated key, focus, progress. Calendar and bars use the progress role's tints.
- Type: Bricolage Grotesque for headings and **all big numbers** (plain zero). Atkinson Hyperlegible Next for body. Scale 13/15/17/20/24/28/34 plus the focal 64/88.

**Derived supporting values** (recorded in product-brief.md):

| Name | Snow / Mist / Cream | Midnight |
|---|---|---|
| tile background | `--surface` | `--page` (D51) |
| deck wash | `color-mix(in srgb, var(--hl) 40%, var(--page))` | same at 18% |
| bars | `color-mix(in srgb, var(--progress) 80%, <tile bg>)` | same |
| heat-1 / heat-2 / heat-3 | progress 15% / 40% / 100% over tile bg | 20% / 45% / 100% |

**Builder trap:** don't declare these as `:root` custom properties built from `var(--hl)` (it resolves at `:root`, so every deck gets `:root`'s colour). Write `color-mix()` in each component rule; per-theme percentages may be variables (`--wash-amt`, `--heat-1-amt`).

Motion: existing curve `cubic-bezier(.3,.7,.2,1)`; durations 150/200/220/240 ms. The global reduced-motion rule removes all of them.

## 1. Review card
Top to bottom: session bar (✕, "12 left") unchanged; progress line unchanged; `.card-stack` wrapper (flex 1, min-height 0, bottom padding 14px); the card `article.rcard`; action zone (hint line and keys) unchanged in place.
- **Card:** Surface fill, 1.5px `--ink` border, 16px radius, `overflow: hidden`, flex column.
- **Band:** min-height 40px, padding 0 20px, background `color-mix(in srgb, var(--hl) calc(var(--hl-alpha)*100%), var(--surface))`. Deck name in it, 15px/600 `--mark-ink`, wraps. This replaces the `.context` line.
- **Body:** `overflow-y: auto`, `overscroll-behavior: contain`, padding 20px (32px from 48em). Question (`.t-card` 28px, 22px when long), then the 1.5px ink rule, then the answer (17px, max 60ch).
- **Stack** (`aria-hidden`): up to 2 layers, Surface fill, 1px `--ink-2` border, 16px radius. Layer 1 inset 10px each side, 7px below; layer 2 inset 20px, 14px below. Cards left including this one: ≥3 → 2 layers, 2 → 1, 1 → 0. A layer leaving fades out over 150 ms.
- **Motion, no flip** (it hides the question). New card arrives: from `translateY(12px) scale(.98)`, opacity 0, to rest, 220 ms. Show answer: the ink rule draws left to right (`scaleX` 0→1, origin left, 240 ms); the answer fades/slides from `translateY(6px)` in 200 ms, 60 ms behind. Total 260 ms, under the 400 ms tap guard. Transform and opacity only.
- **Long cards:** on phones `.session` is `height: 100dvh` (not min-height), so the page never scrolls and keys can't move. From 48em `height: min(100dvh, 48rem)`. Only the card body scrolls. On reveal, if the rule is below the visible body, scroll the body so the rule sits 24px from its top (smooth unless reduced motion). When the body overflows: `tabIndex=0`, `aria-label="Card"`. The answer still takes focus with `preventScroll`.
- **Midnight:** card `--surface` #1E2836 with the 1.5px ink border; band = highlight at 85% over surface with `--mark-ink` text; layers Surface with 1px `--ink-2`.
- Wait state and Done unchanged.

## 2. Return times on the keys
- Inside each key (64px min-height, unchanged): label 17px/600, 2px gap, time 15px/400 `--ink-2`, `tabular-nums`, `text-wrap: balance`. The time may wrap to two lines at 320px; the key never grows past 64px.
- Rated key: both lines `--primary-fg`, full opacity. Disabled keys: existing opacity .4.
- Accessible name from real text: `<span class="k-label">Good</span><span class="sr-only">, back in </span><span class="k-time">5 days</span>` → "Good, back in 5 days".
- Recompute at reveal and on the existing minute tick (and when the app comes back on screen), no layout shift. A failed preview renders no time span; label stays centred, height 64px.
- Hint line stays one line.

## 3. Deck colour as identity
**Deck page cover:** phone: full-bleed band from the top edge holding the back link row, h1 deck name (`.t-hero` 34px) and counts line (`.t-secondary`); background deck wash; padding 0 20px 24px; straight bottom edge; the 6px header swatch is removed. From 48em: a 16px-radius panel at the top of the 45rem column. Review and below sit on the page.

**Add card deck chips** (replacing the `<select>`):
- `<fieldset>` + `<legend>Deck</legend>` (15px/600). Each chip is `<label class="chip">` with a visually hidden native `<input type="radio" name="deck">` (one tab stop, arrow keys). `display: flex; flex-wrap: wrap; gap: 8px`. Never sideways scroll.
- Chip: min-height 48px, padding 0 16px 0 12px, radius 12px; 1.5px `--ink-2` border, page fill; 6×20px pen swatch, then the name 17px/600 ink; long names wrap (`overflow-wrap: anywhere`).
- Selected (never the accent): highlight fill (`--hl` at `--hl-alpha`), `--mark-ink` text, 2px `--pen` border, swatch becomes a 16px `--mark-ink` check (stroke 2.4).
- Focus: 2px `--ring`, offset 2px, via `.chip:has(input:focus-visible)`.
- 1 deck: one chip, not stretched. 12 decks: ~4 rows at 390px, acceptable.
- Order: `orderDecks`. **Nothing pre-selected.**
- Tap (`click` with `detail > 0`): select, then focus Front and scroll it into view (`block: 'nearest'`). Arrow keys: select only, focus stays; Tab moves to Front. Enter on a chip moves to Front (preventDefault). Draft rule unchanged.
- Arrival from Today: focus the first radio (no keyboard pops up).
- Error: submit with no deck → `<p class="field-error" id="deck-error">Choose a deck first</p>` under the chips, `aria-describedby` on the fieldset, chip borders `--error`, focus the first radio; clears when a deck is picked.

## 4. Today bento
Tiles as D51 (Surface, 1px Rules border, 16px radius, no shadow; Midnight page fill).
- **DOM order = phone order.** Rail 1: Study, Tests (as now), Decks. Rail 2: Streak, Last 7 days. From 48em rail 1 left, rail 2 right.
- **Study:** h1 date (24px; 34px from 64em); welcome-back line if shown; focal count `<p class="due-focus"><span class="num">18</span> cards due</p>` (`.num` Bricolage 700, 64px phone / 88px from 64em, line-height .9, letter-spacing -0.02em, tabular; "cards due" 17px/600 on the same baseline, 10px gap; singular "1 card due"; 16px above). Filled **Review 18 cards** 20px below (unchanged). Lead note unchanged ("About 6 minutes." / "Every rating saves, so you can stop anytime."). **Add card** outlined, full width, 20px below (moves here from the old phone bar); dropped from the tile from 64em (sidebar has it).
  - Nothing due: no big number; "Nothing due right now", the next-due line, **Add card** filled.
  - First run: "Make your first deck" and **New deck** filled inside the tile; Streak, Last 7 days and Decks hidden.
- **Streak tile** (merges streak and calendar preview): "Streak" (`.tile-title`); `<p class="t-hero">12 days in a row</p>` (34px Bricolage; "1 day in a row"); "Best: 20 days" (`.t-secondary`) when best ≥ 1. Streak 0: "Review a card to start a streak." at 17px, Best still shown if it exists. Mini calendar: last 4 weeks, 7 columns, 20px cells, 5px radius, 4px gaps, no numbers, same colour steps as Progress, today a 2px ink ring offset 2px; `aria-hidden` with sr-only "Studied on 9 of the last 28 days." Then a 48px `.row-link` "See progress" with chevron → `/progress`.
- **Last 7 days:** title, one 17px line "84 cards reviewed, 12 added" (zero part hidden). Chart: 7 columns, 64px tall (88px from 64em); bar 60% of column, radius 4px 4px 0 0, bars colour; height scaled to the week's max; non-zero ≥ 3px; zero day = no bar, only the 1px Rules baseline; count above each non-zero bar (13px ink, tabular); day labels below 13px `--ink-2` ("Mon"), today's label "Today" 600 ink. Chart `aria-hidden`, sr-only list "Monday: 12 cards reviewed" … "Today: none". Tile hidden when both totals are 0.
- **Widths:** phone 12px gutter, 12px gaps. 48em: `1fr 1fr`, 20px gap, 32px padding, tab bar on. 64em+: content starts at the 16rem sidebar's edge, inner max-width 56rem centred in the rest, rails `7fr 5fr`, tile padding 32px.
- **E1 at 360×640** (welcome on, worst case): ~359px of content vs 576px visible above the tab bar.

## 5. Navigation (D68)
**Tab bar (under 64em):** `<nav aria-label="Main">`, fixed bottom, Page fill, 1px Rules top border, height 64px + `env(safe-area-inset-bottom)`, four equal columns. Each tab a link ≥64px tall: 24px icon (stroke 1.8, existing family), 2px gap, label 15px. Rest: `--ink-2`, 400. Current: `aria-current="page"`, ink icon (stroke 2.2), label 600 ink, a 3×32px ink bar centred on the top edge (radius 0 0 3px 3px). Never the accent. Pressed: Rules fill. Focus: 2px ring offset -4px. Icons: Today sun, Decks two stacked cards, Progress three bars, Settings the existing gear.
- Shown on Today, Decks, Progress, Settings, deck page (Decks current). Hidden on Review, Done, Add card, New deck, test screen, storage, crash.
- Content bottom padding `calc(64px + env(safe-area-inset-bottom) + 32px)` and matching `scroll-padding-bottom`.
- The old `.bar` with Add card is removed from Today and the deck page. The gear in Today's header goes; the wordmark stays.

**Sidebar (64em+):** `<nav aria-label="Main">`, fixed left, 16rem, full height, Page fill, 1px Rules right border, 24px padding. Top to bottom: "Nigiri" wordmark (Bricolage 24/700, 64px row); four rows ≥48px (20px icon, 17px label; current 600 with a 3px ink bar on its left edge); 24px gap, outlined **Review N cards** only when N > 0; 12px gap, outlined **Add card** (with no decks, outlined **New deck** instead); 32px gap, a row "Decks" (15px/600) with a 48×48 "+" (`aria-label="New deck"`); deck rows ≥48px with a 12×12 `--pen` square (radius 3) and the name 15px/500, no counts, current deck `aria-current`. The deck list scrolls inside the sidebar. Hidden on Review and Done only.

**Decks tab (`/decks`):** `.top` with h1 "Decks" (24px) and compact outlined **New deck** on the right; the existing 72px deck rows; no filled button while decks exist; with none, "Make your first deck" and **New deck** filled. Desktop 45rem column.

## 6. Progress (`/progress`)
h1 "Progress" (24px). Phone: single column of tiles. No filled button.
1. **Streak tile:** same text as Today's, without the mini calendar.
2. **"Days studied" calendar:** rolling last 8 weeks, weeks as rows, weekday columns starting Monday; header row of weekday letters (13px `--ink-2`); 32px left gutter with the month name ("Nov", 13px) on the row containing the 1st; cells `1fr` squares, max 40px, radius 8px, 6px gaps; date numbers 13px; future days blank; local days (D58).

| Cards reviewed | Fill | Date number | Border |
|---|---|---|---|
| 0 | none | 13px `--ink-2` | none |
| 1–9 | heat-1 | ink | 1.5px `--progress` |
| 10–29 | heat-2 | ink | 1.5px `--progress` |
| 30+ | heat-3 (the accent) | `--primary-fg` | 1.5px `--progress` |

   Today: 2px ink ring offset 2px, date 700. A real `<table>`: sr-only caption "Days studied, last 8 weeks"; `<th>` with `abbr` full names; each `<td>` sr text "12 November, 24 cards" / "12 November, none" / "today, 12 November, 3 cards". One line under: "Studied on 18 of the last 56 days." Empty: all cells empty, today ringed, "Days you review cards fill in here." instead.
3. **Last 7 days:** same tile as Today.
4. **"Since you started":** three ruled rows, label left, number right (17px/600, tabular): Days studied, Cards reviewed, Cards made.
Desktop: 45rem column; from 48em Streak and Totals side by side; calendar and bars full width.

## 7. Deck page
Cover as §3. Back link "Back" with the back icon (see settlement 3). Lead: filled **Review N cards**, then **Add card** outlined (12px gap, stacked on phones, side by side from 48em). Nothing due: "Nothing due right now" and **Add card** filled. Card rows: front 17px/600 clamped to 2 lines over the answer 15px `--ink-2` clamped to 1 line; chevron stays; min-height 56px.

## 8. Contrast (designer's hand calculation, WCAG 2.x; QA confirms on the render)
- Deck wash, worst case `--ink-2` on wash: Snow pink 5.18, Mist pink 5.21, Cream pink 5.19, Midnight yellow 5.31. Ink on wash ≥ 6.78. Focus ring on worst wash ≥ 3.85.
- Key times: ink-2 on page 6.80 / 6.85 / 6.80 / 8.56; rated `--primary-fg` on accent 6.23 / 6.70 / 5.36 / 8.57.
- Bars vs tile bg: Snow 4.10, Mist 4.40, Cream 3.65, Midnight 5.93.
- Calendar: heat-2 ink text 8.22 / 7.72 / 7.87 / 5.72; heat-3 `--primary-fg` 6.23 / 6.70 / 5.36 / 8.57; studied border ≥ 5.36.

## Chief's settlements (2026-11-08, D70)
1. **Pre-selecting the last deck: not built** (undecided, the user's; spec §1). Chips start with nothing picked, also with one deck.
2. **Weeks start on Monday,** fixed, on the calendar. The 7-day bars are the last seven days ending today.
3. **Deck page back:** "Back", through history when the previous entry is in the app, otherwise to `/decks`.
4. **Year labels are whole years** ("1 year", "2 years"), per LS-3, not "1.2 years". Labels exactly as D69(2).
5. The derived values above are recorded in product-brief.md as supporting tokens.
