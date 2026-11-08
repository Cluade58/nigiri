# How the scheduler works (FSRS notes)

_Audited 2026-11-07. Updated 2026-11-08 with your step rule, a run of the pinned library, Anki's settings (§8), a shorter Easy (§9) and Test mode (§10). Covers `ts-fsrs@6.0.0`, the pinned library ([product-brief.md](product-brief.md)), and compares it with Anki. The rules Nigiri follows are in [product-spec.md §2](product-spec.md). These notes explain them._

**How to read this:**
- **"Verified"** means I read it in the source linked next to it, on the date given.
- **"Observed"** means chief-officer ran the pinned `ts-fsrs@6.0.0` with a fixed clock on 2026-11-08. It ran in a scratch folder outside the project, so nothing was installed in the app. The clock started at `T0 = 2026-11-09T15:00:00Z`.
- **"Unverified"** means it's an inference, or it comes from code another agent read and I didn't re-check.
- **Exact numbers** for any card's interval come from running the pinned library, never from guessing. Fuzz is off, so the same input always gives the same output (scenario 12).

## 1. Versions

| | Release | Memory model | Source |
|---|---|---|---|
| **Anki** (latest stable) | 26.09.4. GitHub marks it "Latest"; the page shows 4 Nov with no year. | **FSRS-6.** Its 25.07 notes say "FSRS-6 brings further algorithm improvements". Later official notes, including 26.09's "Update FSRS to 6.6.2" (the fsrs-rs library version, not the model), don't mention FSRS-7. FSRS-7 shows up only in a third-party fork. _"Ships FSRS-6" is inferred from those notes._ | [26.09.4](https://github.com/ankitects/anki/releases/latest), [25.07](https://github.com/ankitects/anki/releases/tag/25.07), [26.09b2](https://github.com/ankitects/anki/releases/tag/26.09b2) |
| **Nigiri:** `ts-fsrs` | 6.0.0, released 2026-10-28 | **FSRS-7**, the default for `DefaultScheduler`. FSRS-6 is available with `version: 'FSRS-6'`. Verified, and the default is observed in the 6.0.0 code (`options.version ?? "FSRS-7"`). | [ts-fsrs updates](https://open-spaced-repetition.github.io/ts-fsrs/updates/), [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md) |

## 2. Four separate layers

People mix these up. That mix-up caused the "fixed delays" confusion in our earlier notes.

### 2.1 The memory algorithm (FSRS-7)

- It keeps three numbers per card: `stability` (slow), `stabilityFast` (fast) and `difficulty`.
- Every rating updates them, including same-day reviews. FSRS-7 updates "at fractional elapsed times, including zero" and has "no separate `enableShortTerm` same-day formula".
- Verified in the [FSRS-7 model page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md).

### 2.2 Learning and relearning steps (a setting)

**What they are:** set delays for cards still being learned, kept separate from the model. "Learning-step scheduling is still a middleware policy" ([FSRS-7 page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md)).

**Nigiri's values (your rule, 2026-11-08):** "the only steps that should be put on is again, where its 1 min for learning and relearning, everything else shld be put up to the fsrs system."
- `learningSteps: ['1m']` and `relearningSteps: ['1m']`
- `allowModelOverride: false`
- graduating interval 1 day (the default)

The library's defaults, for comparison: `['1m', '10m']`, `['10m']`, 1 day, and model override on for FSRS-7 ([DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md); also observed in the code).

**How a single step is applied.** Read in the 6.0.0 code: `calculateLearningSteps` and `getLearningStepInterval` in `dist/middlewares-*.mjs`. Every result is also observed (§6).
- **Again:** the step, 1 minute. This applies to new, learning and relearning cards, and to a review card you forgot (a lapse).
- **Hard:** with only one step, 1.5 × that step, rounded to whole seconds, which is 90 seconds. That applies only on new, learning and relearning cards. On a review card, Hard is the model's interval.
- **Good:** there's no next step, so the card graduates. It gets the model's interval, never less than the graduating interval (1 day).
- **Easy:** never gets a step. It gets the model's interval, never less than 1 day.
- **Anki does the same with one step:** Hard is "1.5 times that step", capped at "at most 1 day longer than the learning step" ([deck options](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md), opened 2026-11-08).

**Model override.** When it's on, which is FSRS-7's default, the model may lengthen a step. It can lengthen Again up to the graduating interval (1 day), and any other rating without limit (verified in the code).
- **Observed with the old defaults:** a forgotten review card rated Again came back after **1.2 hours**, not 10 minutes.
- **With your 1-minute steps and override on:** a forgotten card's Again also became 1.2 hours, and Hard on a new card became 14.3 hours.
- **Override off:** every step is exact. Nigiri turns it off, because your rule says Again is 1 minute for relearning too.

**What's still a set delay besides Again:**
- **Hard's 90 seconds on a card you're still learning.** Built-in options can't make Hard FSRS-calculated while Again stays at 1 minute. Override is one switch for every rating, and an empty step list removes Again's step too. Anything else would be a custom scheduler, which the project rules out.
- **Good and Easy never come back sooner than 1 day** (the graduating interval). Observed: Good 1 minute after an Again gives exactly 1 day, where the model alone would give about 27 minutes.

**Fixed step delays are fine here.** Anki says to keep steps "shorter than 1d" so they "can be completed on the same day", and to "keep the number of learning steps to a minimum" ([deck options](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md)). Ours do both.

### 2.3 Review intervals (calculated)

- **How:** once a card graduates, its interval is the time at which its predicted recall falls to the target (0.9, or 0.95 after Easy: §9). The model "numerically solves the mixed curve" for that point and returns fractional days ([FSRS-7 page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md)).
- **Depends on history:** the interval depends on the card's memory state, which comes from its whole review history. **No rating has a fixed review interval.**
- **Order:** for one card at one moment, the monotonic policy keeps Hard ≤ Good ≤ Easy. They can be equal at the maximum interval ([built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md)). Once a rating's interval is 1 day or more, the next rating up is kept at least 1 day longer (`calculateScheduleDay` in the 6.0.0 code). Observed with Easy at 0.95: 33.3 ≤ 92.4 ≤ 93.4 days (scenario 5).

### 2.4 Scheduling policies (settings around the model)

| Policy | DefaultScheduler | Nigiri | Source |
|---|---|---|---|
| Desired retention | 0.9 | 0.9 for Again, Hard and Good; **0.95 for Easy** (§9) | [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md) |
| Model override | on for FSRS-7 | **off** | 6.0.0 code (`allowModelOverride = isFSRS7`) |
| Fuzz | off. When on, it's seeded from card id and review count, so it's reproducible. | off | [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md), [built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md) |
| Maximum interval | 36,500 days | default | [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md) |
| Time | FSRS-7: fractional days, so "1 day" means 24 hours after the review, with no day boundary. FSRS-6: whole days counted by UTC date (`fractionalDays: isFSRS7` in the 6.0.0 code; observed in scenario 9). | FSRS-7 | [updates](https://open-spaced-repetition.github.io/ts-fsrs/updates/), [date chrono](https://open-spaced-repetition.github.io/ts-fsrs/guide/chrono/date.md) |
| Leech suspension | not included in DefaultScheduler | none | [built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md) |

## 3. Differences from Anki that affect us

- **Model:** Anki runs FSRS-6; we run FSRS-7. Their weights can't be converted between models ([FSRS-7 page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md)), so Anki's numbers, formulas and screenshots don't carry over to Nigiri.
- **Days:** Anki's day starts at 4 am local time ([preferences](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/preferences.md), opened 2026-11-08). It converts learning steps that cross that boundary into days ([deck options](https://docs.ankiweb.net/manual/deck-options), "Day Boundaries"). The library has no day boundary. Nigiri counts a card as due once its `dueAt` has passed (decided 2026-11-07, [spec §2](product-spec.md)).
- **Fuzz:** Anki adds fuzz to reviews, and gives learning cards "up to 5 minutes of extra delay", which can't be turned off ([studying](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/studying.md), opened 2026-11-08). We have none, so 1 minute is exactly 1 minute.
- **Learn-ahead:** when nothing else is left, Anki shows learning cards up to 20 minutes early ([preferences](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/preferences.md)). We wait for them instead (§5).
- **What carries over:**
  - the single-step rule: Hard is 1.5 × the step
  - the rating meanings ([studying](https://docs.ankiweb.net/studying.html))
  - "Hard … is a passing grade, not a failing grade"
  - "Do not change the parameters manually"
  - steps shorter than a day ([deck options](https://docs.ankiweb.net/manual/deck-options))

## 4. Corrections to our earlier claims

| Earlier claim | Correction | Status |
|---|---|---|
| "On a new card: Again 1 min, Hard about 5½ min, Good 10 min, Easy 1 day or more" (spec §2, 2026-11-07) | These are the **learning-step** results from the docs' example, which has model override off. They describe steps, never review intervals. | Corrected 2026-11-07, replaced 2026-11-08 by §6 |
| "A known card rated Again comes back in 10 minutes" | That was the old relearning step, and model override could lengthen it. Observed: it came back after 1.2 hours. Now it's exactly 1 minute (override off). | Corrected 2026-11-08 |
| "The 1- and 10-minute steps are settings, and the model can lengthen them" (spec §2) | Your rule replaces them: 1-minute steps, with override off, so steps are exact | Replaced 2026-11-08 |
| "Wait for a card due within 10 minutes; 10 minutes is the longest step" (D2) | The longest set delay is now Hard's 90 seconds, so the window is 90 seconds. Under the old defaults, the 10-minute window would have missed a forgotten card (1.2 hours). | Replaced 2026-11-08 |
| "Hard and Good can shift slightly under FSRS-7" | "Slightly" was unsupported. With override on, they can be replaced by a longer model interval. | Removed 2026-11-07 |
| "Using Hard after forgetting makes intervals too long" | The verified wording: "Hard should not be used when you forgot the answer; it is a passing grade". | Replaced 2026-11-07 |
| "A card becomes due when its predicted recall reaches 90%" | True for **review** cards, whose interval is solved to the target. Not true for cards on a learning step. | Narrowed 2026-11-07 |
| "A new card is due the moment it's made" | Observed: `dueAt − now = 0 ms` | Verified 2026-11-08 |
| Mockup: after Again, "It comes back in about a minute" | It now says "It comes back later in this session". With 1-minute steps and override off, that's always true for Again. | Corrected 2026-11-07 |

## 5. Recommended configuration

```ts
await DefaultScheduler({
  version: 'FSRS-7',
  desiredRetention: { 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.95 }, // Again, Hard, Good, Easy
  learningSteps: ['1m'],
  relearningSteps: ['1m'],
  allowModelOverride: false,
})
```

Change nothing else. These are the values observed in `scheduler.config`: graduating interval 1, short-term on, fuzz off, maximum interval 36,500, fractional days on.

**Why:**
- **FSRS-7, not Anki's FSRS-6 (decided 2026-11-08):**
  - Anki runs FSRS-6 with its own 4 am local day boundary. The library has no such boundary: picking FSRS-6 here counts whole days by **UTC date**.
  - Observed: the same 40-minute gap between two Goods gave stability **7.32** when it crossed UTC midnight and **2.31** at midday. Under FSRS-7, both gave **6.30**.
  - So "FSRS-6 like Anki" isn't actually available in this library. FSRS-7's real elapsed time also fits "due means due now".
  - Nigiri starts with no history, so the rule that cards without complete history "must remain on FSRS-6" doesn't apply ([updates](https://open-spaced-repetition.github.io/ts-fsrs/updates/)).
  - Switching models after friends have cards would mean export, wipe and reimport, so this is settled before the build.
- **Easy 0.95, the rest 0.9 (your rule, 2026-11-08):** a shorter Easy with retention around 90%. Why 0.95, and what it gives: §9.
- **0.9:** the default in both Anki and ts-fsrs. Anki says "Above 90% the workload increases very quickly" ([deck options](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md)).
- **Steps `1m` and `1m`, override off:** your rule. Again comes back after exactly 1 minute in the same session, both for new cards and forgotten ones.
- **Fuzz off:** reviews stay reproducible, which keeps the fixed-clock checks simple. For a few friends, cards answered alike clumping together matters little. Revisit only if the two-week test shows clumping hurts.
- **Maximum interval 36,500 days:** the default in both ("100 years" in Anki).
- **No optimizer and no parameter changes:** Anki lists fewer than "a few hundred" reviews as a reason FSRS may perform poorly ([deck options](https://docs.ankiweb.net/manual/deck-options)).

**The app's own rules:**
- **Due means due now:** `dueAt <= now` (decided 2026-11-07).
- **Waiting:** the session counts down to a card from this session due within 90 seconds (`dueAt <= now + 90 s`, the longest set delay); otherwise it ends with Done (window changed 2026-11-08).
  - No learn-ahead: in FSRS-7 an early answer is a different review (scenario 10), and your 1 minute stays a minute.
  - With these settings, nothing from a session comes back between 90 seconds and 1 day.
- **Clock moved back:** pass `now` as the later of the tap and the card's `lastReviewAt`. FSRS-7 throws an error otherwise (scenario 13).

## 6. Verification scenarios

Each scenario runs the **pinned** library with a fixed clock (`now` passed in). The builder's tests should check each **property**; with fuzz off, the observed numbers are also repeatable.

**Status:** results below were observed on 2026-11-08 with the §5 settings, `T0 = 2026-11-09T15:00:00Z`. Scenarios 4, 5, 8 and 15 were re-run after Easy moved to 0.95; the others don't depend on Easy's target (14 and 7 were re-checked: unchanged).

| # | Scenario | Observed |
|---|---|---|
| 1 | **New card:** `newCard({ now })` is due at `now` | Due at creation: 0 ms. Pass. |
| 2 | **Again on a new card** | Learning, due in exactly 60 s. Pass. |
| 3 | **Hard on a new card** | Learning, due in exactly 90 s |
| 4 | **Good / Easy on a new card** | Review, due in 4.78 days / 13.15 days (both at least 1 day). Easy was 53.87 days at 0.9. Pass. |
| 5 | **Rating order** on a review card at its due time | Hard 33.3 ≤ Good 92.4 ≤ Easy 93.4 days (Easy held to Good + 1 day; it was 175.0 at 0.9). Pass. |
| 6 | **Same ratings, different history** | Not run. The spacing-effect expectation is still a hypothesis. |
| 7 | **Lapse:** a review card (last interval 26.2 days) rated Again | Relearning, `lapses` 1, due in exactly 60 s. At that time: Again 60 s, Hard 90 s, Good 1 day (back to Review), Easy 2 days. The new interval (1 day) is shorter than before the lapse. |
| 8 | **Target holds:** predicted recall at `dueAt` is about the rating's target | Holds where the model sets the interval: Good 0.9000 every time in a chain, Easy on a new card 0.950. Lower where a 1-day minimum stretched it: 0.744 after Again then Good, 0.865 after a lapse then Good, 0.929 for Easy held to Good + 1 day. Pass, with that limit. |
| 9 | **Exact time:** the same 40-minute gap, across UTC midnight and at midday | FSRS-7: identical (stability 6.30 both times). FSRS-6: different (7.32 vs 2.31). |
| 10 | **Early review:** Good 20 s vs 60 s after an Again | Stability 0.350 vs 0.415: an early answer is a different review |
| 11 | **Cap** at 36,500 days | Not run |
| 12 | **Repeatability:** same input twice; input unchanged | Identical output, and the input card is unchanged. Pass. |
| 13 | **Clock moved back:** `now` 1 hour before `lastReviewAt` | FSRS-7 **throws** "elapsedDays must be finite and non-negative". With `now` clamped to `lastReviewAt`, it works. |
| 14 | **Learning card** after Again, at its due time | Again 60 s, Hard 90 s, Good 1 day, Easy 2 days |
| 15 | **Learning card** after Hard, at its due time | Again 60 s, Hard 90 s, Good 1.77 days, Easy 2.77 days (Good + 1 day; it was 3.86 at 0.9) |

## 7. H1–H8, checked 2026-11-08

These were raised by the 2026-11-07 planning code review. The save guard in [spec §3](product-spec.md) depends on H1 or H2. All are observed against the pinned library, in a scratch folder.

- **H1. Pass.** `reps` goes up by 1 on every review, including Again on New, Learning and Relearning cards. Sequence tested: Again, Again, Hard, Good, Good, Again, Again, Good.
- **H2. Pass.** `lastReviewAt` is set to `now` on every review.
- **H3. Field names match spec §4,** plus `cardId`.
  - The card has `stability`, `stabilityFast`, `difficulty`, `state`, `scheduleStatus`, `dueAt`, `lastReviewAt`, `cardId`, `reps`, `lapses`, `scheduledDays` and `learningStep`.
  - `state` is a number from the library's `State` enum (New is 0).
  - `scheduleStatus` took the values `new`, `learning` and `review`. DefaultScheduler has no leech policy, so nothing is marked "not active" and the due query needs no status filter.
- **H4. Pass with `structuredClone`,** the copy method IndexedDB uses: a copy gives identical `review()` output. Still to confirm through Dexie in the build.
- **H5. The revlog carries the card id.**
  - Fields: `cardId` (string), `rating`, `state`, `scheduleStatus`, `stability`, `stabilityFast`, `difficulty`, `scheduledDays` and `learningStep`.
  - Date fields: `dueAt`, `reviewTime` and `lastReviewAt`. `lastReviewAt` is null on a card's first review, so Restore must accept null there.
- **H6. `cardId` accepts a string or a number.** If it's missing, the library makes a UUID. The app passes its own id, so the card record and the library agree.
- **H7. Answered.** With override on, the model stretched a forgotten card's step past 10 minutes (1.2 hours). With override off, which is our setting, it's exactly 1 minute.
- **H8. FSRS-7 throws an error** when `now` is before `lastReviewAt`. The rule in §5 (clamp `now`) prevents it.

**Still unverified:**
- H4 through Dexie itself.
- Scenarios 6 and 11.
- The year of Anki 26.09.4's release date. Wikipedia lists 26.09.3 on 23 September 2026; I didn't confirm it.
- Anki's default leech action. The manual's leeches page describes tag and suspend; another agent read "Tag Only" in Anki's source. It doesn't matter, because leeches are cut.
- Published benchmark comparisons of FSRS-6 and FSRS-7. They weren't checked and weren't used for any decision here.

## 8. Anki's settings and modes, and what Nigiri does

Researched 2026-11-08 from Anki's manual (raw pages on GitHub, which show no dates), Anki's release notes, and the ts-fsrs 6.0.0 code. **Scope rule:** a setting is in only if someone uses it in the first month.

| Setting | Anki (source) | ts-fsrs 6.0.0 | Nigiri |
|---|---|---|---|
| Learning and relearning steps | Keep them "shorter than 1d" and few; blank steps are "an experimental feature" ([deck options](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md)) | `learningSteps`, `relearningSteps` | `['1m']` and `['1m']` (your rule) |
| Hard on a single step | "1.5 times that step", at most 1 day longer (deck options) | Same, rounded to seconds | 90 s |
| Desired retention | 90%; "keep it lower than 97%" (deck options) | `desiredRetention`, one number or one per rating | 0.9; Easy 0.95 (§9) |
| Optimize parameters | About monthly; fewer than "a few hundred" reviews fits poorly (deck options) | `weights`; the optimizer is a separate package | Cut: nobody has that many reviews in month one |
| Reschedule cards on change | Off by default (deck options) | `Reschedule` API | Cut: there are no settings to change |
| Ignore cards reviewed before | For the optimizer only (deck options) | None | Cut |
| Health check | Runs while optimizing (deck options) | None | Cut |
| Historical retention | Assumes 90% for missing history (deck options) | None | Cut: Nigiri keeps the full history |
| Simulator and workload | Estimates reviews or minutes a day (deck options) | None found | Cut: the fit check (step 3) answers "does it fit?" |
| Easy Days | Lighter days of the week (deck options; [24.11](https://github.com/ankitects/anki/releases/tag/24.11), Nov 2024 by its version name) | None | Cut |
| Load balancing | "Within your fuzz range", picks days with fewer reviews (24.11) | None | Cut: it needs fuzz |
| Fuzz | Always on; learning cards get up to 5 minutes ([studying](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/studying.md)) | `enableFuzz`, off | Off |
| Maximum interval | 100 years (deck options) | 36,500 days | Default |
| Learn-ahead limit | 20 minutes: when nothing else is left, learning cards show early; 0 means "always wait the full delay" ([preferences](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/preferences.md)) | None (choosing cards is the app's job) | Not adopted: Nigiri waits up to 90 s (§5) |
| Next day starts at | 4 am (preferences) | None | None: due means due now |
| Leeches | 8 lapses, then warnings every 4 more ([leeches](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/leeches.md)) | `leech` policy, opt-in | Cut: it takes 8 forget-and-relearn cycles |
| Same-day reviews | "repeating a card multiple times in a single day does not significantly contribute to long-term memory" (deck options; no study cited) | FSRS-7 updates on real elapsed time, same day included | FSRS-7 handles them; no setting |
| Daily limits on new cards and reviews | Per deck (Anki manual; not re-read on 2026-11-08) | None | Cut: no caps (decided) |

**The modes:**
- **Card states:** Anki's studying page names New, Learning and To Review; relearning is a step type in deck options. ts-fsrs uses New, Learning, Review and Relearning (observed). Nigiri stores the library's state as it is.
- **Bury and suspend:** Anki hides buried cards until the next day, never burying learning cards, because "time is of the essence". Suspended cards stay hidden until you unsuspend them ([studying](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/studying.md)). Not applicable: Nigiri has no sibling cards and no suspend.
- **Filtered decks and custom study:** not applicable. Nigiri has none. If Test mode (step 3) ever shows cards early, it needs its own review first, because of scenario 10.
- **Hard is a pass.** The studying page describes Hard as "correct, but you had doubts about it or it took a long time to recall", and the deck options page calls it "a passing grade" (2026-11-07 audit). Nigiri's hint line says the same.

## 9. A shorter Easy (2026-11-08)

**Your rule:** "Dont make the easy for fsrs soo long. desired retention shld be at around 90%". Last run, Easy on a new card gave 53.87 days against Good's 4.78, and on a known card 174.95 against 92.44.

**Levers in ts-fsrs 6.0.0** (code read, then run, on 2026-11-08). `DefaultScheduler` takes only `weights`, `enableShortTerm`, `desiredRetention`, `learningSteps`, `relearningSteps`, `allowModelOverride`, `enableFuzz`, `maximumInterval`, `graduatingInterval` and `clearStatsOnForget`.

| Lever | What it does | Used? |
|---|---|---|
| **Desired retention per rating** (`desiredRetention: { 1, 2, 3, 4 }`) | The rated card's interval is solved to that rating's target: `nextInterval(memoryState, desiredRetention[grade])` (`@open-spaced-repetition/srs-kit` 1.0.0). The card's memory doesn't change (observed: stability after Easy is 11.7841 at either target). | **Yes.** No set delay, no new scheduler. _Corrected 2026-11-08 (LS-1):_ it isn't documented. The DefaultScheduler page and `DefaultSchedulerOptions` type it as one number; the object form is only in the retention policy's exported type and the run-time code (`middlewares-DSIyRr_E.mjs` 353–385, srs-kit `scheduler-BnkL-8NY.js` 413). The app needs one cast, and tests pin the resulting config and Easy's 13.15 days, so an upgrade that drops it fails a test. |
| Weights (34 numbers for FSRS-7) | Easy's starting stability is `w[3]` (11.7841), and an Easy bonus weight multiplies stability growth. Changing them changes what the model believes about memory, for every later review. | No. Anki: "Do not change the parameters manually". |
| Maximum interval | Caps every rating with a set number. | No. |
| Graduating interval | A minimum, so it can only lengthen. | No. |
| Cost-based retention (`schedulerCostAdrMiddleware`) | Picks a target per review from a cost policy. Not in `DefaultScheduler`: you'd assemble your own scheduler. | No: that's building our own scheduler. |
| `desiredRetention` passed to one `review()` call | Observed: an object passed this way didn't change Easy (still 53.87 days). | No. Set it once, in the config. |

**The library's floor:** Easy is always at least 1 day longer than Good once Good is a day or more (§2.3). So raising Easy's target shortens Easy only down to Good + 1 day.

**Before and after** (observed: pinned library, fixed clock `T0 = 2026-11-09T15:00:00Z`, the same cards as §6). "R at due" is the model's predicted recall when the card comes due, from `scheduler.model.forgettingCurve(card, scheduler.chrono.difference(card.lastReviewAt, dueAt))`.

| Card | Again | Hard | Good | Easy before (0.90) | Easy after (0.95) |
|---|---|---|---|---|---|
| New card | 60 s | 90 s | 4.78 d | 53.87 d | **13.15 d** (R at due 0.950) |
| Learning, after Again | 60 s | 90 s | 1 d | 2 d | **2 d** (unchanged: Good + 1 day) |
| Learning, after Hard | 60 s | 90 s | 1.77 d | 3.86 d | **2.77 d** (Good + 1 day) |
| Known card, last gap 26.2 d | 60 s | 33.33 d | 92.44 d | 174.95 d | **93.44 d** (Good + 1 day, R at due 0.929) |
| Relearning, after a lapse | 60 s | 90 s | 1 d | 2 d | **2 d** (unchanged) |

Again, Hard and Good are identical before and after.

**Every target tried** (days; Good stays 4.78 on the new card and 92.44 on the known card):

| Easy target | 0.90 | 0.91 | 0.92 | 0.93 | 0.94 | 0.95 | 0.96 | 0.97 |
|---|---|---|---|---|---|---|---|---|
| New card | 53.87 | 43.16 | 33.92 | 25.96 | 19.08 | **13.15** | 8.06 | 5.78 |
| Known card | 174.95 | 142.63 | 114.75 | 93.44 | 93.44 | **93.44** | 93.44 | 93.44 |

**Why 0.95 (chief, 2026-11-08):**
- It's the lowest target at which Easy on a brand-new card comes back within two weeks (13.15 days; 0.94 gives 19.08), so an easy card still gets a second look before a test that's two weeks away.
- It's under Anki's "keep it lower than 97%". Only Easy moves; Again, Hard and Good stay at 0.9.
- Overall retention stays where it was (model check below).
- It's reversible. The targets are a policy, not stored memory, so changing them later only changes the next intervals, with no migration.

**What you give up:** on a card you already know, Easy is now only a day longer than Good (93.4 against 92.4 days). Easy still raises the card's stability and lowers its difficulty, so later intervals grow faster (observed in a chain: after an Easy at 93.4 days, the next Good gave 509 days). The other choice was 0.92: Easy stays clearly apart from Good on known cards (114.75 days), but a new card's Easy is still 33.92 days.

**Model check of overall retention.** These are simulated cards, not real students: 500 cards made on day 0, reviewed exactly when due for 180 days, using the model's own predicted recall as the truth. Assumed ratings: on review cards, 10% Hard and 10% or 30% Easy, the rest Good; 20% Again on new cards. One random seed, so differences under a point may be noise.
- Mean predicted recall when a review card comes due: 0.866 with Easy at 0.90 and 0.868 at 0.95.
- Simulated retention on review cards: 86.3% vs 86.8% (10% Easy), and 87.2% vs 87.9% (30% Easy). Reviews per card: 10.19 vs 10.22, and 7.45 vs 7.82.
- **Why it's under 90% either way:** a card rated Good right after an Again waits the 1-day minimum, by which time its predicted recall is about 0.72–0.77 (observed: 0.744). That comes from the 1-minute step rule and the 1-day graduating interval, not from Easy. Nothing in the built-in options changes it without changing your step rule.

## 10. Test mode (step 3), researched 2026-11-08

Research by competitor-researcher (R-SPACE-1), every source opened 2026-11-08. Chief re-read the Cepeda 2008 figures in the PDF (pp. 1095, 1099).

| # | Finding | Source | Status |
|---|---|---|---|
| 1 | The best gap between two study sessions shrinks as a share of the test delay: "from about 20 to 40% of a 1-week test delay to about 5 to 10% of a 1-year test delay" | [Cepeda et al. 2008](https://www.evullab.org/pdf/CepedaVulRohrerWixtedPashler-PS-2008.pdf), Psychological Science 19(11), Nov 2008 | Verified by chief |
| 2 | Test 7 days away: best fitted gap about 3 days (43%). The best gap beat a gap of about 3 minutes by 10% in recall | same, p. 1099 | Verified by chief |
| 3 | Test 10 days away: recall rose 34% from a zero gap to a 1-day gap, and fell only 11% from 1 to 14 days | [Cepeda et al. 2009](https://escholarship.org/uc/item/1n15d7xr), Experimental Psychology 56(4) (in-press copy) | Verified (researcher) |
| 4 | "costs [of a too-long gap] are much smaller than the costs of using too short a gap" | Cepeda 2008, p. 1101 | Verified (researcher) |
| 5 | Spacing beat massing whether the test was under a minute or over a month away | [Cepeda et al. 2006](https://www.evullab.org/pdf/CepedaPashlerVulWixtedRohrer-PB-2006.pdf), Psychological Bulletin 132(3), p. 365 | Verified (researcher) |
| 6 | Flashcards on a day-5 test: spaced 54%, crammed 34%. Spacing won for 90% of students, yet 72% believed cramming worked better | [Kornell 2009](https://web.williams.edu/Psychology/Faculty/Kornell/Publications/Kornell.2009b.pdf), Applied Cognitive Psychology, Jan 2009 | Verified (researcher) |
| 7 | A review of every card the day before the test helped spaced and crammed cards equally, but only marginally (p = .09, across experiments) | Kornell 2009, Experiment 3 | Verified, weak |
| 8 | Expanding and equal gaps end up similar on a delayed test | [Kang et al. 2014](https://europepmc.org/article/MED/24744260) (abstract); Cepeda 2006, Table 8 | Abstract only |
| 9 | ts-fsrs v6 gives predicted recall on any date: `scheduler.model.forgettingCurve(card, scheduler.chrono.difference(card.lastReviewAt, at))` | [migration guide](https://open-spaced-repetition.github.io/ts-fsrs/guide/migration.md) | Observed by chief: returns 0.900 at a Good card's due time |
| 10 | No exam advice from the FSRS authors. A higher target shortens every interval ([optimal retention](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-optimal-retention), last edited 12 Dec 2024). The FSRS Helper add-on's "Advance" shortens intervals before a test, with no outcome data | [fsrs4anki-helper](https://github.com/open-spaced-repetition/fsrs4anki-helper) | Verified (researcher) |
| 11 | RemNote's exam scheduler spreads new cards so all are learned by the exam (or marks them all due), then gives a "Final Review". Editing recalculates. What happens after the exam isn't documented. Free has 1 exam; Pro ($8 a month) has unlimited | [Preparing for an Exam](https://help.remnote.com/en/articles/9101991-preparing-for-an-exam) (21 Aug 2026), [Understanding the Exam Scheduler](https://help.remnote.com/en/articles/9102040-understanding-the-exam-scheduler) (3 Aug 2026) | Vendor description, not evidence of learning gains |
| 12 | Anki: filtered decks are for "a big test"; review ahead is "not appropriate for repeated use"; rescheduling on a settings change is off by default. Forum advice on raising retention before exams contradicts itself (opinion) | [filtered decks](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/filtered-decks.md), [deck options](https://raw.githubusercontent.com/ankitects/anki-manual/main/src/deck-options.md) (undated) | Verified (researcher) |

**Limits:** the lab studies used two sessions, trivia or word pairs, and mostly young adults, not high-school students. No direct 14-day study without design flaws was found, and no study tests FSRS against a test date. Not opened in full: Rawson & Kintsch 2005, Dunlosky et al. 2013, Karpicke & Roediger 2007, Kang 2014.

**Rules (decided by chief-officer, 2026-11-08):**
1. **New cards are spread over the days before test day.** Today's share = ⌈(unseen new cards + new cards first seen today) ÷ days left⌉ − new cards first seen today, in writing order. Days left = calendar days from today to the test day, at least 1. It's worked out again on every count, so a card added today joins the pool and a missed day raises the share. *Why:* a same-day gap costs the most (rows 3–4), and an even share matches the fit check, which divides by days left. *Example:* 10 new cards with the test 5 days away: 2 a day, none on test day. With the test tomorrow or today, all are due now. _Amended 2026-11-08 (D63, after LS-1):_ the share is a pace, not a limit. The deck page offers **Study 3 cards early**, which introduces the held-back new cards now. The spacing evidence above supports "all due by the day before", not holding cards back, and a new card has no memory state, so studying it early isn't an early review.
2. **After test day,** from the next calendar day, the test no longer applies, and the deck gets "Add a test" again. The record stays until it's replaced or removed. There's nothing to undo, because Test mode never wrote to a card. *Why:* no source documents an after-the-test mode, and FSRS keeps scheduling the cards for the long term.
3. **Editing or removing a test** uses the same screen. It changes only the share and the fit check, never `dueAt` or any other card field. Remove test has no confirm. *Why:* Anki keeps rescheduling off by default, and ts-fsrs's `reschedule()` "can change the schedule".
4. **A test today** is allowed: all new cards in that deck are due, and the fit check divides by 1. Cards that aren't due aren't shown early. A not-due card's predicted recall is at or above 90% (scenario 8), except cards stretched by a 1-day minimum, and an early answer is a different FSRS-7 review (scenario 10). A last look at every card before the test is on the 1.1 list (row 7 is weak evidence).
5. **The date is a calendar day,** stored as `YYYY-MM-DD` text. Today is the phone's local date. Days left is a difference in calendar days, not 24-hour blocks, so a daylight-saving change can't make it 0.96. A phone that changes time zone keeps the same test day. Restore checks it's a real date.
6. **"Weakest cards below target" is removed** from the queue. *Why:* intervals are solved to the target and fuzz is off, so a card set by the model stays above 90% until it's due (scenario 8: 0.9000 at due), and overdue cards are already first in the queue. The exceptions are cards stretched by the library's 1-day minimums (observed: 0.780 at 12 hours and 0.744 at 24 hours after Again then Good), and showing any card before its due time would be reviewing early.
7. **The fit check adds up every deck with a test ahead,** because the minutes-a-day number covers all decks. Above 120 minutes, the top of the stepper, it says so, and nothing is skipped.

**Screens:** ui-designer's written plan (P-UI-3, 2026-11-08), drawn by chief in `mockups/deck-test.html?edit` and `?today`, and `mockups/deck.html?test`. Copy: "Edit test", "Remove test", "Not saved. Tap Save test again.", "Not removed. Tap Remove test again.", "needs about 12 min today", "Your AP Bio unit 4 test adds 9, so 12 min a day in all.", and above 120: "That's more than 120, the most you can set. You can still save the test: reviews start with the cards waiting longest, and none are skipped."

**Saying the plan (D44, 2026-11-08):** the deck's test line and the test screen now state rule 1 in counts: "5 not studied yet: 2 today, all by Thursday" (or "all due today" when the share is everything left). "Studied" means at least one review. The optional page "How Nigiri picks your cards" (D43) says what a day off and a moved date do, in plain words. Still no percentage, grade or prediction: readiness is on the 1.1 list.
