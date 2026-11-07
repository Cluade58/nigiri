# Product spec: rules the app must follow

_Draft 1, 2026-11-07. Companion to [product-brief.md](product-brief.md), which covers the why; this file covers exactly how things behave. Items marked **(proposed)** are my recommendation and need your OK. Everything else follows from decisions you've already made._

---

## 1. What makes Test mode different (honest version)

RemNote already has an exam scheduler: it spreads new cards before an exam date and shows every card once more at the end ([RemNote docs](https://help.remnote.com/en/articles/9101991-preparing-for-an-exam)). So "schedules around a test date" alone is **not** new. Nor is linking planning to practice: StudyFetch opens study sessions from a calendar, and Revu and Paced handle missed work. **This is a positioning hypothesis the beta has to prove**: students should understand the plan and choose to come back. What we add:

1. **A fit check against your real time.** "This needs about 12 min a day and you have 15. You're on track." Or: "This needs 40 min a day and you have 15. Here are your options." RemNote doesn't tell you whether the plan fits your life.
2. **Tests come from the tracker.** The test you added to the calendar *is* the deadline. One deck can serve several tests (a unit test, then the final).
3. **An honest readiness number.** It's built from FSRS recall predictions, counts cards you haven't started, and says when it's only an early estimate.
4. **Phone-first and fast,** for a high school audience. RemNote is desktop-first and widely called slow.

## 2. Readiness: exactly what it measures

**Readiness = your predicted recall on test day for the cards linked to that test, if you stopped studying now.**

- **Per card:**
  - **Reviewed cards:** FSRS retrievability at the test date, `R(test date)`, computed from the card's current stability and its last review date. This uses the `get_retrievability` / forgetting-curve function in ts-fsrs, evaluated at the test date instead of today.
  - **Cards never studied** count as **0**. You can't recall what you haven't learned, so how much of the deck you've covered is built into the score.
  - **Overdue cards:** no special case. Their R is already lower, and they get priority in the plan.
  - **Suspended cards** are excluded from the score and the plan.
- **For the test:** the plain average across all linked cards, shown as a whole percent and capped at 99%. The headline number never claims certainty.
- **"With the plan" number** (the "88% if you do 15 min a day" line): run the planned schedule forward to test day with a simple simulation. Each planned review succeeds with probability R and is graded Good, otherwise Again. Then recompute the average. It's deterministic (an expected value, not random), so the number doesn't flicker between opens.
- **Shown alongside it:** cards not started ("18 of 60 not started yet"), so a low score has a visible reason.
- **Early estimate:** while the linked decks have fewer than **100 reviews in total**, the score carries the label "Early estimate". Scheduling then uses FSRS default parameters. The per-student optimizer runs once there are about 400 reviews, and again monthly **(proposed thresholds)**.
- **Target:** the goal line defaults to **90%** predicted recall and is adjustable per test (80–95%).

**Library pinned:** `ts-fsrs@6.0.0` (MIT, needs Node ≥ 24; checked on npm 2026-11-07). Install it with an exact version (no `^`). Changing the version is a deliberate change, re-checked against the readiness math above.

**Package version ≠ algorithm version.** ts-fsrs 6.x **defaults to the FSRS-7 model**. Before coding, confirm with a test that FSRS-7 is the model in use, and set it explicitly rather than relying on the default. Every review event records both the package version and the model version (§9), so a later upgrade can tell which reviews were scheduled by which model. Also check ts-fsrs's browser build path before committing.

**Explaining the number:** wherever readiness appears, a short plain-language line next to it says what it measures and what it assumes (UI-DESIGN-BRIEF).

## 3. Test mode scheduling rules

**Core principle:** the daily plan is never stored. It's recalculated whenever the app opens or something changes, from the cards, review log, tests, available time and today's date. Changing a test date or missing a day can't leave a stale plan behind.

**Inputs for each test:**
- date
- linked decks
- target recall (default 90%)
- available study minutes per day (default 15, editable per weekday)

Time per card comes from the student's own history. Until there is enough, the defaults are 10s per review and 30s per new card.

**Daily queue, in priority order:**
1. **Due reviews.** Cards FSRS says are due today.
2. **Pull-forwards.** Cards whose predicted recall on test day is below target and whose next due date falls *after* the test. Weakest first.
3. **New cards,** paced evenly, as remaining new cards ÷ days left until **2 days before the test**. New material needs at least one night of sleep before the test.

These reviews are real FSRS reviews: they're logged and update the card. Reviewing early is fine, because FSRS accounts for the actual time elapsed.

**The fit check:** add up the estimated minutes per day and compare with the minutes available.
- **It fits:** "On track. About 12 min a day."
- **It doesn't fit:** say so plainly, with the numbers, and offer choices:
  - study more minutes
  - lower the target (say to 85%)
  - focus on the cards you've marked as priority
  - accept a lower readiness

  The app **never silently drops cards.** The day's queue is capped at the available minutes, with the weakest cards first, and anything over the cap shows as "extra if you have time".

**Situations:**

| Situation | Behaviour |
|---|---|
| **Test tomorrow (or today)** | Skip pacing. The queue is every linked card below target, weakest first, with unstarted cards marked "learn now". The message is honest: "1 day left. Focus on your 25 weakest cards (about 14 min). Long-term memory needs more time, so after the test these go back on a normal schedule." |
| **Test date changed** | Everything recalculates (it's never stored). If the test moved earlier and the plan no longer fits, the fit check fires. |
| **Missed study days** | Recalculates over the remaining days. Short streak gaps use repairs; the plan itself never punishes, it just shows the new daily number. |
| **One deck, several tests** | Each card aims at the **earliest upcoming** test it belongs to. Readiness is calculated separately for each test. After the first test passes, the card aims at the next one. |
| **Unrealistic workload** | The fit check, as above. In the extreme case (the test is in 2 days, 300 new cards), recommend narrowing to priority cards. |
| **After the test** | It's marked done once the date passes. Optional "How did it go?" with a self-reported score that's only for the student. Cards go back to normal FSRS at the deck's usual target. Prompt: "Keep these for your final?" links them to the next test. |
| **Which cards belong to a test** | **Live deck membership** (proposed): a test links to whole decks, optionally narrowed by tag. Cards added to a linked deck later join the test automatically, and the fit check updates. A fixed snapshot would quietly miss cards added the night before. |
| **Card edited** | The schedule and history are kept. Editing text is not a new card. (A future "reset this card" action is a separate, explicit choice.) |
| **Card or deck deleted** | It leaves the test and readiness immediately. Deletion is a soft delete (a tombstone, see §9): hidden everywhere, restorable for 30 days, and its review history is kept for the record. If a test loses all its decks, it shows "No study material linked" with an action to add some. |
| **Test cancelled** | Same as after the test, minus the "How did it go?" prompt. Cards go back to normal FSRS, and no history is lost. |
| **Reviewing outside the plan** | Always allowed. The plan never locks anything. "Practice more" after finishing the queue is logged as **practice** and **does not change scheduling** **(proposed)**, so cramming can't distort the long-term schedule. |

## 4. Data, backup and review integrity

**Storage:** IndexedDB on the device. The app asks for persistent storage (`navigator.storage.persist()`) after the first deck is created. Browsers can still clear storage under some conditions ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)), so backups are a core feature, not an extra.

**Every record** has a UUID, `createdAt` and `updatedAt`.

**Saving a review:** writing the review-log entry and updating the card's FSRS state happen in **one IndexedDB transaction**, so either both are saved or neither is. Each log entry also stores the card's state *before* the review, which is what makes undo possible.

**Double taps:** after a rating tap, the rating buttons turn off until the next card appears. Each card showing also has an ID, so a duplicate save is ignored.

**Undo:** "Undo last rating" works for the most recent review in the current session. It **appends** an `undo` entry pointing at the original log entry (the log stays append-only) and restores the saved "before" state in the same transaction.

**Export (one file, `.zip`):**
- `manifest.json`: `{ "format": "<app>-backup", "formatVersion": 1, "appVersion", "exportedAt", counts }`
- `data.json`: classes, assignments, tests, decks, cards, card FSRS states, the full review log (including undo and practice entries), settings (FSRS parameters, targets, available minutes), streak data
- `media/`: the image files referenced by cards

Nothing the student created is left out.

**Import:**
- **Into an empty app:** a full restore.
- **Into an app with data:** the student chooses:
  - **Replace everything.** The app first keeps an automatic snapshot of the current data, which can be undone once.
  - **Merge.** Records are matched by UUID, and the newer `updatedAt` wins. Review-log entries are combined (no duplicates by UUID). Each affected card's state is then **rebuilt by replaying its log** in time order, so the result is the same whatever order the backups were imported in.
- **Version handling:** a newer `formatVersion` than the app supports is refused with a clear message ("This backup is from a newer version. Update the app first."). Older versions are migrated step by step.
- **Bad or partial files** are rejected before anything changes.

**Backup reminders:** if the last backup was more than 14 days ago, and 3 days before any test.

## 5. Notifications (local-only boundary)

**Decision (proposed): no web push in the first release.** Web push needs a server to send messages, and the browser's subscription endpoint has to be stored on that server, which means data leaving the device ([MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)). On iPhone it also only works from a Home Screen app after a permission request triggered by a tap ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).

**Instead, fully local:**
- **In-app nudges** when the app is opened ("2 tests this week", "Back up your data").
- **Add to my phone's calendar:** export tests, assignments and planned study times as an `.ics` file. The phone's own calendar then sends reminders, with no server.
- **App icon badge** with due count via the Badging API, where supported, while installed.

Push comes back with accounts and a server, and gets documented when it does.

## 6. Calendar import (`.ics` files)

- **Supported:** single events (VEVENT) with or without times.
- **Recurring events (RRULE):** expanded into individual events for the **next 120 days**. Exceptions (EXDATE, RECURRENCE-ID) are respected.
- **Time zones:** events with TZID are converted to the device's local time. **All-day events stay as dates** with no time-zone shift. This avoids Canvas's "11:59 pm shows as all-day" and the off-by-one-day bugs.
- **Re-importing the same calendar:** matched by `UID` (+ `RECURRENCE-ID`):
  - **Unchanged:** skipped.
  - **Changed upstream:** updated, *unless* the student edited that item in the app, in which case their edit wins and the item is flagged.
  - **Gone from the file:** not deleted automatically; the student is asked.
- The import preview shows what will be added, updated and skipped before anything is saved.

## 7. Age and data policy

**Proposed. This is not legal advice; get a proper review before inviting testers and before any public launch.**

- **First release:** a **private beta** for the user plus a few testers in **several countries** (product-brief §1c). The rules depend on where each tester lives and how old they are:
  - **US:** COPPA ([FTC](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions))
  - **EU:** the age of consent for data processing differs by country, between 13 and 16 ([European Commission](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en))
  - **UK:** the ICO Children's Code applies to services likely to be used by children ([ICO](https://ico.org.uk/for-the-public/the-children-s-code-and-children-s-online-privacy/))
  - **Singapore:** PDPC guidance on children's data ([PDPC](https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-pdpa-for-children%27s-personal-data-in-the-digital-environment_mar24.pdf))
- **Before inviting testers:**
  - list each tester's country and age band
  - check the matching rules above
  - decide how a tester leaves the beta (export, then a reset that wipes the device data) and what happens if an age issue comes up
- **Beta privacy note:** write a plain-language page covering:
  - data stays on the device
  - how backup works
  - how to reset and delete everything
  - feedback is manual and optional
  - what the host can see
- **Data-flow inventory:** even a local-only app sends *some* things off the device, so write each one down with where it goes, who can see it, and how long it's kept:
  - the static host's request logs (IP addresses)
  - any third-party scripts or fonts (none allowed)
  - crash reporting (none in the beta)
  - feedback channels
- **Intended audience:** high school students, typically 13–18.
- **What the first release collects: nothing.**
  - no accounts, no analytics, no ads, no tracking
  - all data stays on the device
  - **fonts and assets are self-hosted.** Loading Google Fonts from Google's servers sends visitors' IP addresses to Google, so the app bundles its fonts. (The design mockups may use the Google Fonts links; the real app won't.)
- **Under-13 users:** since the first release collects no personal information and sends nothing off the device, it doesn't ask for age. Asking would itself be collecting data.
- **Before adding any of these:** accounts, sync, analytics, push, or AI features that send notes or images to a server. Each one changes this policy and must come with an explicit age and data decision first, following [the FTC's COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions). Probably an age screen, with under-13 users either blocked from those features or handled with parental consent.

## 8. Behaviour checks: acceptance tests beyond screenshots

These checks apply once implementation starts, alongside the screenshot loop:

1. **Offline review:** turn the network off, do 10 reviews, close the app, reopen it. All 10 are saved, and the card states and log agree.
2. **Restore a backup:** export, clear site data, import. Every record, image and review is back, and readiness shows the same number.
3. **Merge:** import an older backup into newer data. Nothing newer is lost, and there are no duplicate reviews.
4. **Change a test date:** move it earlier. The plan and fit check update immediately, with no leftovers from the old date.
5. **Repeated taps:** tap a rating 5× quickly. Exactly one review is logged.
6. **Undo:** rate, undo, rate again. The card state matches a single review, and the log shows review → undo → review.
7. **Interrupted session:** close the tab mid-session. Reopening keeps the completed ratings, the rest stay due, and nothing is half-saved.
8. **Keyboard:** Space reveals the answer, 1–4 rate it, focus is always visible, and every action can be reached with Tab.
9. **Test tomorrow:** add a test for tomorrow with unstarted cards. The queue and message follow the §3 rule.
10. **Re-import `.ics`:** import the same file twice, and nothing is duplicated. Import an edited version, and the changes apply except to items the student edited.
11. **Readiness math:** a unit test with fixed cards and dates confirms the score matches §2 (unstarted = 0, capped at 99, the "Early estimate" label below 100 reviews).
12. **First use:** in a clean browser profile, the start action is obvious, with a one-line explanation that data stays on this device.
13. **Validation:** saving a blank card, or one with very long text, gives a clear message next to the field and keeps what was typed.
14. **Two tabs:** reviewing the same card in two tabs is caught by the revision check (§9). The second save is refused with "This card changed in another tab". History stays consistent.
15. **Shared card:** a card in two tests has one review history, and each test's readiness counts it.
16. **App update mid-review:** a new version arrives during a session. The student finishes or saves the session first, and nothing is lost.
17. **Write failure:** storage is full or blocked. A clear error appears, and the previous data is untouched.
18. **Bad import:** an invalid file, or one from a newer format version, gives an actionable error and changes nothing.
19. **Duplicate import:** merging the same backup twice gives the same counts as merging it once.
20. **Time zones:** crossing a daylight-saving change, or moving to another time zone, doesn't shift due dates, test dates or "reviewed today" (§9).
21. **Old database, new app:** opening the newer app on data saved by the previous version migrates it with nothing lost (§9).
22. **Accessibility:** the review flow works with the keyboard, with a screen reader (VoiceOver and TalkBack on the testers' devices), at 200% text size and with reduced motion.
23. **Real devices:** offline use, install and restore are checked on each tester's actual phone, not only in emulation.

## 9. Data model and technical rules

**Records** (every record has a UUID, `createdAt`, `updatedAt`, and `deletedAt` for soft deletes):

| Record | Key fields |
|---|---|
| Subject (class) | name, colour |
| Deck | subject, name |
| Card | deck, front, back, media refs, tags, priority flag, FSRS state, **revision** (a number that goes up on every change) |
| Review event | card, rating, reviewed-at timestamp, kind (`review` / `practice`), **package and model version**, state before, state after, operation ID |
| Undo event | the review event it cancels |
| Test | name, subject, date (date only, or date and time with a **time zone**), linked decks and tag filter, target, minutes per day |
| Assignment | subject, title, due date, done, optional next step, optional time estimate |
| Preferences | locale, time zone, **study-day cutoff**, accessibility and study settings |

**Rules:**
- **Scheduler state vs. the plan:** FSRS memory state lives on the card. Test mode's plan is a policy calculated on top of it and never written into the card (§3).
- **Two tabs:** saving a review checks the card's `revision`. If it changed since the card was shown, the save is refused and the card reloads.
- **Repeated taps:** each card showing has an operation ID, so a repeated submit is recognised and ignored (§4).
- **Text is plain text.** Card content is rendered through React's normal escaping, so no HTML from users or imports is ever inserted into the page. Rich text, if ever added, needs its own format, sanitising and backup decisions.
- **Images:** stored as blobs in IndexedDB, size-capped and downscaled on add (proposed: longest side 1600px). Included in backups (§4).
- **Deleting:** soft delete with `deletedAt`, purged after 30 days. This also prepares for sync later. No conflict-resolution machinery until sync exists.
- **Time and dates:**
  - review instants are stored as UTC timestamps
  - deadlines and test dates are **dates without times** unless the student sets a time, in which case they're stored with a time zone
  - date strings are never parsed from locale text
  - **study day:** a day runs to a cutoff of **4:00 am** (proposed, like Anki), so a 1 am review counts toward the previous day and the streak
  - **travelling:** dates stay the same calendar dates, and "today" follows the device's current time zone
  - **a test set for today:** treated as "test tomorrow or today" (§3)
- **Database versions:** Dexie schema versions with step-by-step migrations. Every release is tested by opening data from the previous version (check 21).
- **Offline and updates:**
  - the app shows when it's ready to work offline (after the first online load caches it)
  - storage write failures show an error and never fail silently
  - `navigator.storage.persist()` is requested (§4)
  - updates use vite-plugin-pwa's **prompt** mode: "Update ready", applied when the student chooses, never in the middle of a review session
- **Personal FSRS parameters:** use the defaults until there's enough history (§2). Optimising is a later, explicit step.
