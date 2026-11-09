# Round 1: gamification iteration 1 + features Round A + ADV-1 fixes (UI-G1, accepted by chief 2026-11-09)

Source: ui-designer task UI-G1 (frontend-design two passes; Impeccable critique and pro-rules as checklists, degraded: no launcher). Rules: D73 (XP, levels), D74 (scope, Solid) in PROJECT-STATE.md. Chief's settlements at the end win.

**Conventions:** existing tokens only. `--tile-bg` = Surface in Snow/Mist/Cream, Page in Midnight (D51). `--shade` = `color-mix(in srgb, var(--ink) 35%, var(--tile-bg))`, written inside each component rule, never on `:root`. Easing = existing `--ease`. The global reduced-motion rule removes CSS animation; anything JS-driven checks `matchMedia('(prefers-reduced-motion: reduce)')` and renders the final state.

## Why the app feels empty (ranked) and the fix
1. Done is a word and a button (~600px blank) → streak moment, XP ledger, level-up line (§3).
2. Review: ~360px hole between card and keys; short answers at 17px read like footnotes → §8a, formatting (§7).
3. Deck rows only say "8 cards", "4 due" → New/Learning/Solid bar (§5).
4. Streak tile: ragged 20px grid, right two-thirds empty → You tile with rank, level bar, full-week calendar (§2).
5. First run and Add card are bare → Getting started tile (§8c), You tile at Level 1, "Added this time" list (§6).

## 1. Sushi rank icons (`RankIcon({ rank })`, decorative, `aria-hidden`)
Ink, not colour: deck colours belong to decks (D39e), accent means acting/progress. `<svg viewBox="0 0 48 48">`; strokes `var(--ink)`, width 2, round caps/joins, `vector-effect: non-scaling-stroke`. Fills: "rice" = `var(--tile-bg)`; "shade" = `--shade`; "nori" = `var(--ink)` no stroke. Draw in the order listed. Sizes: 48px (You tile, Progress), 64px (Done level-up only).

Shared nigiri base (Salmon, Tuna, Otoro), fill rice: `M11 37h26a4 4 0 0 0 4-4v-1c0-4-3-7-7-7H14c-4 0-7 3-7 7v1a4 4 0 0 0 4 4z`
1. **Rice:** ball `M12 38h24a5 5 0 0 0 5-5v-3c0-6-5-11-11-11H18c-6 0-11 5-11 11v3a5 5 0 0 0 5 5z` fill rice; grains stroke 1.5 `M15 26l2 1.5 M24 23l2-1 M32 27l-2 1.5 M19 32l2-1 M28 33l2 1`.
2. **Tamago:** base; block `rect x=7 y=14 w=34 h=11 rx=3` fill shade; layer lines stroke 1.25 `M10 18h28 M10 21.5h28`; nori band `rect x=21 y=12 w=6 h=26 rx=1` fill nori.
3. **Cucumber:** `circle 24,24 r16` fill nori; `circle r12` fill rice no stroke; `circle r5` fill shade stroke 1.5; seeds r1 at (22.5,22.5), (25.5,22.8), (24,25.8) fill ink; grains stroke 1.25 `M15 20l1.5 1 M31 28l1.5-1 M18 31l1.5 1`.
4. **Salmon:** base; drape `M5 27C8 18 16 14 25 15C34 16 41 19 43 24C43 27 40 28 37 27C30 25 20 25 12 28C9 29 5 30 5 27Z` fill shade; stripes stroke `var(--tile-bg)` 2.5 `M14 24l5-8 M22 24l5-8.5 M30 24l4-7.5`.
5. **Tuna:** base; topping `M6 25L9 16Q10 14 12 14L38 15Q40 15 41 17L42 24Q42 26 40 26L8 27Q6 27 6 25Z` fill shade.
6. **Otoro:** base; Salmon drape fill shade; marbling ink stroke 1.25 `M10 23Q16 19 22 22 M18 18Q25 15 30 19 M26 24Q32 20 39 22`.
7. **Master:** board `rect x=4 y=33 w=40 h=5 rx=1.5` fill shade; feet `M10 38v4 M38 38v4`; rice `rect x=7 y=26 w=16 h=7 rx=3.5` and `rect x=25 y=26 w=16 h=7 rx=3.5` fill rice; toppings `M6 26Q15 17 24 24Q15 27 6 26Z` and `M24 26Q33 17 42 24Q33 27 24 26Z` fill shade; right topping stripes stroke tile-bg `M30 24l2-3 M35 24l2-3`.

