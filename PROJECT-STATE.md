# Project state

_Kept by chief-officer. Decisions live in [product-spec.md](product-spec.md) and [product-brief.md](product-brief.md); this file records why they were made, who owns what, and what's next. Last updated 2026-11-07._

## Phase

- **Planning.** Implementation isn't authorized. It starts only when the user says "start implementing" ([CLAUDE.md](CLAUDE.md), Planning gate).
- **This cycle's goal** (the user, 2026-11-07): "Let the chief officer look for anything more that can be done to improve this app!"
- **Outcome chosen:** make build step 1 ready to build, with no open decision a builder would hit, and settle what friends need before they get the link.
- **Verdict:** PLAN_READY for build step 1.
- **Revision rounds:** 1 of 1 used (planning allows one after the first review). Build passes: 0 of 3.

## Decisions made by chief-officer (2026-11-07)

Each decision is also written into the spec or brief section in brackets.

| # | Decision | Why | Where |
|---|---|---|---|
| D1 | **Due means due now** (`dueAt <= now`), with no day boundary. | It matches the library exactly and needs no time zone or midnight rule. "Due by end of today" would review late-night cards hours after their last review, and would mean running scenario 10 before building. Cost: the home count can grow during the day. | spec §2, fsrs-notes §3, §5 |
| D2 | **Wait for a returning card**, if it's due within 10 minutes (inclusive). Otherwise the session ends with Done. | The user decided Again cards come back in the same session. Ending with Done when the last card is a minute away breaks that. 10 minutes is the longest configured step, so the window comes from the settings and isn't a new delay. Done for now lets anyone leave. | spec §2, §6; mockup `review-wait.html` |
| D3 | **Session order:** studied cards, most overdue first, then new cards in writing order. All decks mix from home. The next card is picked again after every rating. | A builder needs an order. The most overdue memories are most at risk, and writing order keeps related new cards together. | spec §2 |
| D4 | **The deck page is in step 1**, with edit and delete. | The user's own week needs a way to fix typos, home's deck rows need somewhere to go, and per-deck review is cheap. | spec §6, §7 |
| D5 | **Deleting a card deletes its reviews.** Reviews are never edited, and are removed only together with their card. **Confirmed by the user on 2026-11-07.** | "Delete means delete". No feature reads an orphan review, and keeping them would put data the user deleted into their export. | spec §3 |
| D6 | **The rating hint is shown on screen**: "Forgot it? Tap Again. Right but slow? Hard." | Friends get a link, not a lesson. Hard-after-forgetting is the misuse the Anki manual warns about, and a static line costs nothing to build. Revisit after the two-week test. | spec §6; `review-answer.html` |
| D7 | **Friends get the link after step 2** (export and restore). | Cards live only on the phone. A friend who loses week-one cards to a deleted icon is unlikely to come back. | product-brief, publishing.md |
| D8 | **Failure states:** "Not saved" lines that keep what was typed, Save card turning off while it saves, an out-of-space wording, and one screen if storage can't open. | Without these, a failed save either loses a card silently or loops. Who: anyone whose phone fills up. | spec §3, §6; `add-card.html?error`, `review-answer.html?error` |
| D9 | **Empty and clear states:** "Nothing due right now", Add card becomes the main button, no count on decks with none due, and one line on an empty deck. | Every user meets these daily. The empty state points at making cards, which is the product. | spec §6; `home.html?clear`, `deck.html?empty` |
| D10 | **Save guard for a second open copy:** re-read the card in the transaction, compare `reps` and `lastReviewAt` by value, and skip if it's gone or changed. | On Android a browser tab and the installed app share storage, and disabled buttons can't stop the other copy. It also covers a retry after a false "Not saved". | spec §3 |
| D11 | **Storage and hosting rules:** call `persist()` after the first save each launch, hash URLs, recount on the clock, all five stores declared in the first schema, and the Review record keeps the card id. | These prevent silent data loss (eviction, an unrecoverable wipe before export exists, orphan reviews) and stale or 404 screens. | spec §3, §4, §7 |
| D12 | **Restore checks the whole file first,** then replaces everything in one transaction. | A restore that fails halfway would empty the app. This is step 2, recorded now. | spec §3 |
| D13 | **How the two-week test counts:** school days; export on days 5 and 14; a handwritten deck total each evening until export exists. | The test had no way to read cards per day without a stats screen. | spec §7 |
| D14 | **Step 1 hides Settings, Add a test and test days on deck rows**; `?step=1` in the mockups shows it as built. | Settings has nothing in it until step 2. | spec §7; `mockups/mockup.js`, `index.html` |
| D15 | **Edits change only the text**; the deck list shows newest first; renaming or deleting a deck is deferred to 1.1. | Most edits are typo fixes on the card just written. Nobody needs deck rename in the first week, and it's recorded so it isn't lost. | spec §3, §6, §8 |

**Cut and not added:** a "next card due at" line on home, backup reminders, review ahead, and an in-app install tip (it stays on the 1.1 list; the friend message covers it).

## Tasks

| ID | Owner | Task | Status |
|---|---|---|---|
| P-UI-1 | ui-designer | Impeccable critique (Assessment A) and ui-ux-pro-max checklist of the new mockup states | Done: FIX, 3 required changes. All applied, plus optional (a)–(c). Optional (d), a pressed state on text buttons, is in the backlog. |
| P-DET-1 | chief-officer | Impeccable detector (Assessment B), run after A finished | Done: no findings on the new states. One advisory (17/20/24px heading steps on home and index) predates this cycle and stays. |
| P-CR-1 | code-reviewer | Data invariants and failure cases for step 1 | Done: FIX, blocking items B1–B6. All applied. Non-blocking N1–N10 applied. Hypotheses H1–H8 moved to fsrs-notes §7 for the builder. |
| S1-BUILD | frontend-builder | Build step 1 per spec §7 | Waiting for the user to say "start implementing". |
| S2-PLAN | chief-officer | Draw Settings (Export, Restore, confirm). Verify export saves a file from an iPhone home-screen app. | Next planning task. The iPhone download behaviour is an unverified hypothesis. |
| S3-PLAN | chief-officer | Test mode gaps (below) | After step 1 ships |

## Step 1 acceptance

Checks 1, 3, 4 and 5 in [spec §5](product-spec.md), plus its "Also test" list. Verification scenarios are in [fsrs-notes §6](fsrs-notes.md). H1–H8 (fsrs-notes §7) must be checked in the installed library before the save is built.

## Open, for the user

- **Starting implementation, commits and publishing.**
- _Resolved 2026-11-07:_ the user chose the free GitHub address `https://cluade58.github.io/nigiri/`, with no domain of their own (product-brief, publishing.md).

## Open, for later cycles (not blocking step 1)

- **Test mode (step 3):**
  - how new cards spread up to a test date, given due-now and "only fields ts-fsrs returns" (this reopens D1 or spec §4);
  - what happens after the test date passes;
  - editing or removing a test;
  - a test today (zero days left);
  - storing the test date as a calendar day rather than a moment;
  - the "weakest below target" item.
- **CLAUDE.md wording drift:** resolved 2026-11-07. The user confirmed D5 ("Delete them too"), and the main session updated CLAUDE.md to say five acceptance checks, and that reviews are never edited and are removed only together with their card.
- **Backlog:** a pressed state on `.btn-text`; "0 cards" versus "No cards yet" is now settled as "No cards yet".
