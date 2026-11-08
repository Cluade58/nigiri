# Project state

_Kept by chief-officer. Decisions live in [product-spec.md](product-spec.md) and [product-brief.md](product-brief.md); this file records why they were made, who owns what, and what's next. Last updated 2026-11-08 (third cycle: colours)._

## Phase

- **Planning. Implementation isn't authorized.**
  - **2026-11-08, earlier:** the user put the project back in planning ("dont start nbuilding until i say so"). Asked whether to start step 1, they said **"Not yet"**.
  - **Second cycle's request (2026-11-08):** "Ok, now research short term spaced rep, for the test mode. in the app use notifications for reviews are due to study. Dont make the easy for fsrs soo long. desired retention shld be at around 90%".
  - Building starts only when the user says so ([CLAUDE.md](CLAUDE.md), Planning gate).
- **Second cycle's goal:**
  - research short-horizon spacing and settle the open Test mode rules;
  - research what reminders a no-server home-screen app can send, and plan them;
  - shorten Easy with a supported ts-fsrs lever, keeping retention around 90%.
- **One iteration:** research, decisions, doc edits, report. No revision round.
- **Third cycle (2026-11-08):** the user asked: "Remember that the actual website is going to have a frotnend too, for that, use the skills for the best most appealing colours based on the skills (colour trios)".
  - Colours now come from ui-ux-pro-max's palettes. The coordinator updated CLAUDE.md and ui-designer.md to say so.
  - This cycle's work: choose the trio, apply it to the mockups, one rendered review. Still planning, and no commits. The result is D37.
