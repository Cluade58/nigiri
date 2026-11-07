# Study App Design

**Nigiri**: a pure flashcards app (decks, cards, FSRS reviews, plus Test mode on a deck, with no tracker or calendar), hosted on GitHub Pages, for the user and a few friends: their first AI-assisted app. No company, no launch. **Goal: it works, it's easy to use, and they keep using it.** Currently in the **planning stage**.

**The product is the card and how it gets made.** The whole product is input: making cards has to be so cheap that people keep doing it. Every card is written by the person learning it: no import, no AI. The card-creation flow is in [product-spec.md §1](product-spec.md), and the user has the final say on it. Everything else is built outward from it. Version one builds plain English text cards only. Mandarin and math are separate products, written down in [v2-input-flows.md](v2-input-flows.md) and not built yet.

**Where things live:**
- [PROJECT-BRIEF.md](PROJECT-BRIEF.md): short summary plus the working rules for agents
- [product-brief.md](product-brief.md): decided, undecided, stack, visual tokens
- [product-spec.md](product-spec.md): the card, scheduling and Test mode, saving, data, acceptance checks, screens around the card, build order, and the version 1.1 list
- [fsrs-notes.md](fsrs-notes.md): how the scheduler works (memory model, learning steps, calculated intervals, policies), the differences from Anki, the recommended settings, and the verification scenarios
- [v2-input-flows.md](v2-input-flows.md): the Mandarin and math input flows, written down but not built
- [UI-DESIGN-BRIEF.md](UI-DESIGN-BRIEF.md): design expectations
- [publishing.md](publishing.md): where everything lives, the web address, when and how to publish, installing, updates, and the risks
- PROJECT-STATE.md: chief-officer's running record of the phase, tasks, pass count and blockers. It links to decisions instead of copying them, and it's created on the chief's first run.

## Working rules

- **Scope:** before adding any feature, name who will use it in the first month. If nobody will, don't add it.
- **Choices:** when a question goes to the user, present at most two options, with the trade-off in one line each, and let the user choose. Never mark your own suggestions "(proposed)" or ask for approval of them.
- **Gaps:** if the user hasn't decided something, chief-officer decides it and records why. Every other agent, and any session working without the chief, writes "undecided" and stops instead of filling the gap with a default.
- **Order:** the card flow comes first. It was written on 2026-11-07 (spec §1). Every other section stays shorter than the card section.
- **FSRS:** use `ts-fsrs@6.0.0` (pinned), with its v6 calls (`DefaultScheduler`, `newCard`, `review`), never the old v5 names. Details are in [product-spec.md §2 and §7](product-spec.md) and [fsrs-notes.md](fsrs-notes.md). Never hardcode review delays per rating: only the configured learning steps are set delays, and the model may lengthen them. Never design an alternative scheduler.
- **Out of scope:** desktop layouts, legal or privacy compliance, accessibility audits, migration strategies.
- **Talking to the user:** they're learning to build software. Use plain language and explain decisions briefly.

## Planning gate

- Approving a plan confirms its decisions. **Implementation starts only when the user explicitly says to start implementing.**
- **Implementation includes:** scaffolding the app, writing components, implementing storage or scheduling, and installing app dependencies.
- Before that, agents produce flows, design plans, and static mockups under `mockups/`. Chief-officer decides when a mockup is needed and may write it itself. Static mockups are plain HTML and CSS with no app logic or saved data: they count as design work, not a prototype.

## Design rule

**Always use the `frontend-design` skill** (`.claude/skills/frontend-design/`) for any UI, layout, typography, color, copy or mockup work. Follow its two passes: a design plan, then a review against the brief before building.

