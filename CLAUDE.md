# Study App Design

A study app for high school students: FSRS flashcards plus an assignment and test tracker. The headline feature is **Test mode**. Currently in the **planning stage**. The first release is a **private beta** for the user and a few testers in several countries.

**Where things live:**
- [PROJECT-BRIEF.md](PROJECT-BRIEF.md): short summary for agents
- [product-brief.md](product-brief.md): research, positioning, feature map, decisions log, open questions
- [product-spec.md](product-spec.md): exact behaviour rules (readiness, Test mode scheduling, backup and integrity, notifications, `.ics` import, privacy, behaviour checks)
- [UI-DESIGN-BRIEF.md](UI-DESIGN-BRIEF.md): design expectations

Product decisions belong in the briefs and spec, not here. This file holds only the planning gate, the workflow and the verification rules.

## Planning gate

- **Approving a plan confirms its scope and decisions. It does not start implementation.** App implementation begins only when the user explicitly says to start implementing.
- **Implementation includes:** scaffolding the app, writing components, implementing storage or scheduling, and installing app dependencies.
- Until then, agents produce research, briefs, flows, acceptance criteria, design plans, and **visual prototypes when the user explicitly asks for them** (static mockups under `mockups/`, not app code).
- The screenshot loop is for visual prototypes the user authorized, and for everything once implementation has started.

## Design rule

**Always use the `frontend-design` skill** (`.claude/skills/frontend-design/`) for any UI, visual design, layout, typography, color, copy or mockup work. Load it before proposing or building anything visual and follow its two-pass process (design plan, then review against the brief before building).

## Working together

The user is learning to build software. Use plain language, explain decisions briefly, and give concrete browser checks. Preserve unrelated work and existing saved data. Keep secrets in the project's supported environment configuration.

## Agent workflow

Six project agents live in `.claude/agents/`: **competitor-researcher, product-planner, ui-designer, frontend-builder, qa-tester, code-reviewer**. The main conversation coordinates them through `/iterate-project` (`.claude/skills/iterate-project/SKILL.md`).

- **New product or UI goal:** competitor-researcher → product-planner (picks one idea, sets 3–5 acceptance checks) → ui-designer → frontend-builder → qa-tester + ui-designer critique + code-reviewer.
- **Approved plan:** reuse its research and decisions. Go to building **only once implementation is authorized** (see the planning gate).
- **Focused bug:** builder plus the relevant reviewers.
- **Rules:**
  - Only one agent edits app code: frontend-builder.
  - Run the roles one after another, passing evidence explicitly.
  - Allow at most 3 build-and-review passes per invocation, and stop early once the acceptance checks pass.
  - Only claim agent runs, test results, screenshots and completion that were actually observed.
- **Design skills:** ui-designer uses `frontend-design` (this project) and `impeccable` (its critique workflow).
- **Screenshot evidence:** the main conversation captures screenshots with `npm run shot` and hands the PNG paths to ui-designer and qa-tester.
- **Authorization:** commits, publishing, paid services, new dependencies and destructive actions follow the user's authorization.

## Verification rules

### Screenshot loop (visual self-review)
1. Build or edit the page.
2. Take screenshots: `npm run shot -- <file-or-url>`.
   - Defaults: mobile 390×844 and desktop 1440×900.
   - Flags: `--viewport mobile|tablet|desktop|all` (comma lists work), `--full`, `--dark`, `--name <x>`, `--out <dir>`, `--wait <ms>`, `--keep`.
3. **Read the PNGs** in `screenshots/` and critique them against the frontend-design skill and the brief.
4. Fix any console errors, failed requests or horizontal overflow the script reports.
5. Repeat. Check **mobile first**.

Script: [tools/screenshot.mjs](tools/screenshot.mjs). Puppeteer's headless Chrome lives in `~/.cache/puppeteer`. If it's missing, run `npx puppeteer browsers install chrome-headless-shell`. If the script's flags change, update this section to match.

### Behaviour checks
Screenshots aren't enough once real features exist. Every feature must also pass the relevant behaviour checks in [product-spec.md §8](product-spec.md): offline reviews, backup restore and merge, test date changes, repeated rating taps, undo, interrupted sessions, keyboard use, `.ics` re-import, and the readiness math unit test.

### Data integrity (non-negotiable)
- A review's log entry and its card-state update are saved in one transaction.
- The review log is append-only; undo appends an entry.
- Pin `ts-fsrs@6.0.0` exactly, and every other dependency at the exact versions in product-brief §7. No new dependency without a written reason there.
- Fonts and assets are self-hosted in the real app. No data leaves the device in the first release.