- **Verdict:** PLAN_READY for build steps 1–3. Step 4 (reminders): the user chose option B, the Cloudflare sender, on 2026-11-08 ("Free Cloudflare sender"). Its delivery details are S4-PLAN ([publishing.md](publishing.md#reminders-step-4)).
- **Build passes:** 0 of 3.

## Decisions

### Made 2026-11-07 (all still stand except D2's window)

| # | Decision | Why | Where |
|---|---|---|---|
| D1 | **Due means due now** (`dueAt <= now`), with no day boundary. | It matches the library exactly and needs no time zone or midnight rule. | spec §2, fsrs-notes §5 |
| D2 | **Wait for a returning card** if it's due within the window, otherwise Done. **Window changed 2026-11-08 from 10 minutes to 90 seconds (D22).** | Again cards come back in the same session (the user's decision). | spec §2, §6; `review-wait.html` |
| D3 | **Session order:** studied cards, most overdue first, then new cards in writing order. All decks mix from home. | A builder needs an order. | spec §2 |
| D4 | **The deck page is in step 1,** with edit and delete. | Typos need fixing during the first week. | spec §6, §7 |
| D5 | **Deleting a card deletes its reviews.** Confirmed by the user on 2026-11-07. | "Delete means delete". | spec §3 |
| D6 | **The rating hint is on screen.** | Friends get a link, not a lesson. | spec §6 |
| D7 | **Friends get the link after step 2.** | Cards live only on the phone. | product-brief, publishing.md |
| D8–D9 | **Failure states, and empty and clear states.** | They stop silent loss and dead ends. | spec §3, §6 |
| D10 | **Save guard for a second open copy.** | Android shares storage between a tab and the installed app. | spec §3 |
| D11 | **Storage and hosting rules:** `persist()`, hash URLs, recount on the clock, five stores. | They prevent silent data loss and 404s. | spec §3, §4, §7 |
| D12 | **Restore checks the whole file first.** | A half-done restore would empty the app. | spec §3 |
| D13 | **How the two-week test counts.** | There's no stats screen. | spec §7 |
| D14 | **Step 1 hides Settings and the test parts.** | They're empty until steps 2 and 3. | spec §7 |
| D15 | **Edits change only the text. Deck rename and delete wait for 1.1.** | Most edits are typo fixes. | spec §3, §6, §8 |

### Made 2026-11-08, first cycle (unchanged)

| # | Decision | Why | Where |
|---|---|---|---|
| D16 | **Double-tap guard:** for 400 ms after the answer or the next card appears, taps on that spot do nothing. | Show answer and the ratings share one spot, so a double tap could save a rating nobody chose, and there's no undo. AnkiMobile has the same guard. The 400 ms is an assumption: longer than a double tap, shorter than reading an answer. Tune it after the test week. | spec §3, §5 |
| D17 | **Create deck, Save changes and Delete card follow Add card's failure rule.** The copy comes from ui-designer (P-UI-2). | The builder would otherwise hit three undecided states. | spec §3, §6; `new-deck.html?error`, `deck.html?edit&error`, `?edit&delete-error` |
| D18 | **Keyboard:** focus moves to Front in the same tap, before the save finishes; the fields clear when it succeeds. | iPhone may close the keyboard when the cursor moves after a wait. That's from developer reports, unverified on current iOS. | spec §7; `add-card.html` comments |
| D19 | **Helper packages:** `@types/react` and `@types/react-dom` 19.3.0, `fake-indexeddb` 6.2.7, and `@playwright/test` 1.65.0. | TypeScript needs the types, and the save tests need storage without a browser. None ship to phones. | product-brief stack |
| D20 | **Steps (the user's rule):** `learningSteps` and `relearningSteps` `['1m']`, and **model override off** (chief's choice). | With override on, a forgotten card's Again came back after 1.2 hours (observed), which breaks "1 min for relearning". With override off, Again is exactly 1 minute. What remains: Hard on a card still being learned is 90 s (the library's built-in 1.5×, the same as Anki), and Good and Easy are at least 1 day. Changing those would need a custom scheduler, which CLAUDE.md forbids. | spec §2, product-brief, fsrs-notes §2.2, §5 |
| D21 | **The model stays FSRS-7,** not Anki's FSRS-6. | FSRS-6 in ts-fsrs counts whole UTC days. Observed: the same 40-minute gap gave stability 7.32 or 2.31, depending on UTC midnight, while FSRS-7 gave 6.30 both times. Anki avoids this with its own 4 am local day, which the library doesn't have. Settled now, because switching later means export, wipe and reimport. | spec §2, fsrs-notes §5 |
| D22 | **The waiting and "left" window is 90 seconds** (the longest set delay). **No learn-ahead.** | With D20, nothing from a session comes back between 90 s and 1 day. Anki's 20-minute learn-ahead would show cards early, and in FSRS-7 an early answer is a different review (observed: stability 0.350 vs 0.415). It would also cut the user's 1 minute short. | spec §2, §5, §6; mockups |
| D23 | **Clock moved back:** pass `now` as the later of the tap and `lastReviewAt`. | FSRS-7 throws an error otherwise (observed, H8). Without this, a card could get stuck on "Not saved". | spec §7, fsrs-notes §5 |
| D24 | **Keep drafts.** Accepted by the user on 2026-11-08: "Implement the other changes the chief suggested" (the chief had recommended option 2). | §1's own example, "a word you just looked up", means leaving the app mid-card. **Rules (chief):** one draft, kept outside the database and tied to its deck. It's restored when Add card opens in that deck or from home (with that deck picked), and cleared by a successful save or by Close. No line on restore. | spec §3, §5, §8; `add-card.html?draft` |
| D25 | **The "storage can't open" screen:** "Nigiri can't open your cards", three fixes, a warning not to remove the app, and Try again (with "Still can't open your cards." if it fails again). | From ui-designer (P-UI-2). A home-screen app has no reload button, and reinstalling is the instinct that can erase cards. | spec §6; `storage-error.html` |
| D26 | **Anki's other settings:** fuzz off, maximum interval default; optimizer, reschedule, health check, historical retention, simulator, Easy Days, load balancing, leeches and daily limits cut. | Nobody uses them in month one, or they need fuzz or history Nigiri won't have. | fsrs-notes §8 |

### Made 2026-11-08, second cycle

