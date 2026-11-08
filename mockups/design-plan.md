# Mockup design plan

_Redone 2026-11-07, then cut down to version one after the spec review (product-spec.md version 3)._

The app is called Nigiri. Phone only, 390px, checked at 360px. Built from [product-spec.md](../product-spec.md) §1 and §6, in direction B, Highlighter. Nothing on the version 1.1 list (§8) appears on these screens.

## Tokens (from product-brief.md)

**Colours changed 2026-11-08 (D39):** four themes the user picked, each a trio of background (60%), text (30%) and accent (10%). They replace Grape, row 103 and the navy; those values are in git. A theme is picked in Settings, and it replaces following the phone's light/dark setting.
- **Ink + Cobalt + Snow (default):** page `#F5F7FC`, ink `#17243C`, cobalt `#3158C9` with white text.
- **Plum + Berry + Mist:** page `#FAF7FB`, ink `#302039`, berry `#9C356B` with white text.
- **Espresso + Amber + Cream:** page `#FBF8F1`, ink `#33291F`, amber `#A45613` with white text.
- **Midnight + Ice + Sky:** page `#141B24`, ink `#F3F5F7`, sky `#8FB7FF` with dark text. Its sheet is `#1E2836`, with a hairline on the top edge.
- **The accent** draws the one filled button, the rated key, focus and the progress bar. **Done** is a highlighter in the accent's hue. Secondary text, rules and the sheet are tints of each trio. Every value is in product-brief.md.
- **Highlighters:** six colours (green, blue, pink, orange, yellow, purple), unchanged in every theme. You pick one for each deck. Each has a light highlight for marks and, in the light themes, a stronger pen tone for its swatch.
- **Settings → Theme:** four ruled rows, like home's deck list. Each has a 56×44 chip, a tiny Nigiri screen in its own theme (page, "Aa" in its ink, an accent pill), the user's name for it, and an ink check on the one in use. One tap repaints the app.
- **Type:** Bricolage Grotesque for headings and card text, Atkinson Hyperlegible Next for everything else. Sizes 34 / 28 / 24 / 20 / 17 / 15 / 13.

## Layout

One left-aligned column with 20px side margins. Lists are ruled rows, not boxes. The one primary button sits where the thumb is.

```
Home                         Add card (in a deck)          Add a test
Tuesday, Nov 10        [⚙]   Close     Add card            Cancel    Add a test
[ Review 18 cards ]          ▌US History unit 2            ▌US History unit 2
Decks         New deck       Front                         Test date  [Wed, Nov 11]
▌AP Bio unit 4      8 due    [                    ]        Minutes a day  (−) 15 (+)
 Test Friday                 Back                          ─────────────────────────
▌Gatsby vocab       4 due    [                    ]        ███It fits███
▌US History unit 2  6 due    Saved. US History has 36      35 cards × 20 s, 1 day left
─────────────────────────    [ Save card ]                 needs about 12 min. You have 15.
[ + Add card ]                                             [ Save test ]
```

## Principles

1. **The highlighter marks deck colours and what just changed or matters most.**
   - **The marks:** the count after you save a card ("36 cards") and the fit check's answer, both in the deck's colour, and "Done" in the theme's Done highlight. Since 2026-11-08 (D45), also the deck's name on Done when a test deck has every card studied, swiping after "Done". With readiness cut, these are the only highlighter marks.
   - **The accent is the pen you press with:** the one filled button, the key you just rated, focus, and the progress bar.
   - Nothing else is coloured.
2. **Input is never more than one tap away.** Add card sits in the bottom bar on home and on each deck.
3. **One primary button per screen**, named for exactly what it does. The confirmation reuses the button's verb: Save card, then "Saved".

## States added 2026-11-07 (chief-officer)

Every new state reuses a slot the screen already has, so nothing jumps when it changes.
- **Nothing due** (home and deck page): "Nothing due right now" takes the Review button's 50px slot, decks with nothing due show no count, and Add card becomes the filled button. It's an empty state that points at making cards.
- **No cards yet** (deck page): one line, "Add a card whenever something is worth remembering.", and Add card filled.
- **Rating hint:** "Forgot it? Tap Again. Right but slow? Hard." at 15px secondary, on the line above the keys. The keys don't move.
- **Waiting:** "Next card in 0:48" at hero size with tabular digits, one line of why, and an outlined **Done for now**. It's outlined because staying is the expected path, and filled "Back to home" on Done means the session is over.
- **Not saved:** the line above the main button turns to the error colour: "Not saved. Tap Save card again." or "Not saved. Tap your rating again." It doesn't apologise, and colour isn't the only signal.
- **Step 1 view:** `?step=1` (mockup.js) hides Settings and the test line, which arrive in steps 2 and 3.

Reviewed by ui-designer (Impeccable critique, ui-ux-pro-max checklist) and Impeccable's detector on 2026-11-07. The detector's one advisory, the 17/20/24px heading steps on home, predates these states and stays.

## States added 2026-11-08 (chief-officer, from ui-designer P-UI-8): how it feels

Each is one quiet line in existing tokens, so it works in all four themes. The principles are in UI-DESIGN-BRIEF.md, "How Nigiri should feel".
- **Home:** "About 6 minutes." and "Every rating saves, so you can stop anytime." at 15px secondary, 12px under the button. With `?back`: "Welcome back. The cards waiting longest come first." under the date.
- **Done:** "18 cards reviewed." at 17px under Done. With `?milestone`, the milestone sentence replaces it, balanced so the deck name isn't split.
- **Deck with a test:** three facts ("Test Friday, in 3 days", "30 of 35 studied", "5 not studied yet: 2 today, all by Thursday"), using the full width; Edit test shares only the first row. The head's counts line hides.
- **Add or Edit test:** the same plan line after the fit check's sentence, so "It fits" doesn't move (D36). At 360×640 it sits under the sticky Save test bar until you scroll.
- **Settings → How Nigiri picks your cards:** one ruled 56px row, last. The page (`how-it-works.html`) is for reading: a 38ch measure, ratings as a two-column list.
- **Rejected:** a progress ring or a big "30/35" for studied (it would read as readiness), a welcome-back banner or modal, confetti and badges.

## Review against the brief

- **No tab bar.** A pure flashcards app has one home, your decks. Settings is an icon on home.
- **No toasts.** A confirmation is a highlighter swipe over what changed.
- **Ruled rows rather than cards,** to avoid the rounded-card kit look.
- **Cut to version one after the spec review.** Removed import, the duplicate warning, undo, interval labels on the rating buttons, editing mid-review, readiness, the streak, the session summary, and the home-screen tip. Editing a card happens on the deck page.
