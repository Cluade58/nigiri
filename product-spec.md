# Product spec

_Version 3, 2026-11-07, after the review of version 2. Earlier versions are in git (`git log -p product-spec.md`)._

**Context:** **Nigiri**, a pure flashcards app (decks, cards, FSRS reviews, and a test date on a deck), built as a first app for you and a few friends. The goal: it works, it's easy to use, and you keep using it. **The product is the card and how it gets made.** Everything else is built outward from the card and stays shorter than the card section.

**Scope rule:** before adding any feature, name who will use it in the first month. If nobody will, don't add it.

**What's in version one:** decks, Add card, review with FSRS, a test date with a fit check, and export/restore. Every card in it is written by the person learning it.

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

FSRS via `ts-fsrs@6.0.0` (pinned exactly), default parameters, target **90%** (fixed). In 6.0.0, "default" means the **FSRS-7** model. Each day's queue, in order:
1. Due cards.
2. The weakest cards below target. _Audit note: FSRS-7 sets a review card's due time where its predicted recall falls to 90%, so overdue review cards are the ones below target. That doesn't apply to cards on a learning step, which use a set delay. Revisit for Test mode._
3. New cards.
   - **With a test date:** spread evenly up to the test date.
   - **With no test date (decided 2026-11-07):** they come due however the installed ts-fsrs 6 schedules them. The app adds no rule of its own, such as a daily number of new cards.

**Fit check:** minutes a day needed = cards in the deck × seconds per card ÷ days until the test. Compare it with your one minutes-per-day number, and say plainly whether it fits. Seconds per card is fixed at **20**, the same for everyone and not measured from reviews. It's on the safe side, so the plan may say "doesn't fit" a bit more often. Example: 35 cards with 1 day left needs 35 × 20 ÷ 1 = 700 seconds, about 12 minutes.

One test per deck. One minutes-per-day number.

**How the scheduler works:** see [fsrs-notes.md](fsrs-notes.md), audited 2026-11-07. In short:
- **FSRS-7** is the memory model.
- **The 1- and 10-minute learning steps are settings,** and the model can lengthen them.
- **Review intervals are calculated** from each card's history, never fixed per rating.
- **Fuzz is off,** and the library has no day boundary.

**What the ratings mean:**
- Again: you forgot.
- Hard: right, with doubt or slowly. Hard is a pass, not a fail.
- Good: right, with effort.
- Easy: right, with no effort.

**Again during a session (decided 2026-11-07):** a card comes back in the same session once it's due again, after its step (1 or 10 minutes by default, or longer if the model lengthens it). So a session can grow while you're in it.

**Still undecided:**
- **What "due" means for the home count:** due right now, or due by the end of today.
- **When nothing is due right now, but a card comes back in a few minutes:** end the session with Done, or wait for that card.

## 3. Saving and backup

- Review history is append-only. Saving a review writes the review and the card's new state together.
- After a rating tap, the rating buttons turn off until the next card appears. That's the whole double-tap fix. A mis-tap costs one review.
- **Export** downloads everything as one file. **Restore** replaces everything, after a confirm. No merge.
- **Delete means delete,** after a confirm.
- If the data shape changes during the beta: export, wipe, re-import.

## 4. Data

Four records: **Deck, Card, Review, Test**, plus one settings object.

- **Deck:** id, name, colour, created date.
- **Card:** id, deck, front, back, created date (the two-week test counts cards per day), plus the scheduling fields ts-fsrs returns: `dueAt`, `lastReviewAt`, `state`, `scheduleStatus`, `stability`, `stabilityFast`, `difficulty`, `reps`, `lapses`, `scheduledDays`, `learningStep`.
- **Review:** the `revlog` that ts-fsrs returns, stored as it is (rating 1–4, review time, and so on), plus the deck.
- **Test:** deck and date. **Settings:** minutes a day, and the last What's new note seen.
- **Dates stay real dates in storage.** In the export file they become text, so Restore must turn them back into dates and check them.
- **No model-version stamp on cards.** The library's guide suggests one, but the scope reset cut it. If the model ever changes, use the export-wipe-reimport rule in §3.

## 5. Acceptance checks

1. Reviewing offline saves.
2. Export, then restore, round-trips everything.
3. A double tap logs one review.
4. **Scheduler check, with a fixed clock:**
   - A new card is due the moment it's made.
   - Again on a new card makes it due after the first learning step (1 minute with the default steps), and it comes back in the same session.
   - A card rated Good isn't due before its due time.

## 6. Around the card

Each one names who uses it in the first month.

- **First open.** One button: **New deck**, because a card needs a deck to go in. *Who:* every friend, on day one.
- **Home.** One main button, **Review 18 cards**, then your decks, each with how many cards are due. *Who:* everyone, every day.
- **New deck.** A separate button on home, next to the Decks heading. Type a name, pick one of the six highlighter colours, and tap **Create deck**. Add card then opens in the new deck. Nothing is picked for you: if you skip the colour, Create deck asks for one. *Who:* everyone, when a new class or unit starts.
- **Review.** Four plain buttons: Again, Hard, Good, Easy. The top shows how many cards are left, such as "12 left". It goes up by one when Again sends a card back into the session. *Who:* everyone.
- **Done.** "Done", and a button back home. *Who:* everyone, after every session.
- **What's new.** After an update, one short line on home says what changed, shown once. You write it for each release. Built in step 4 ([§7](#7-build-order-and-the-two-week-test)). *Who:* every friend, the first time they open the app after you ship a change.
- **Deck page.** It lists the deck's cards. Tap one to edit or delete it. **Add card** and **Add a test** are here too. *Who:* anyone fixing a typo or setting a test date.

## 7. Build order and the two-week test

Each step is usable on its own. Stop anywhere and you still have an app.
1. Deck, card, the New deck and Add card screens, and the review screen with ts-fsrs. Put it on GitHub Pages so it runs on your phone, then use it yourself for a week.
2. Export and restore.
3. Test date and the fit check.
4. Polish, and the What's new note ([§6](#6-around-the-card)).

**Builder notes for ts-fsrs 6.0.0** (sources and test scenarios in [fsrs-notes.md](fsrs-notes.md)):
- **Create the scheduler once at startup** with `await DefaultScheduler({ version: 'FSRS-7', desiredRetention: 0.9 })`. It's async, so wait for it before the first review.
- **After that, the calls are synchronous:** `newCard({ cardId, now })` for a new card, and `review({ card, grade, now })`, which returns `{ card, revlog }`. Save that `card` and `revlog` in one Dexie transaction. `preview()` isn't needed in version one.
- **Don't use the v5 names** most tutorials show: `fsrs()`, `FSRS`, `createEmptyCard`, `next`, `repeat`.
- **The review screen re-checks `dueAt`,** because learning cards come due within minutes.
- **Node:** the package needs Node 24 or newer to install and build. It runs in the phone's browser with no Node-only code. The laptop has Node 26. The deploy file uses Node 24 or 26, not 25, which Vitest 5.1.0 doesn't support.

**The test:** two weeks of your own schoolwork, starting from step 1. Count the cards you add each day. Zero by day five means input is still too expensive. That number, not anyone's opinion, decides what v2 is.

## 8. Later (version 1.1)

Add these only after two weeks of use, and only the ones you actually miss.
- **Write your own:** the duplicate-front check; keeping a half-typed card if you leave; opening in the deck you used last.
- **Review:** undo last rating; rating buttons that show when the card comes back; editing a card mid-review.
- **Test mode:** the readiness number (average predicted recall on test day).
- **Around the card:** the streak; the session summary; the add-to-home-screen tip.
