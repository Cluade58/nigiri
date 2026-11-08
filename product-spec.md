# Product spec

_Version 7, 2026-11-08: four colour themes you can switch in Settings (D39). Version 6 added a shorter Easy, the Test mode rules, and reminders as step 4 (reasons in PROJECT-STATE.md). Earlier versions are in git (`git log -p product-spec.md`)._

**Context:** **Nigiri**, a pure flashcards app (decks, cards, FSRS reviews, and a test date on a deck), built as a first app for you and a few friends. The goal: it works, it's easy to use, and you keep using it. **The product is the card and how it gets made.** Everything else is built outward from the card and stays shorter than the card section.

**Scope rule:** before adding any feature, name who will use it in the first month. If nobody will, don't add it.

**What's in version one:** decks, Add card, review with FSRS, a test date with a fit check, export/restore, and four colour themes. Every card in it is written by the person learning it.

## Decisions

1. **Built first: plain English text cards,** exactly as §1 says. Mandarin and math are on the [v2 page](v2-input-flows.md).
2. **Test mode is in version one,** because a test date is what makes someone open the app on a Tuesday. It's small, and the fit check is the good idea.
3. **No import, and no AI.** You write every card yourself (reasoning in §1, question 1).

---

## 1. The card and how it gets made

**The whole product is input.** Flashcard apps don't fail because the schedule is wrong. They fail because making cards is slow and boring, so people stop before the schedule would have mattered. The job is to make putting things in so cheap that you keep doing it.

**One way to make cards: write your own.**

### Write your own

1. Tap **Add card**.
   - In a deck, it adds to that deck.
   - From home, it asks which deck first.
2. Type the front. The keyboard's next key moves to the back.
3. The keyboard's done key, or **Save card**, saves it. The form clears and stays open with the cursor on the front, so the next card starts straight away. One line confirms it: "Saved. Biology has 12 cards."

**Who uses it in month one:** you and your friends, every time you make cards. Step 3 is for the moment you have something in hand, like a word you just looked up.

**Three domains, three products.** Each domain gets its own input path and its own review screen. They share only the scheduler and the deck. Version one builds only plain English text cards.

### Three questions, answered for version one

