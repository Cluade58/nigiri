# Product direction

**The full brief is [product-brief.md](product-brief.md). Exact behaviour rules (readiness, Test mode scheduling, backup, privacy, acceptance checks) are in [product-spec.md](product-spec.md).** Read it first. It holds the research, positioning, feature map (MVP / V2 / Later), gamification rules, and the decisions made so far. This file is the short version the project agents look for.

## Settled decisions

- **Product:** a study app combining FSRS flashcards with an assignment and test tracker and a calendar.
- **What makes it different:** *Test mode*. A deck linked to a test date is scheduled to be ready on that day, and a readiness score based on FSRS recall predictions shows whether you're on track. One calendar shows assignments, tests and predicted review minutes.
- **First release:** a private beta for the user plus a few testers in several countries. Its success checks and six end-to-end flows are in product-brief §1c.
- **Audience:** high school students. That means phone-first, Google Classroom before Canvas, AP/SAT/ACT alongside weekly quizzes, tight budgets, and a COPPA age gate (brief §1b).
- **Platform:** a phone-first web app that installs like an app (PWA). Design at 390px first; desktop is a roomier layout of the same app.
- **Scheduler:** FSRS via `ts-fsrs` (proposed). Four grading buttons: Again / Hard / Good / Easy.
- **Data:** local-only to start. IndexedDB on the device, no accounts, Export/Import backup. Records use UUIDs and timestamps so sync can be added later (brief §8).
- **Visual direction:** B, Highlighter. Readiness is a highlighter stroke on cool paper, with gel-pen navy ink, Bricolage Grotesque and Atkinson Hyperlegible Next. Tokens are in product-brief §6; the reference is `mockups/today-b-highlighter.html`.
- **Gamification:** forgiving streaks and readiness as the reward. **No lives/hearts and no caps on reviewing your own cards.**

## Still open

The name (brief §8). **Business model is decided** (brief §7c): free at launch with no payment code, and Plus later for sync and AI; never paywall studying, Test mode, images or the tracker, and no ads. The **tech stack is decided** (brief §7): React 19 + TypeScript 6.0.3 + Vite 8, vite-plugin-pwa, Dexie, ts-fsrs 6.0.0, plain CSS variables, Vitest + Playwright, a static host. All versions are exact. Where the code lives and git setup are decided when implementation starts.

## How each cycle works

Research Anki, Gizmo, RemNote, Quizlet, Knowt, Mochi, Brainscape, MyStudyLife and Shovel when they're relevant to the current question. Some of this was already done on 2026-11-07 and is summarised in product-brief.md, so reuse it rather than redoing it. Treat competitor observations as evidence for product ideas. The product planner weighs user benefit, coherence, confidence, development cost, dependencies, and maintenance before choosing an implementation.

For each cycle, record the selected user problem, intended outcome, three to five acceptance checks, and follow-up ideas in product-brief.md or the conversation. Use real student tasks and clear language when designing screens. Measure useful actions and observed behaviour before making comparative performance claims.