| # | Decision | Why | Where |
|---|---|---|---|
| D27 | **Easy's target is 0.95; Again, Hard and Good stay 0.9** (`desiredRetention: { 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.95 }`). The user decided "shorter Easy, around 90%"; chief picked the lever and the value. | Per-rating retention is a documented `DefaultScheduler` option: no set delay, no new scheduler, and the card's memory doesn't change. Observed: Easy on a new card 53.87 → **13.15 days**, on a known card 174.95 → **93.44** (Good + 1 day, the library's floor). 0.95 is the lowest target that brings a new card's Easy inside two weeks, and it's under Anki's 97%. Weights, a maximum interval and cost-based retention were rejected (they change the model, set a delay, or need a custom scheduler). Reversible with no migration. | spec §2, §5, §7; fsrs-notes §5, §6, §9; product-brief |
| D28 | **New cards with a test are spread over the days before test day;** from the day before, all are due. | A same-day gap costs the most: recall +34% going from 0 to 1 day, −11% from 1 to 14 days (Cepeda 2009); "costs ... much smaller than ... too short a gap" (Cepeda 2008). The share matches the fit check's division by days. | spec §2, §5; fsrs-notes §10 rule 1 |
| D29 | **Test mode never writes a card.** Adding, editing or removing a test changes only the new-card share and the fit check. Remove test has no confirm. | Nothing to undo after a test, an edit or a removal; Anki keeps rescheduling off by default. | spec §2, §5; fsrs-notes §10 rules 2–3 |
| D30 | **After test day the deck acts as if it has no test;** the record stays until replaced or removed. **A test today** is allowed: all new cards due, fit check divides by 1, nothing shown early. | No source documents an after-test mode, and FSRS keeps scheduling the cards. Early reviews change FSRS-7 results (scenario 10), and a last pass before the test has weak evidence (Kornell 2009, p = .09), so it's on the 1.1 list. | spec §2, §8; fsrs-notes §10 rules 2, 4 |
| D31 | **The test date is a calendar day kept as `YYYY-MM-DD` text;** days left count calendar days. | A test is on a day, not at a moment: no shift across time zones or daylight saving. Restore checks it. | spec §2, §4, §5; fsrs-notes §10 rule 5 |
| D32 | **"Weakest cards below target" is removed** from the queue. | Model-set intervals keep recall at or above 90% until due (scenario 8 observed: 0.9000 at due), and overdue cards are already first. The exceptions are cards stretched by the 1-day minimums. | spec §2; fsrs-notes §10 rule 6 |
| D33 | **The fit check adds up every deck with a test ahead;** above 120 minutes it says so and skips nothing. | The minutes-a-day number covers all decks, so per-deck checks could each say "fits" when together they don't. | spec §2, §5; `deck-test.html?edit`, `?max` |
| D34 | **Reminders are build step 4** (Polish becomes step 5): at most one a day, only when cards are due, at about the time the first session after step 4 ended (rounded to the half hour), changeable in Settings. Never card text, deck names or counts leave the phone. | The user decided they want reminders. A separate step keeps steps 1–3 independent of the user's A/B choice. | spec §6, §7; publishing.md; product-brief |
| D35 | **The reminder ask:** on Done, from a tap (iPhone requires it), until answered; "Not now" ends it; Settings has a switch. Not shown where reminders can't arrive. No icon number (1.1 list). | From ui-designer (P-UI-3). Chief changed one rule after the Impeccable critique: leaving Done by Back to home no longer counts as "Not now", so a habit tap can't lose the only ask. | publishing.md; spec §6; `review-done.html?remind` |
| D36 | **Remove test sits at the end of the form,** not in the sticky bar. | Observed at 360×640: in the sticky bar it cut the "It fits" answer in half. | `deck-test.html?edit` |

### Made 2026-11-08, third cycle (colours)

