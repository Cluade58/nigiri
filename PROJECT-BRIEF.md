# Project brief

**Nigiri**: a pure flashcards app (decks, cards, FSRS reviews, plus Test mode on a deck, with no tracker or calendar), hosted on GitHub Pages, for the user and a few friends: their first AI-assisted app. No company, no launch, no legal or compliance work. **Goal: it works, it's easy to use, and they keep using it.**

**The product is the card and how it gets made.** The whole product is input: making cards has to be so cheap that people keep doing it. Every card is written by the person learning it: no import, no AI. The card-creation flow is in [product-spec.md §1](product-spec.md), and the user has the final say on it. Build everything outward from it, and keep every other section shorter than the card section.

**Version one is plain English text cards.** Each domain (for example Mandarin or math) is its own product, with its own input path and its own review screen. Domains share only the scheduler and the deck. The v2 flows are in [v2-input-flows.md](v2-input-flows.md) and aren't built yet.

**Build order:** [product-spec.md §7](product-spec.md). Features on the version 1.1 list (§8) wait until after the two-week test.

**Read:** [product-brief.md](product-brief.md) for what's decided and undecided, [product-spec.md](product-spec.md) for the rules, and [publishing.md](publishing.md) for hosting, installing and updates.

**Working rules for agents:**
- **Scope:** before adding any feature, name who will use it in the first month. If nobody will, don't add it.
- **Choices:** when a question goes to the user, present at most two options, with the trade-off in one line each, and let the user choose. Never label your own suggestion "(proposed)" or ask for approval of it.
- **Gaps:** if the user hasn't decided something, chief-officer decides it and records why. Every other agent writes "undecided" and stops instead of filling the gap with a default. The card flow (spec §1) stays the user's.
- **Order:** the card flow comes first. It was written on 2026-11-07 (spec §1).
- **FSRS:** use ts-fsrs 6.0.0 (pinned). Never design an alternative scheduler.
- **Out of scope:** desktop layouts, legal or privacy compliance, accessibility audits, migration strategies.