## 2. "You" tile on Today (replaces Streak; shows when ≥1 deck exists)
- Head row (flex, 12px gap): icon 48px; text block: `<h2>` rank name ("Tamago", Bricolage 24/700); `<p class="t-secondary">` "Level 5, 1,240 XP" (15px, `toLocaleString`). No "You" label, no middle dot.
- XP meter `.meter` (shared with §5), 12px below: 10px tall, radius 5, background `--tile-bg`, `box-shadow: inset 0 0 0 1.5px var(--progress)`; fill `--progress`, width = XP into level ÷ XP this level needs. `aria-hidden`.
- Next line, 15px ink-2, 8px below: "120 XP to level 6"; when the next level starts a new rank: "120 XP to Salmon"; Master continues "120 XP to level 20".
- 20px gap, streak: "12 days in a row" (Bricolage 20/600; "1 day in a row"); "Best: 20 days" (`.t-secondary`) when best ≥ 1. Streak 0: "Review a card to start a streak." (17px), Best still shown if any.
- Calendar, 16px below: this week + 3 previous, rows Mon–Sun. `display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:6px; max-width:20rem`. Header letters M T W T F S S (13px ink-2, centred). Cells `aspect-ratio:1; border-radius:6px`. Past no-review: `inset 0 0 0 1px var(--rule)`. Studied: heat-1/2/3 with 1.5px progress border. Later this week: `1px dashed var(--rule)`. Today: 2px ink outline offset 2px, empty until today has a review, then its heat fill (ring kept). Grid `aria-hidden`; sr-only "Studied on 9 of the last 22 days." (counts to today).
- "See progress" row link (48px, chevron), unchanged.
- Zero state: Rice, "Rice", "Level 1, 0 XP", empty meter with border, "100 XP to level 2", plus one 15px ink-2 line "Each card you write earns 15 XP.", then streak-0 line and calendar.

## 3. Done screen
- `.done .t-hero` margin-top `clamp(24px, 8dvh, 96px)`.
- (a) "Done" with highlighter (unchanged). (b) D45 line unchanged ("18 cards reviewed.", milestone or welcome back): the one celebration line.
- (c) Streak, 32px below: "13 days in a row." (17/600), then this week's strip (one row of §2's calendar, letters + 7 cells, max-width 20rem). If today had no review before this session, today's cell starts as an empty ring and fills at 560 ms after mount (`background-color` tile-bg → heat step, 240 ms); otherwise filled, no motion.
- (d) XP, 32px below, a ruled ledger reusing `.totals-list` rows: `<p class="xp-total">` "+230 XP" (Bricolage 28/700, tabular, left). `<dl>` with non-zero rows only, labels 15px ink, values 15/600 tabular right: "Cards reviewed" +180; "Cards written" +30; "Bonus: every waiting card reviewed" +20. Each row = that part's change between session start and end; total = sum = D73's change.
- (e) Level-up, only if the level changed in the session, 20px below: rank icon 64px + 17/600 text: "Up to level 6." or "Up to level 7: Salmon."
- Zero-XP session: no total, no rows; one 15px ink-2 line "No new XP: these cards already counted today." Streak block still shows.
- Motion (XP block ≤ 600 ms, starting at 600 ms): rows fade in 160 ms each, 80 ms apart; total counts 0→N over 480 ms (rAF, ease-out); width reserved with `min-width: <final length>ch`; visible digits `aria-hidden` with a sibling sr-only "+230 XP" present from the start. Back to home works any time; leaving cancels the frame. Reduced motion: final values at once.