| # | Decision | Why | Where |
|---|---|---|---|
| D37 | **Colours: ui-ux-pro-max row 103, "Flashcard & Study Tool"**: violet `#7C3AED`, lilac `#8B5CF6`, emerald `#059669` (used as mint `#7FDDB9`), on lavender `#FAF5FF` with slate ink `#0F172A`. Dark values are derived. **Roles:** violet draws only the one filled button, the rated key and focus; lilac draws the progress bar; mint draws "Done" (was yellow); deck colours stay the user's. In light mode, each deck gets a pen tone for its swatch. Purple moves to orchid: `#DAA8F7`, with pen `#AD4BD0`, in light, and `#E2A0F0` in dark. In dark, the sheet gets a `#4A4560` hairline on its top edge (2.17 against the dimmed page). Error is `#B91C1C` / `#F87171`. Chief picked the row from ui-designer's proposal (P-UI-4). | **Why 103:** it's the skill's exact product row and its top result in both search modes. **The runner-up, row 150 (blue), wasn't shown as an option.** Its `#2563EB` sits on the user's Blue deck colour, so it would force a change to a colour the user picks, and it barely changes the old navy look. Rows 9, 78, 93 and 43 fail accent contrast (2.95–3.18) or collide with the Orange and Yellow decks. **Adaptations, all for contrast or dark mode:** row Border 1.12 → 1.23, so dividers show; Destructive 4.50 → 6.03; Accent under dark text measures 1.47 in dark mode, so it's lightened to mint for both themes. **Pen tones:** the old light swatches measured 1.22–2.01 against the page, and one value can't reach both 3:1 as a swatch and 4.5:1 under dark text. **Measured (WCAG 2.x, light / dark):** button text 5.70 / 4.98; rated key text 5.70 / 4.98; key labels 16.64 / 15.32; secondary text 7.06 / 7.74; error 6.03 / 6.63; focus ring 5.31 / 6.73; progress against the track 3.22 / 5.08; swatches 3.50–4.17 / 6.59–10.62; text on highlights 8.51–14.03 / 6.41–10.33. Not reopened: fonts, layout, screens, copy. | product-brief tokens; UI-DESIGN-BRIEF; `mockups/highlighter.css`; design-plan |

## Tasks