**1. What counts as "easy"?** The obvious build is: photo of the page → AI writes forty cards. What research says about cards you write versus cards written for you:
- In 5 of 6 experiments, college students remembered more from cards they wrote than from premade ones, two days later, and they did better on questions that applied the idea. One experiment showed no difference. ([Pan et al., JARMAC 12(4)](https://doi.org/10.1037/mac0000083); average effect about d = 0.45)
- In those experiments, students were *told which terms* to make cards for, and they wrote the definitions and examples themselves. In Lin & McDaniel (2018) ([summary](https://www.learningandthebrain.com/blog/?p=7456)), students picked the terms too: making cards didn't help, and it took longer.
- Time spent making cards is time not spent reviewing.
- I found no controlled study comparing AI-written cards with student-written ones.

The likely reading is that the gain comes from putting the answer in your own words, not from choosing terms or typing them out. That's an interpretation, not something the studies tested directly.

**Decided: you write every card.** Import skips the writing, and pasting a list an AI wrote from your notes is AI writing forty cards through the back door. Friends with Quizlet sets can keep using Quizlet; this app is for cards you make. Dropping import also drops the file picker, the parser, the preview and the duplicate check.

**2. Languages.** Not in version one. The Mandarin sentence flow is written on the [v2 page](v2-input-flows.md) so it doesn't get lost.

**3. Math.** Not in version one. The math problem flow is on the [v2 page](v2-input-flows.md).

### Already settled
- **Text cards only in version one.** Images after that: **undecided.**

## 2. Scheduling and Test mode

FSRS via `ts-fsrs@6.0.0` (pinned exactly), **FSRS-7** with default parameters. Target **90%**, except **Easy at 95%** (your rule, 2026-11-08; [fsrs-notes §9](fsrs-notes.md)). Each day's queue, in order:
1. Due cards.
2. New cards.
   - **With a test date:** spread evenly over the days before test day, so each is first seen at least a day early. From the day before the test, all are due.
   - **With no test date (decided 2026-11-07):** due as soon as they're made, as ts-fsrs schedules them. The app adds no daily number of new cards.

**Fit check:** minutes a day needed = cards in the deck × seconds per card ÷ days until the test (at least 1), summed over every deck with a test ahead. Compare it with your one minutes-per-day number, and say plainly whether it fits. Seconds per card is fixed at **20** for everyone, not measured from reviews, and on the safe side. Example: 35 cards with 1 day left needs 35 × 20 ÷ 1 = 700 seconds, about 12 minutes.

**Test mode (decided 2026-11-08, [fsrs-notes §10](fsrs-notes.md)):** one test per deck. The date is a calendar day ([§4](#4-data)), and days left count calendar days. Test mode only chooses which new cards are due: adding, editing or removing a test never changes a card's schedule. After test day, the deck goes back to no test date.

**How the scheduler works** ([fsrs-notes.md](fsrs-notes.md)):
- **FSRS-7, not Anki's FSRS-6,** because FSRS-6 inside ts-fsrs counts whole UTC days.
- **Only Again has a set delay (your rule, 2026-11-08):** 1 minute, on new and forgotten cards. Hard on a card you're still learning waits 90 seconds, the library's built-in 1.5× step.
- **Everything else is calculated by FSRS,** never less than 1 day, and Easy is at least a day longer than Good. Model override and fuzz are off, so these delays are exact.

**What the ratings mean:** Again, you forgot. Hard, right with doubt or slowly (a pass, not a fail). Good, right with effort. Easy, right with no effort.

**Again during a session (decided 2026-11-07):** a card comes back in the same session once it's due again, so a session can grow.

**Due means due now (decided 2026-11-07):** a card counts once its `dueAt` has passed, with no day boundary, so the home count can grow during the day. Only Test mode's new-card share counts calendar days.

**Session order:** cards you've studied before, most overdue first, then new cards in the order you wrote them. From home, all decks mix. After every rating, the next card is picked again from the due cards.

**Waiting (decided 2026-11-07; 90 s since 2026-11-08):** if nothing is due but a card from this session is due again within 90 seconds (`dueAt <= now + 90 s`), the review screen counts down to it. Otherwise the session ends with Done. Cards are never shown early ([fsrs-notes §8](fsrs-notes.md)).

## 3. Saving and backup

- Review history is append-only: a review is never changed, and it's removed only together with its card. Saving a review writes the review and the card's new state together.
- After a rating tap, the rating buttons turn off until the next card appears. **Double-tap guard (2026-11-08):** for 400 ms after the answer or the next card appears, taps on that spot do nothing, so a double tap on Show answer can't rate the card. A mis-tap costs one review.
- **A second open copy of the app** (on Android, a browser tab and the home-screen app share cards) can't see the other's buttons. So each time a card appears, keep its `reps` and `lastReviewAt`. The save reads the card again inside one transaction over cards and reviews, and compares by value (`lastReviewAt` in milliseconds; both empty on a new card). If the card is gone or changed, nothing is saved and the next card shows. Otherwise it runs `review()` on the stored copy, with `now` as the moment of the tap ([§7](#7-build-order-and-the-two-week-test)), and writes the scheduling fields onto that copy, plus the review.
- **A failed save loses nothing:** only a failed transaction counts as one. For every save (Add card, a rating, Create deck, Save changes, Delete card, Save test, Remove test), what you typed or picked stays, the button turns off until its save finishes (so a second tap can't make a duplicate) and back on after a failure, and a line says what to tap ([§6](#6-around-the-card)). If the app can't open its storage at all, one screen says so instead of an empty app.
- **Keep drafts (accepted by you, 2026-11-08):** Add card keeps what you type until it saves or you tap Close, and brings it back the next time Add card opens in that deck (or from home, with that deck picked), even after the phone closed the app. A draft isn't a card: it's kept outside the database, never exported or counted.
- **Ask the browser to keep the data:** call `navigator.storage.persist()` after the first save each launch, while `persisted()` is false, never inside a save. Safari decides partly by home-screen use ([WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/)).
- **Export** downloads everything as one file. **Restore** replaces everything, after a confirm. No merge.
- **Restore checks first:** the file names the app and a format number (1). Restore checks every record and date before touching anything, then replaces everything in one transaction. If a check fails, nothing changes and it says what was wrong.
- **Delete means delete,** after a confirm. Deleting a card deletes its reviews in the same transaction.
- **Editing a card writes only its front and back.** Its schedule stays.
- If the data shape changes during the beta: export, wipe, re-import. Before export exists, a wipe would lose cards, so the first schema declares all five stores and any step-1 change only adds.

## 4. Data

Four records: **Deck, Card, Review, Test**, plus one settings object.

- **Deck:** id, name, colour, created date.
- **Card:** id, deck, front, back, created date (the two-week test counts cards per day), plus the scheduling fields ts-fsrs returns: `dueAt`, `lastReviewAt`, `state`, `scheduleStatus`, `stability`, `stabilityFast`, `difficulty`, `reps`, `lapses`, `scheduledDays`, `learningStep`.
- **Review:** its own id, the card id (indexed) and the deck, plus the `revlog` that ts-fsrs returns, stored as it is (rating 1–4, review time, and so on).
- **Test:** deck and date. The date is a calendar day kept as text (`YYYY-MM-DD`), never a moment, so it can't shift with time zones. **Settings:** minutes a day, the last What's new note seen, and (step 4) reminders on or off, their time, and whether Done has asked.
- **Theme (step 2, D39d):** one of four names, kept on this phone outside the database, like a draft, so it applies before the first screen draws. It's never exported, and Restore leaves it alone. If it's missing, unknown or unreadable (a private window), the app uses Ink + Cobalt + Snow.
- **Other dates stay real dates in storage.** In the export file they become text, so Restore must turn them back into dates and check them, and check that a test date is a real calendar day.
- **No model-version stamp on cards.** The library's guide suggests one, but the scope reset cut it. If the model ever changes, use the export-wipe-reimport rule in §3.

## 5. Acceptance checks

Step 1 must pass checks 1, 3, 4 and 5. Check 2 belongs to step 2.

1. Reviewing offline saves: reload, still offline, and there's exactly one review.
2. Export, then restore, round-trips everything, on a real iPhone and Android phone, from the home screen.
3. A double tap logs exactly one review, and so does rating the same card in two open copies of the app.
4. **Scheduler check, with a fixed clock:**
   - A new card is due the moment it's made.
   - Again on a new card makes it due exactly 1 minute later, and it comes back in the same session. If nothing else is due, the review screen counts down to it.
   - Again on a card you knew makes it due exactly 1 minute later, and counts one lapse.
   - Good on a new card makes it due at least 1 day later. It isn't due before that.
   - Easy on a new card makes it due later than Good but within two weeks (observed: 13.15 days, [fsrs-notes §9](fsrs-notes.md)).
5. **A failed save loses nothing:** with storage made to fail, Add card keeps the typed card, and a rating can be tapped again with no review logged.

**Also test, for the rules above:** session order across two decks, with a learning card coming due before the remaining new cards; Hard on a new card makes it due exactly 90 seconds later; a card due at exactly now + 1:30 gets the countdown, and one at 1:31 ends with Done; jumping the clock mid-wait and coming back on screen shows the card; a double tap on Show answer logs no review; deleting a card removes only its reviews; editing a reviewed card leaves its schedule alone; after Again, home shows "Review 1 card" a minute later with no tap; with storage made to fail, Create deck, Save changes and Delete card lose nothing; a half-typed card survives a reload and comes back in Add card, and Close clears it; storage that won't open shows the explanation screen; reloading on a deck's address opens that deck.

**Step 2 also tests (themes, D39):** one tap on a theme repaints every screen; it survives a reload with no flash of Snow first; the phone's dark mode doesn't change it; Restore leaves it alone.

**Step 3 also tests, with a fixed clock:** 10 new cards and a test 5 days away show 2 new cards a day, and none on test day; with the test tomorrow or today, all are due; adding, editing or removing a test leaves every card's `dueAt` unchanged; the day after the test, the deck acts as if it has none; a phone moved to another time zone keeps the same test day; the fit check adds up two decks' tests.

**Step 4 also tests:** no reminder when nothing is due, at most one a day, and nothing about cards (no text, no deck names) leaves the phone.

**Experience checks E1–E5 (D48)** are in [UI-DESIGN-BRIEF.md](UI-DESIGN-BRIEF.md), "How Nigiri should feel".

## 6. Around the card

- **First open.** One button: **New deck**, because a card needs a deck to go in. *Who:* every friend, on day one.
- **Home.** One main button, **Review 18 cards**, with about how long it takes (D41, D45), then your decks, each with how many cards are due, when any are. A deck with no cards says "No cards yet". When nothing is due, that place says "Nothing due right now" and **Add card** becomes the main button. *Who:* everyone, every day.- **New deck.** A button beside home's Decks heading. Type a name, pick one of the six highlighter colours, and tap **Create deck**. Add card then opens in the new deck. Nothing is picked for you: if you skip the colour, Create deck asks for one. *Who:* everyone, when a new class or unit starts.
- **Review.** Four plain buttons: Again, Hard, Good, Easy, with one quiet line above them: "Forgot it? Tap Again. Right but slow? Hard." The top shows cards left, such as "12 left": cards due now plus cards from this session due again within 90 seconds, so a rating that sends the card back (Again, or Hard on a card you're still learning) leaves the count where it was. The bar under it is ratings saved this session out of that plus the cards left. **Waiting** shows "Next card in 0:48", with **Done for now** to go home. The time comes from that card's `dueAt`, never from a timer of its own; at zero the screen picks again. *Who:* everyone.
- **Not saved.** A failed save puts one line above the button: "Not saved. Tap Save card again." (or whichever button), or, out of space, "Free up space on your phone". *Who:* anyone whose phone fills up.
- **Storage can't open.** Instead of home: "Nigiri can't open your cards", three fixes, a warning not to remove the app, and **Try again**. *Who:* anyone in a private window or with a full phone.
- **Done.** "Done", cards reviewed, and a button home (D45). From step 4, Done offers reminders until you answer. *Who:* everyone, after every session.
- **What's new** (step 5). After an update, one line on home says what changed, once. You write it. *Who:* every friend, after you ship a change.
- **Deck page.** **Review 6 cards** for just this deck (or "Nothing due right now"), then its cards, newest first. Tap one to edit or delete it. **Add card** and the test line (**Add a test** or **Edit test**) are here too. With a test: days left, cards studied, today's share (D44). With no cards, it says "No cards yet" and "Add a card whenever something is worth remembering.", and Add card is the main button. *Who:* anyone fixing a typo or setting a test date.
- **Settings** (step 2). Backup (Export and Restore), then Theme. Reminders (step 4) go between the two. Last, an optional explainer (D43). *Who:* everyone, to keep a backup.
- **Theme** (step 2, your decision, 2026-11-08). Four rows, each a small preview in its own colours and your names for it: Ink + Cobalt + Snow (the default), Plum + Berry + Mist, Espresso + Amber + Cream, Midnight + Ice + Sky. One tap repaints the app; a check marks the one you're on. There's no Save and no message, and tapping the previous row undoes it. The theme replaces following the phone's light/dark setting. *Who:* you and your friends, once each, in the first week. `mockups/settings.html`.

## 7. Build order and the two-week test

Each step is usable on its own. Stop anywhere and you still have an app.
1. Deck, card, the New deck and Add card screens, the deck page (with edit and delete), and the review screen with ts-fsrs. Settings and the test parts stay hidden until steps 2 and 3; `mockups/index.html` shows step 1 as built. Step 1 is Ink + Cobalt + Snow only, whatever the phone's light/dark setting. Put it on GitHub Pages so it runs on your phone, then use it yourself for a week.
2. Export and restore, and the theme picker, in Settings. Then friends get the link ([publishing.md](publishing.md)).
3. Test date and the fit check.
4. Reminders, through a small free Cloudflare sender ([publishing.md](publishing.md#reminders-step-4)).
5. Polish, and the What's new note ([§6](#6-around-the-card)).

**Builder notes for ts-fsrs 6.0.0** (sources and test scenarios in [fsrs-notes.md](fsrs-notes.md)):
- **Create the scheduler once at startup** with `await DefaultScheduler({ version: 'FSRS-7', desiredRetention: { 1: 0.9, 2: 0.9, 3: 0.9, 4: 0.95 }, learningSteps: ['1m'], relearningSteps: ['1m'], allowModelOverride: false })`. It's async: wait for it before the first review.
- **After that, the calls are synchronous:** `newCard({ cardId, now })` for a new card, and `review({ card, grade, now })`, which returns `{ card, revlog }`. Save that `card` and `revlog` in one Dexie transaction. `preview()` isn't needed in version one. Pass the later of the tap and the card's `lastReviewAt` as `now`: FSRS-7 throws on a review dated before the last one.
- **H1–H8 passed on the pinned library** ([fsrs-notes §7](fsrs-notes.md)). Re-check H4 through Dexie.
- **Keyboard:** on Save card or Done, move focus to Front in the same tap, before waiting for the save, and clear the fields once it succeeds. Choosing a deck from home moves the cursor to Front.
- **Don't use the v5 names** most tutorials show: `fsrs()`, `FSRS`, `createEmptyCard`, `next`, `repeat`.
- **The review screen re-checks `dueAt`,** because learning cards come due within minutes.
- **Themes (D39):** each theme is one `[data-theme]` block of CSS variables, with Ink + Cobalt + Snow on `:root` (`mockups/highlighter.css`). Use no `prefers-color-scheme`. In step 2, an inline script in `index.html` reads the saved theme before the first paint and sets `data-theme` and `<meta name="theme-color">`. The manifest's splash colours are Snow's, because a manifest can't change per person.
- **Counts follow the clock.** Dexie's live queries rerun when data changes, not when time passes. Recount home, the deck page and the session when the app comes back on screen, and once a minute while it's open.
- **Hash URLs** (`/nigiri/#/deck/...`): GitHub Pages has no fallback for app routes, so a refresh never shows GitHub's 404. An address for a deck that no longer exists goes home.
- **Node:** ts-fsrs needs Node 24 or newer; the laptop has 26.13.0. The deploy file uses Node 24 or 26, not 25, which Vitest 5.1.0 doesn't support.

**The test:** two weeks of your own schoolwork, starting from step 1. Count the cards you add each day. Zero by day five means input is still too expensive. That number, not anyone's opinion, decides what v2 is.
- **Days are school days.**
- **How to count:** on day five and day fourteen, export (step 2) and count cards by created date, plus the days with at least one review. Until export exists, write down each deck's card total every evening. No stats screen.

## 8. Later (version 1.1)

Add these only after two weeks of use, and only the ones you actually miss.
- **Write your own:** the duplicate-front check; opening in the deck you used last. (Keeping a half-typed card moved into step 1 on 2026-11-08.)
- **Review:** undo last rating; rating buttons that show when the card comes back; editing a card mid-review.
- **Test mode:** the readiness number (average predicted recall on test day); a last look at every card before the test (RemNote's "Final Review"; the evidence is weak). **If readiness comes (D44):** counted out of every card in the deck, with cards not studied yet counted as not remembered. It isn't shown until every card has been studied at least once. It's worded as cards, never a grade or %: "about 28 of 35 likely to come back to you on test day, if you keep reviewing". It names its assumption (you keep reviewing what's due) and says it's an estimate.
- **Reminders:** the number on the app icon.
- **Around the card:** days studied this week, which never resets to zero (replaces the streak, D45); the session breakdown by rating (Done already shows the cards reviewed); the add-to-home-screen tip.
- **Decks:** renaming or deleting a deck.