**`ui-ux-pro-max`** (`.claude/skills/ui-ux-pro-max/`, MIT, from nextlevelbuilder/ui-ux-pro-max-skill) is attached to the ui-designer agent as a UX rules checklist: accessibility, touch, forms, navigation, motion and React guidance, plus its pre-delivery checklist in `references/pro-rules.md`.
- Its palettes, font pairings and styles don't apply, because the Highlighter tokens are fixed. Where its numbers differ from the briefs, the briefs win.
- Its SKILL.md runs the search script through `${CLAUDE_PLUGIN_ROOT}`, which isn't set in this project. From the project root, the script is at `.claude/skills/ui-ux-pro-max/scripts/search.py`. Agents without a shell read the `references/` and `data/` files directly.

## Agent workflow

Nine agents live in `.claude/agents/`, and each agent's file holds its full instructions. [chief-officer](.claude/agents/chief-officer.md) runs the work: start it with `/iterate-project` ([SKILL.md](.claude/skills/iterate-project/SKILL.md)) or `claude --agent chief-officer`. Its file holds the task contracts, design-skill loading, research standards, phase gates and acceptance rules. This section only adds this project's limits.
- **Chief-officer makes the calls:** priorities, task order, which specialist gets each task (it delegates to them directly), settling disagreements between agents, accepting or rejecting results, and any product or design question the user hasn't settled (the user handed it that on 2026-11-07). Don't run a second coordinating loop alongside it.
- **What stays with the user:** the card flow (spec §1), decisions they've already made, and what the chief's file reserves for them: starting implementation, commits, publishing and paid services. The chief records each decision it makes, with the reason, in PROJECT-STATE.md and updates the brief or spec it changes.
- **Active now:** chief-officer, competitor-researcher, product-planner, ui-designer, qa-tester, code-reviewer.
- **Active after implementation is authorized:** frontend-builder.
- **Inactive during planning:** [learning-specialist](.claude/agents/learning-specialist.md) and [feedback-analyst](.claude/agents/feedback-analyst.md). After implementation is authorized, learning-specialist handles study-mechanics and scheduling changes, and feedback-analyst works only from real tester evidence.
- When a specialist's file says "main conversation", it means whoever called it, usually chief-officer.
- Only frontend-builder edits app code. Chief-officer may edit the planning documents, PROJECT-STATE.md and static mockups in `mockups/`. Accepted decisions stay in product-brief.md and product-spec.md.
- Accepted decisions in the spec and brief, and the out-of-scope list above, win over any agent's general checklist. When a checklist item covers something the project cut or deferred, mark it not applicable instead of reopening it.
- Run the roles one after another, passing evidence explicitly.
- Planning gets one focused revision round after the first review. Building gets at most 3 build-and-review passes, shared by every role including chief-officer, stopping early when the checks pass.
- Chief-officer's sign-off doesn't replace QA or code review. Missing evidence and required independent reviews stay visible in its report.
- Only claim results that were actually observed.
- Commits, publishing and new dependencies follow the user's authorization.

## Verification

- **Screenshots:** `npm run shot -- <file-or-url>`.
  - Defaults to phone (390×844).
  - Flags: `--viewport mobile|tablet|desktop|all`, `--full`, `--dark`, `--name <x>`, `--out <dir>`, `--wait <ms>`, `--keep`.
  - Read the PNGs in `screenshots/` and fix any errors or overflow the script reports.
  - The script is [tools/screenshot.mjs](tools/screenshot.mjs). If its headless Chrome is missing, run `npx puppeteer browsers install chrome-headless-shell`.
- **Behaviour:** the five acceptance checks in [product-spec.md §5](product-spec.md). Step 1 must pass checks 1, 3, 4 and 5; check 2 belongs to step 2.
- **Build order:** follow [product-spec.md §7](product-spec.md). Each step must be usable on its own.
- **Data rules:**
  - a review and the card's new state save together
  - reviews are never edited, and are removed only together with their card (deleting a card deletes its reviews; the user confirmed this on 2026-11-07)
  - rating buttons turn off after a tap
  - all versions are exactly as listed in product-brief.md
