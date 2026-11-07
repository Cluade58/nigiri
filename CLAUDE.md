# Study App Design

**Nigiri**: a pure flashcards app (decks, cards, FSRS reviews, plus Test mode on a deck, with no tracker or calendar), hosted on GitHub Pages, for the user and a few friends: their first AI-assisted app. No company, no launch. **Goal: it works, it's easy to use, and they keep using it.** Currently in the **planning stage**.

**The product is the card and how it gets made.** The whole product is input: making cards has to be so cheap that people keep doing it. Every card is written by the person learning it: no import, no AI. The card-creation flow is in [product-spec.md §1](product-spec.md), and the user has the final say on it. Everything else is built outward from it. Version one builds plain English text cards only. Mandarin and math are separate products, written down in [v2-input-flows.md](v2-input-flows.md) and not built yet.

**Where things live:**
- [PROJECT-BRIEF.md](PROJECT-BRIEF.md): short summary plus the working rules for agents
- [product-brief.md](product-brief.md): decided, undecided, stack, visual tokens
- [product-spec.md](product-spec.md): the card, scheduling and Test mode, saving, data, acceptance checks, screens around the card, build order, and the version 1.1 list
- [v2-input-flows.md](v2-input-flows.md): the Mandarin and math input flows, written down but not built
- [UI-DESIGN-BRIEF.md](UI-DESIGN-BRIEF.md): design expectations

## Working rules

- **Scope:** before adding any feature, name who will use it in the first month. If nobody will, don't add it.
- **Choices:** present at most two options, with the trade-off in one line each, and let the user choose. Never mark your own suggestions "(proposed)" or ask for approval of them.
- **Gaps:** if the user hasn't decided something, write "undecided" and stop. Don't fill the gap with a default.
- **Order:** the card flow comes first. It was written on 2026-11-07 (spec §1). Every other section stays shorter than the card section.
- **FSRS:** use `ts-fsrs@6.0.0` (pinned). Never design an alternative scheduler.
- **Out of scope:** desktop layouts, legal or privacy compliance, accessibility audits, migration strategies.
- **Talking to the user:** they're learning to build software. Use plain language and explain decisions briefly.

## Planning gate

- Approving a plan confirms its decisions. **Implementation starts only when the user explicitly says to start implementing.**
- **Implementation includes:** scaffolding the app, writing components, implementing storage or scheduling, and installing app dependencies.
- Before that, agents produce flows, design plans, and static mockups under `mockups/` when the user asks for them.

## Design rule

**Always use the `frontend-design` skill** (`.claude/skills/frontend-design/`) for any UI, layout, typography, color, copy or mockup work. Follow its two passes: a design plan, then a review against the brief before building.

## Agent workflow

Six agents live in `.claude/agents/`: competitor-researcher, product-planner, ui-designer, frontend-builder, qa-tester, code-reviewer. They're coordinated through `/iterate-project`.
- Only frontend-builder edits app code.
- Run the roles one after another, passing evidence explicitly.
- Allow at most 3 build-and-review passes, stopping early when the checks pass.
- Only claim results that were actually observed.
- Commits, publishing and new dependencies follow the user's authorization.

## Verification

- **Screenshots:** `npm run shot -- <file-or-url>`.
  - Defaults to phone (390×844).
  - Flags: `--viewport mobile|tablet|desktop|all`, `--full`, `--dark`, `--name <x>`, `--out <dir>`, `--wait <ms>`, `--keep`.
  - Read the PNGs in `screenshots/` and fix any errors or overflow the script reports.
  - The script is [tools/screenshot.mjs](tools/screenshot.mjs). If its headless Chrome is missing, run `npx puppeteer browsers install chrome-headless-shell`.
- **Behaviour:** the three acceptance checks in [product-spec.md §5](product-spec.md).
- **Build order:** follow [product-spec.md §7](product-spec.md). Each step must be usable on its own.
- **Data rules:**
  - a review and the card's new state save together
  - the review log is append-only
  - rating buttons turn off after a tap
  - all versions are exactly as listed in product-brief.md
