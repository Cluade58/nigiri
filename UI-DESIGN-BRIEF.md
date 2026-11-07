# UI design expectations

**Phone only:** a web app on the home screen, designed at 390px and checked at 360px. No desktop layout.

**Direction: B, Highlighter.** Tokens and type are in [product-brief.md](product-brief.md); the reference screens start at `mockups/index.html`, and the plan behind them is `mockups/design-plan.md`. New screens extend that system.

**A pure flashcards app.** Screens exist only for decks, cards, reviewing and a deck's test. There's no calendar or assignments, so the existing mockups' "Due soon" list and Calendar tab no longer apply.

**The card screens come first.** They're designed from the card-creation flow in [product-spec.md §1](product-spec.md). Other screens follow outward from the card.
- One way to make cards: write your own. No import.
- **Screens:** home (empty and normal), new deck, add card, deck page (with editing a card), review, done, and a deck's test with the fit check. What's on each is in [spec §6](product-spec.md). Anything on the version 1.1 list (§8) stays off the screens.
- Each domain has its own input screen and its own review screen. Version one has only plain text cards.
- Input is designed for the moment someone has something in hand (a line in a textbook, a sentence they heard, a word they just looked up), not for a sit-down card-making session.

Use frontend-design for the design plan (then review it against the brief), and Impeccable's critique to review renders.

**Basics on every screen:**
- one clear primary action
- readable text
- thumb-sized tap targets (48px)
- a visible focus ring

For flashcards: one question in focus, the answer revealed on request, rating buttons that stay in the same place.