## 4. Progress
First tile becomes §2's tile without calendar and without See progress; secondary line "Level 5, 1,240 XP". The old Streak tile merges into it.

## 5. Deck progress bar (New / Learning / Solid)
- Colours: Solid = `--progress`; Learning = heat-1 (progress 15% over `--tile-bg`; Midnight 20%); New = `--tile-bg`. The `.meter` capsule; segments left to right Solid, Learning, New, sized by count; each segment after the first has `border-left: 1.5px solid var(--progress)`. Interior always `--tile-bg`, never the wash.
- Deck rows (Today's Decks tile, Decks tab): under the sub line, meter 8px tall, radius 4, `width:min(100%,10rem)`, 6px top margin; row ≥72px; `aria-hidden` + `<span class="sr-only">, 4 solid, 3 learning, 1 new</span>`. No meter at 0 cards.
- Deck page cover: meter 12px tall, full width, 12px under the counts line (or under h1 while a test is set); legend `<p class="t-secondary">` 15px tabular "4 solid, 5 learning, 3 new" (zero parts omitted, fixed order).
- Solid per D74; Learning = reviewed, not solid; New = never reviewed.

## 6. Several cards in a row ("Added this time")
- DOM: fields, action zone (status + Save card, sticky as now), then `<section aria-labelledby>`. Hidden until the first save. No nested scroll, no cap.
- Header row: `<h2>` "Added this time" (17/600); right: "+45 XP" (15px ink-2 tabular, 15 × cards).
- Rows newest first, deck-page row style (front 17/600 clamped 2 lines, back 15 ink-2 clamped 1 line, chevron, ≥56px), with a 12px `--pen` square (radius 3) of the card's deck. Plain text (§7).
- Counts cards saved since this Add card screen mounted; not stored. New row: existing `pop` (200 ms) on insert only.
- After Save: focus to Front with `scrollIntoView({block:'nearest'})`. Tap a row → existing EditSheet; focus returns to the row on close; deleted card's row removed; edited row gets the highlighter.

## 7. Formatting
- Marks: newline = line break; `**text**` = bold (unclosed stays literal, no nesting); consecutive lines starting with exactly `- ` = one `<ul>`. No toolbar.
- Hint: one line under Back on Add card and in the edit sheet: "Use **bold**, or start a line with - for a list." (15px ink-2, asterisks visible), `aria-describedby` on Back.
- Pure `renderMarks(text): ReactNode[]` building `<strong>`, `<ul>/<li>`, `<br>`. **Never `dangerouslySetInnerHTML`.** Rendered on both sides on the Review card: `ul` padding-left 1.25em, disc, `li + li` margin-top 4px, `strong` 700 ink.
- `plainMarks()` for clamped places (deck-page rows, Added list, anywhere one line is shown): removes `**` pairs, drops a leading `- `, newlines → space. Edit sheet shows raw marks.

## 8. ADV-1 fixes
- **a. Short answers:** if `plainMarks(back).length ≤ 80` and no line break or list: `.answer.is-short { font-size:22px; line-height:1.35; font-weight:500 }`. `.card-stack { padding-top: clamp(16px, 6dvh, 56px) }`. Keys don't move.
- **b. Desktop Today:** hide the sidebar's Review button on `/`. Sidebar keeps Add card.
- **c. Getting started tile:** `<h2 class="tile-title">Getting started</h2>` + `<ol>`; steps ≥48px; marker 24px circle: done = `--ink` fill with a `--tile-bg` check (stroke 2.4) + sr "done"; not done = 1.5px ink-2 ring with its number (13px). Step text 17px ink, no strike-through. Steps: 1 "Make a deck" (decks ≥ 1); 2 "Write a few cards" (cards ≥ 3; at 1–2 a 15px ink-2 sub line "2 written so far"); 3 see settlement 1. Not links. Gone after the first review ever.

## 9. Today bento
- Phone order: Study, Tests, Getting started (first run), You, Last 7 days, Decks.
- Desktop: rail 1 Study, Tests, Decks; rail 2 Getting started (first run), You, Last 7 days. First run with no deck: Study, then Getting started (rail 2 on desktop).
- E1 unchanged: Study tile first and unchanged.

## Chief's settlements (2026-11-09, D75)
1. Step 3 reads **"Review your cards"**; it ticks after the first review, at which point the tile disappears anyway, so it is never shown ticked.
2. Marks render on both sides of the card; the hint sits only under Back (and in the edit sheet under Back).
3. Keep "+45 XP" on the Added list: it rewards writing, the core action.
4. Keep "1 day in a row".

## Pass 2 changes (UI-CRIT-6 and chief, 2026-11-09, D76–D77). These win over §1–§9 where they differ.
- **R1 Bold in the question:** `.t-card strong, .t-card .marks strong { font-weight: 800; }` (Bricolage variable reaches 800). No highlighter on bold.
- **R2 Done's strip = the last 7 local days ending today** (today−6 … today, today last), each with its own weekday initial; no dashed later cells on Done; sr "Studied on N of the last 7 days." Today's and Progress's Mon–Sun calendars unchanged. Replaces §3(c)'s calendar-week strip.
- **R3 Done: "This session" + "Next".** After the level-up line (or the XP block / zero-XP line), 32px below: `<h2>` "This session" (17/600); a `.totals-list` with one row per deck reviewed this session, highest count first, ties alphabetical: 12×12 `--pen` square (radius 3) + 12px gap + deck name 15px ink clamped to 1 line; right "5 cards"/"1 card" 15/600 tabular; rows ≥44px, not tappable. 20px below, one 17px ink-2 line counting the cards whose next due falls on the first day after today with any due: "Next: 14 cards tomorrow." / "Next: 6 cards on Thursday." (weekday within 6 days, else "on Nov 20") / "Next: 1 card tomorrow." Omit the line if nothing is due later. No motion. Content bottom padding ≥ button height + 16px so nothing hides under Back to home at 360×640.
- **C1 Settings in tiles:** no "Home" back link where tabs or the sidebar show; title "Settings" styled like "Progress"; three tiles, 16px apart: Backup (title, lines, Export backup stays the one filled button, Restore and its line), Theme (rows unchanged), and a tile holding the 48px "How Nigiri picks your cards" row with chevron. Desktop 35rem column. D64's line positions under their own buttons stay.
- **C2 New deck preview:** 32px under the swatches, label "In your deck list" (15/600), then a tile with a Decks-tab-style row: deck-colour bar (before a colour, a 1.5px `--rule` outline bar), name 17/600 ink ("Your deck" in ink-2 before typing), "0 cards" 15px ink-2; no meter, no chevron; `aria-hidden`; updates live, no animation. Swatch hit areas ≥ 48×48.
- **C3 Progress desktop rails (≥64em):** DOM and phone order You, Days studied, Since you started, Last 7 days; rail 1 You + Days studied, rail 2 Since you started + Last 7 days; content sets heights.
- **O1 Midnight empty calendar cells:** `inset 0 0 0 1px color-mix(in srgb, var(--ink) 22%, var(--tile-bg))` (dashed the same for later cells), in component rules, all themes or Midnight only as needed for visibility.
- **O2 Decks tab rows:** sub line "12 cards: 4 solid, 3 new" (non-zero parts, order solid, learning, new; wraps). Today's Decks tile unchanged.
- **O3 Save test** full column width like other forms' main buttons.
- **Practice round (D77):** on the deck page, a 48px row link "Practice all 12 cards" with chevron under the test row (shown when the deck has ≥1 card). Route `#/deck/:id/practice`. Every card in the deck, shuffled once at the start. Same Review layout and card (band, stack, marks, short answers); session bar "Practice, 4 left" with ✕ back to the deck page. Show answer, then **Next card** in the same spot (same filled style as Show answer, same 400 ms guard); no rating keys, no hint line, no return times. Writes nothing: no review, no card change, no XP, no streak, no draft. Done: "Practice done." and "12 cards. Nothing was rescheduled." with **Back to deck** filled; no XP or streak block. No tab bar or sidebar (like Review).
