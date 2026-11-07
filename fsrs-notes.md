# How the scheduler works (FSRS notes)

_Audited 2026-11-07. Covers `ts-fsrs@6.0.0`, the pinned library ([product-brief.md](product-brief.md)), and compares it with Anki. The rules Nigiri follows are in [product-spec.md §2](product-spec.md). These notes explain them._

**How to read this:**
- **"Verified"** means I read it in the source linked next to it on 2026-11-07.
- **"Unverified"** means it's an inference, or it comes from code another agent read and I didn't re-check.
- **Exact numbers** for any card's interval must come from running the pinned library, never from this page.

## 1. Versions

| | Release | Memory model | Source |
|---|---|---|---|
| **Anki** (latest stable) | 26.09.4. GitHub marks it "Latest"; the page shows 4 Nov with no year. | **FSRS-6.** Its 25.07 notes say "FSRS-6 brings further algorithm improvements". Later official notes, including 26.09's "Update FSRS to 6.6.2" (the fsrs-rs library version, not the model), don't mention FSRS-7. FSRS-7 shows up only in a third-party fork. _"Ships FSRS-6" is inferred from those notes._ | [26.09.4](https://github.com/ankitects/anki/releases/latest), [25.07](https://github.com/ankitects/anki/releases/tag/25.07), [26.09b2](https://github.com/ankitects/anki/releases/tag/26.09b2) |
| **Nigiri:** `ts-fsrs` | 6.0.0, released 2026-10-28 | **FSRS-7**, the default for `DefaultScheduler`. FSRS-6 is available with `version: 'FSRS-6'`. Verified. | [ts-fsrs updates](https://open-spaced-repetition.github.io/ts-fsrs/updates/), [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md) |

## 2. Four separate layers

People mix these up. That mix-up caused the "fixed delays" confusion in our earlier notes.

### 2.1 The memory algorithm (FSRS-7)

- It keeps three numbers per card: `stability` (slow), `stabilityFast` (fast) and `difficulty`.
- Every rating updates them, including same-day reviews. FSRS-7 updates "at fractional elapsed times, including zero" and has "no separate `enableShortTerm` same-day formula".
- Verified in the [FSRS-7 model page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md).

### 2.2 Learning and relearning steps (a setting)

**What they are:** set delays for cards still being learned, kept separate from the model. "Learning-step scheduling is still a middleware policy" ([FSRS-7 page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md)).

**DefaultScheduler's values** ([DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md)):
- learning steps `['1m', '10m']`
- relearning steps `['10m']`
- graduating interval 1 day

**How a step is applied** ([state transitions](https://open-spaced-repetition.github.io/ts-fsrs/guide/state-transitions.md)). The page's worked example has model override switched off:
- Again goes back to the first step.
- Hard uses the average of the first two steps.
- Good moves to the next step.
- Easy skips the steps and graduates with the model's interval, at least the graduating interval.

**Model override** is on for FSRS-7. It "uses a longer model interval instead of the current step" ([built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md)).
- So a step is a **floor the model may lengthen**, not a guaranteed result.
- Only one result is confirmed by a library test: "a brand-new card rated Again is due after 1 minute". _Unverified by me: another agent read it in the library's test file._

**Fixed step delays are correct here.** Anki recommends that learning and relearning steps stay "shorter than 1d and can be completed on the same day" ([deck options](https://docs.ankiweb.net/manual/deck-options)). Ours do.

### 2.3 Review intervals (calculated)

- **How:** once a card graduates, its interval is the time at which its predicted recall falls to the target (0.9). The model "numerically solves the mixed curve" for that point and returns fractional days ([FSRS-7 page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md)).
- **Depends on history:** the interval depends on the card's memory state, which comes from its whole review history. **No rating has a fixed review interval.**
- **Order:** for one card at one moment, the monotonic policy keeps Hard ≤ Good ≤ Easy. They can be equal at the maximum interval ([built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md)).

### 2.4 Scheduling policies (settings around the model)

| Policy | DefaultScheduler | Source |
|---|---|---|
| Desired retention | 0.9 | [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md) |
| Fuzz | off. When on, it's seeded from card id and review count, so it's reproducible. | [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md), [built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md) |
| Maximum interval | 36,500 days | [DefaultScheduler](https://open-spaced-repetition.github.io/ts-fsrs/api/ts-fsrs/default-scheduler.md) |
| Time | Fractional days, so "1 day" means 24 hours after the review. No day boundary. FSRS-7 "uses fractional-day intervals". The plain date chrono defaults to whole UTC days, but that isn't what DefaultScheduler uses for FSRS-7. | [updates](https://open-spaced-repetition.github.io/ts-fsrs/updates/), [date chrono](https://open-spaced-repetition.github.io/ts-fsrs/guide/chrono/date.md) |
| Leech suspension | not included in DefaultScheduler | [built-in policies](https://open-spaced-repetition.github.io/ts-fsrs/guide/middleware/built-in.md) |

## 3. Differences from Anki that affect us

- **Model:** Anki runs FSRS-6; we run FSRS-7. Their weights can't be converted between models ([FSRS-7 page](https://open-spaced-repetition.github.io/ts-fsrs/guide/model/fsrs-7.md)), so Anki's numbers, formulas and screenshots don't carry over to Nigiri.
- **Days:** Anki converts learning steps that cross its day boundary into days ([deck options](https://docs.ankiweb.net/manual/deck-options), "Day Boundaries"). The library has no day boundary. Whether "due today" means "due now" or "due by the end of today" is our decision, and it's undecided ([spec §2](product-spec.md)).
- **Fuzz:** Anki adds fuzz to reviews, and up to 5 minutes to learning cards ([studying](https://docs.ankiweb.net/studying.html)). We have none, so cards answered alike come due together.
- **What carries over:**
  - the rating meanings ([studying](https://docs.ankiweb.net/studying.html))
  - "Hard … is a passing grade, not a failing grade"
  - "Do not change the parameters manually"
  - steps shorter than a day ([deck options](https://docs.ankiweb.net/manual/deck-options))

## 4. Corrections to our earlier claims

| Earlier claim (spec §2, 2026-11-07) | Correction | Status |
|---|---|---|
| "On a new card: Again 1 min, Hard about 5½ min, Good 10 min, Easy 1 day or more" | These are the **learning-step** results from the docs' example, which has model override off. With FSRS-7, model override is on, so Hard and Good can be longer, and Easy is the model's interval (at least 1 day). They describe steps, never review intervals. | Corrected |
| "A known card rated Again comes back in 10 minutes" | That's the relearning step, a floor the model may lengthen. | Corrected |
| "Hard and Good can shift slightly under FSRS-7" | "Slightly" was unsupported. They can be replaced by a longer model interval. | Removed |
| "Again … 1 to 10 minutes later" | After its learning or relearning step, which the model may lengthen | Corrected |
| "Using Hard after forgetting makes intervals too long" | The verified wording: "Hard should not be used when you forgot the answer; it is a passing grade". | Replaced with the source's wording |
| "A card becomes due when its predicted recall reaches 90%" | True for **review** cards, whose interval is solved to the target. Not true for cards on a learning step. | Narrowed |
| "Times are exact … no midnight boundary" | Still true of the library. Any "today" grouping would be our own rule. | Kept, clarified |
| "A new card is due the moment it's made" | From the library's source, read by another agent. | Unverified until check 4 runs |
| Mockup: after Again, "It comes back in about a minute" | It depends on the card. It now says "It comes back later in this session". | Corrected |

## 5. Recommended configuration

**Use `await DefaultScheduler({ version: 'FSRS-7', desiredRetention: 0.9 })` and change nothing else.** It matches the decision to use default parameters only. Reasons:

- **FSRS-7:** Nigiri starts with no review history, so the warning that cards without complete history "must remain on FSRS-6" doesn't apply ([updates](https://open-spaced-repetition.github.io/ts-fsrs/updates/)). It's also the library's maintained default.
- **0.9:** the default in both Anki and ts-fsrs. Anki calls it "the most important setting" and warns that workload rises steeply toward 100% ([deck options](https://docs.ankiweb.net/manual/deck-options)).
- **Steps `1m, 10m` and relearning `10m`:** they're under a day, as Anki advises, and they fit the decision that Again comes back in the same session.
- **Model override on:** the FSRS-7 default. It lets the model lengthen a step when the memory state supports it.
- **Fuzz off:** reviews stay reproducible, which makes the fixed-clock checks simple. Cards answered alike clumping together matters little for a few friends. Revisit this only if the two-week test shows clumping hurts.
- **Maximum interval 36,500 days:** the default in both.
- **No optimizer and no parameter changes:** Anki lists fewer than "a few hundred" reviews as a reason FSRS may perform poorly ([deck options](https://docs.ankiweb.net/manual/deck-options)).

**Still the app's own decisions:**
- **What "due" means on home:** due right now, or due by the end of today.
- **What a session does when the next card is minutes away.**

## 6. Verification scenarios

Each one runs the **pinned** library with a fixed clock (`now` passed in), using `preview()` or `review()`.
- Record the actual numbers it returns. Don't predict them.
- Each scenario checks a **property**, not a hardcoded delay, unless the delay is one of our configured settings.
- **Status:** every scenario below is a proposed check that hasn't run yet.

1. **New card:** `newCard({ now })` is due at or before `now`.
2. **Again on a new card:** the card is in Learning, due after at least the first step (1m), and this session shows it again. The library's test says exactly 1 minute; record what it actually returns.
3. **Good on a new card:** due no sooner than the second step (10m). Record whether model override lengthened it.
4. **Easy on a new card:** the card is in Review, due no sooner than the graduating interval (1 day).
5. **Rating order:** for a review card at one moment, `preview()` gives Hard ≤ Good ≤ Easy.
6. **Same ratings, different history:** card A is rated Good on time, and card B gets the same ratings but reviewed late. Record both next intervals and stabilities. _Unverified:_ the expectation that B's interval is at least A's (the spacing effect) is a hypothesis for FSRS-7 until this runs.
7. **Lapse:** a review card rated Again goes to Relearning, due after at least the relearning step (10m), and `lapses` goes up by 1. Good after that returns it to Review. Record whether the new interval is shorter than before the lapse (expected, unverified).
8. **Target holds:** for a review card with fuzz off and below the cap, predicted recall at `dueAt` is about 0.9 (within a small tolerance). This checks queue item 2's note.
9. **Exact time:** two reviews 2 hours apart, across midnight, count as 2/24 of a day, not 1 day.
10. **Early review:** reviewing a card hours before it's due works, and gives a different next interval from an on-time review. This matters if "due by the end of today" is chosen.
11. **Cap:** a card with very high stability gets at most 36,500 days, and Hard, Good and Easy may be equal.
12. **Repeatability:** the same input card, rating and `now` give identical output, and the input card isn't changed.

## 7. Still unverified

- That a v6 `newCard` is due at creation (source read by another agent). Scenario 1 settles it.
- Exactly when model override lengthens a step. The docs don't define the comparison.
- How much fuzz spreads intervals (it's off, so this doesn't matter now).
- The year of Anki 26.09.4's release date. Wikipedia lists 26.09.3 on 23 September 2026; I didn't confirm it.
- The awesome-fsrs wiki's inner pages didn't load, so nothing here relies on them.
