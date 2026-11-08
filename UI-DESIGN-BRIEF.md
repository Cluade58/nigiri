# UI design expectations

**Phone only:** a web app on the home screen, designed at 390px and checked at 360px. No desktop layout.

**Direction: B, Highlighter.** Tokens and type are in [product-brief.md](product-brief.md); the reference screens start at `mockups/index.html`, and the plan behind them is `mockups/design-plan.md`. New screens extend that system.

**A pure flashcards app.** Screens exist only for decks, cards, reviewing and a deck's test. There's no calendar or assignments, so the existing mockups' "Due soon" list and Calendar tab no longer apply.

**The card screens come first.** They're designed from the card-creation flow in [product-spec.md §1](product-spec.md). Other screens follow outward from the card.
- One way to make cards: write your own. No import.
- **Screens:** home (empty, normal, and nothing due), new deck, add card, deck page (with editing a card, and with no cards yet), review (with the rating hint, the wait for a returning card, and "Not saved"), done (with the reminder ask, step 4), the screen shown when storage can't open, and a deck's test with the fit check (add, edit, remove, a test today, and more than 120 minutes). What's on each is in [spec §6](product-spec.md). `mockups/index.html` also shows step 1 as built, without Settings or the test line. Anything on the version 1.1 list (§8) stays off the screens.
- Each domain has its own input screen and its own review screen. Version one has only plain text cards.
- Input is designed for the moment someone has something in hand (a line in a textbook, a sentence they heard, a word they just looked up), not for a sit-down card-making session.

Use frontend-design for the design plan (then review it against the brief), and Impeccable's critique to review renders. Check UX against ui-ux-pro-max's rules and its pre-delivery checklist.

**Colours come from ui-ux-pro-max's palettes** (the user's decision, 2026-11-08). Nigiri uses row 103, "Flashcard & Study Tool" (violet, lilac and emerald on lavender), and the tokens in [product-brief.md](product-brief.md) are now fixed. Its fonts and styles still don't apply.
- **Violet** draws only the one filled button per screen, the rating key you just tapped, and the focus ring. Outlined buttons, text links and keys at rest stay ink.
- **Lilac** draws only the review progress bar.
- **Mint**, from the emerald accent, is the highlighter behind "Done".
- **The six deck colours** are the user's choice per deck. In light mode each has a stronger pen tone for its swatch.
- **Contrast:** WCAG AA in both themes. That's 4.5:1 for text, and 3:1 for large text and UI parts.

**Basics on every screen:**
- one clear primary action
- readable text
- thumb-sized tap targets (48px)
- a visible focus ring

For flashcards: one question in focus, the answer revealed on request, rating buttons that stay in the same place.
