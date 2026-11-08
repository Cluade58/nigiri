# Mockup design plan

_Redone 2026-11-07, then cut down to version one after the spec review (product-spec.md version 3)._

The app is called Nigiri. Phone only, 390px, checked at 360px. Built from [product-spec.md](../product-spec.md) §1 and §6, in direction B, Highlighter. Nothing on the version 1.1 list (§8) appears on these screens.

## Tokens (from product-brief.md)

**Colours changed 2026-11-08** to ui-ux-pro-max's row 103, "Flashcard & Study Tool". The user asked for the skills' colour trios. Then the user turned down the row's slate ink ("navy blue white contrast") and picked **Grape** (D38): every text colour is now grape-tinted. The navy and slate values are in git.
- **Light:** lavender paper `#FAF5FF`, grape ink `#2E1D47`, secondary ink `#5E5270`, rules `#E6DCF7`, the white sheet `#FFFFFF`.
- **Dark:** grape night `#17111F`, ink `#EDE6F7`, secondary ink `#B3A8C4`, rules `#322842`, the sheet `#221A2D`.
- **Violet `#7C3AED`** (dark: lilac `#A78BFA` with dark text): the one filled button, the rated key, focus.
- **Lilac `#8B5CF6`** (dark `#A78BFA`): the progress bar.
- **Mint `#7FDDB9`:** the highlighter behind "Done". It comes from the emerald accent `#059669`.
- **Highlighters:** six colours (green, blue, pink, orange, yellow, purple). You pick one for each deck. Each has a light highlight for marks and, in light mode, a stronger pen tone for its swatch. All values are in product-brief.md.
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
   - **The marks:** the count after you save a card ("36 cards") and the fit check's answer, both in the deck's colour, and "Done" in mint. With readiness cut, these are the only highlighter marks.
   - **Violet is the pen you press with:** the one filled button, the key you just rated, and focus. Lilac is the progress bar.
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

## Review against the brief

- **No tab bar.** A pure flashcards app has one home, your decks. Settings is an icon on home.
- **No toasts.** A confirmation is a highlighter swipe over what changed.
- **Ruled rows rather than cards,** to avoid the rounded-card kit look.
- **Cut to version one after the spec review.** Removed import, the duplicate warning, undo, interval labels on the rating buttons, editing mid-review, readiness, the streak, the session summary, and the home-screen tip. Editing a card happens on the deck page.