| ID | Owner | Task | Status |
|---|---|---|---|
| P-UI-1, P-DET-1, P-CR-1 | ui-designer, chief, code-reviewer | 2026-11-07 reviews | Done |
| R-GAP-1 | competitor-researcher | What step 1 misses compared with current apps | Done 2026-11-08. It led to D16–D18 and D24. |
| L-FSRS-1 | learning-specialist | Anki settings and ts-fsrs single-step rules | **Ran 2026-11-08** under the coordinator's first message, before the correction put the project back in planning. Chief used its report only as leads and re-checked every claim a decision rests on. Not used this cycle. |
| P-UI-2 | ui-designer | Copy for the storage screen, failure lines and drafts | Done (written proposal). Chief built and checked the mockups. |
| P-RUN-1 | chief | Ran pinned ts-fsrs 6.0.0 in a scratch folder (not the project) | Done: fsrs-notes §6–§7 |
| R-SPACE-1 | competitor-researcher | Short-horizon spacing, cramming, FSRS and test dates, RemNote, Anki | Done 2026-11-08. Chief re-checked Cepeda 2008 in the PDF. Not opened in full: Rawson & Kintsch 2005, Dunlosky 2013, Karpicke & Roediger 2007, Kang 2014. |
| R-NOTIF-1 | competitor-researcher | What a no-server home-screen app can do for reminders | Done 2026-11-08. Nothing was tested on a phone. |
| P-RUN-2 | chief | Easy levers in pinned ts-fsrs 6.0.0, fixed clock, scratch folder outside the project | Done: fsrs-notes §9, scenarios 4, 5, 8, 15 |
| P-UI-3 | ui-designer | Written plan and copy: reminder ask, Settings row, Test mode states | Done (frontend-design loaded; Impeccable degraded, written plan only). Chief built the mockups, checked 390 px light/dark and 360×640 (no overflow), and ran a degraded Impeccable critique (detector clean). **ui-designer's rendered critique of P-UI-2 and P-UI-3 hasn't run.** |
| P-UI-4 | ui-designer | Choose the colour trio from ui-ux-pro-max's palettes (written plan, frontend-design's two passes) | Done 2026-11-08. It proposed row 103 with row 150 as the alternative; chief chose 103 alone (D37). Loaded: frontend-design and ui-ux-pro-max (the Skill tool loaded the user-level copy; the project's CSV and references were read directly). Impeccable's SKILL.md loaded, but its launcher didn't run (no shell). |
| P-RUN-3 | chief | Apply D37 to `mockups/highlighter.css` and the mockup HTML. Measure contrast. Screenshot 33 states, light and dark, at 390×844 (`npm run shot`) and 360×640 (a scratch wrapper with the same checks, because the tool has no 360 viewport). | Done. Before shots are in `screenshots/colour-before/`, after shots in `screenshots/colour-after/`. Impeccable's detector on `mockups/` found only the older type-step advisory on home and index. |
| P-UI-5 | ui-designer | Rendered critique of D37 (Impeccable critique, pro-rules checklist) | Done 2026-11-08: **PASS**, Impeccable heuristics 30/40, with no required fixes. Chief applied both optional changes (purple in dark, the dark sheet's edge) and re-shot. Loaded: frontend-design, Impeccable (`critique.md`; its launcher didn't run, as there's no shell), and ui-ux-pro-max. Impeccable's own two isolated sub-agents didn't run: ui-designer did the design review and chief ran the detector, kept apart until both were done. No critique snapshot was saved. |
| S1-BUILD | frontend-builder | Build step 1 per spec §7 | Waiting for the user to say to start |
| S2-PLAN | chief | Draw Settings (Export, Restore, confirm; the Reminders row joins in step 4). Check that export saves a file from an iPhone home-screen app. | Next planning task |
| S4-PLAN | chief | Reminders through the Cloudflare sender (option B): the Worker's design, what it stores, the 10 ms check, and how a phone signs up | Unblocked 2026-11-08 (the user chose B). Plan it before step 4. The user makes the Cloudflare account. |

## Acceptance

- **Step 1:** checks 1, 3, 4 and 5 in [spec §5](product-spec.md), its "Also test" list (now with Easy on a new card: 13.15 days), and fsrs-notes §6. H4 re-checked through Dexie. QA, an independent code review and ui-designer's rendered critique are required in the build.
- **Step 3:** spec §5 "Step 3 also tests".
- **Step 4:** spec §5 "Step 4 also tests", through the Cloudflare sender.

## Open, for the user

- _Resolved 2026-11-08:_ reminders go through a small free Cloudflare sender (option B). The user chose it ("Free Cloudflare sender"). Cloudflare's account guide asks only for an email and a password; the sign-up form itself wasn't checked. The user makes the account before step 4.
- Saying when to start building, plus commits and publishing.
- GitHub Pages: Settings → Pages → Source → "GitHub Actions" (no Pages site existed on 2026-11-08).
- Which phone you use (iPhone or Android).
- **CLAUDE.md wording** (chief can't edit it): its FSRS rule still says the model "may lengthen" steps. Suggested: "only the 1-minute learning and relearning steps (Again) and the library's built-in Hard step on them (90 seconds) are set delays; model override is off; desired retention is 0.9, and 0.95 for Easy." If you pick reminders option B, its first line should also say "plus a small reminder sender on Cloudflare".

## Open, for later cycles (not blocking steps 1–3)

- ui-designer's rendered critique of the P-UI-2 and P-UI-3 mockups.
- A phone test of anything step 4 relies on, through the Cloudflare sender.
- Side finding (fsrs-notes §9): the model predicts about 87% recall when cards come due, not 90%, because cards rated Good right after an Again wait the 1-day minimum. It comes from the step rule, not Easy. Revisit only if the two-week test shows too many lapses.
- **Backlog:** a pressed state on `.btn-text`; `aria-disabled` on the stepper's ends at 5 and 120 (P-UI-3). From P-UI-5: the sheet grip is about 1.3:1 (fine while Cancel is the exit; it needs 3:1 if swipe-to-dismiss is ever specified); `review-answer.html?rated=good` says "11 left" but keeps the 12-left bar width (mockup content).
