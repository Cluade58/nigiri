# UI design expectations

**Phone first, and it widens (D49, the user's decision, 2026-11-08: "Bento Today + desktop"):** a web app on the home screen, designed at 390px and checked at 360px and 320px. Today is a bento grid of tiles that becomes two rails from 48em and widens up to 1152px. Every other screen keeps its phone layout, in a centred column. Review stays focused on the question, the answer and the keys.

**Today (D50, D51; plan UI-BENTO-1):**
- **Tiles:** Study, then Tests, Last 7 days and Decks.
  - **Study** is the biggest, and comes first on phones. It holds the one filled button, the minutes line, and the next-due line when nothing is due.
  - **Tests** appears only when a test is today or ahead.
  - **Last 7 days** shows cards added and cards reviewed; a zero line is hidden.
  - **Decks** is the list, plus New deck.
- **Not on Today:** no assignment or agenda tile, and no filler tile. _Changed 2026-11-08 (D66–D68):_ a Streak tile and a study-calendar preview (days you reviewed, linking to Progress) are in; Last 7 days becomes a strip of bars (D65).
- **Tabs (D68):** phones get a bottom tab bar (Today, Decks, Progress, Settings) on the top-level screens; desktop (64em and up) gets a left sidebar with the same four rows, outlined Review and Add card, and the deck list. Review, Done and the forms stay focused, with no tabs. **Progress** holds the streak (current and best), a calendar of days studied, the last 7 days and totals (D67, D70).
- **Look:** tiles are index cards: Surface, a 1px rule border, a 16px radius, no shadow. Only the tiles with lists get the 1.5px ink line under their heading. Content sets every height. DOM order is reading order at every width.
- **Desktop column widths for the other screens:**
  - review and Done: 40rem
  - forms and Settings: 35rem
  - deck page: 45rem; on desktop its edit sheet becomes a centred dialog

**Direction: B, Highlighter.** Tokens and type are in [product-brief.md](product-brief.md); the reference screens start at `mockups/index.html`, and the plan behind them is `mockups/design-plan.md`. New screens extend that system.

**A pure flashcards app.** Screens exist only for decks, cards, reviewing and a deck's test. There are no assignments and no assignments calendar (a calendar of days studied is in since D66), so the existing mockups' "Due soon" list and Calendar tab no longer apply.

**The card screens come first.** They're designed from the card-creation flow in [product-spec.md §1](product-spec.md). Other screens follow outward from the card.
- One way to make cards: write your own. No import.
- **Screens:** home (empty, normal, nothing due, and welcome back), new deck, add card, deck page (with editing a card, and with no cards yet), review (with the rating hint, the wait for a returning card, and "Not saved"), done (with the reminder ask, step 4), the screen shown when storage can't open, a deck's test with the fit check (add, edit, remove, a test today, and more than 120 minutes), and Settings (Backup and Theme, step 2). What's on each is in [spec §6](product-spec.md). `mockups/index.html` also shows step 1 as built, without Settings or the test line. Anything on the version 1.1 list (§8) stays off the screens.
- Each domain has its own input screen and its own review screen. Version one has only plain text cards.
- Input is designed for the moment someone has something in hand (a line in a textbook, a sentence they heard, a word they just looked up), not for a sit-down card-making session.

Use frontend-design for the design plan (then review it against the brief), and Impeccable's critique to review renders. Check UX against ui-ux-pro-max's rules and its pre-delivery checklist.

**Colours: four themes the user picked** (2026-11-08, D39; this replaces Grape and row 103). Each is a trio: background (60%), text (30%) and accent (10%). **Ink + Cobalt + Snow is the default**; the others are Plum + Berry + Mist, Espresso + Amber + Cream, and Midnight + Ice + Sky. They're switched in Settings (step 2), and they replace following the phone's light/dark setting. The tokens in [product-brief.md](product-brief.md) are fixed. ui-ux-pro-max is now used only to derive and check the supporting tokens; its palettes, fonts and styles don't apply.
- **The accent** draws only the one filled button per screen, the rating key you just tapped, the focus ring and the progress bar. Outlined buttons, text links, keys at rest and the theme picker's check stay ink: the accent never means "chosen".
- **Supporting colours** (secondary text, rules, sheet, pressed, Done) are tints and shades of each trio's own hues. Error red is the one exception.
- **Done** is a highlighter in the accent's hue, drawn at full strength.
- **The six deck colours** are the user's choice per deck, unchanged in every theme. In the light themes each has a stronger pen tone for its swatch. Accent and deck colours never swap roles (D39e).
- **Every screen is checked in all four themes**, using `?theme=mist`, `cream` or `midnight` on any mockup.
- **Contrast:** WCAG AA in every theme. That's 4.5:1 for text, and 3:1 for large text, UI parts and focus.

**Basics on every screen:**
- one clear primary action
- readable text
- thumb-sized tap targets (48px)
- a visible focus ring

For flashcards: one question in focus, the answer revealed on request, rating buttons that stay in the same place.

## UX rules from three guides (added 2026-11-08)

The user asked to apply three guides: Craig Kirkwood's *UX Design Principles* (Nielsen's 10 heuristics, Dieter Rams, affordances and signifiers, designing for mobile), the Interaction Design Foundation's *The Basics of User Experience Design* ("IDF": usability, interaction design, mobile web), and user.com.sg's *20 Helpful UX Design Tips*. Below are the parts that fit a phone flashcards app for a few friends. Most already hold in the mockups. Every new screen and every review checks them. Where a rule meets an accepted decision, the decision wins.

**1. Show what happened** (Nielsen: visibility of system status).
- Every tap shows a pressed state at once, text buttons included.
- Every save shows its result where you are: the highlighter over what changed, or one line that reuses the button's verb ("Saved. Biology has 12 cards."). No toasts. Nothing saves or fails silently.
- You can always see where you are: the deck's name and colour while adding, reviewing or setting a test, and "12 left" while reviewing.

**2. Use the user's words** (Nielsen: match the real world; IDF: words, plain language).
- Buttons are a verb and a noun, two or three words: Save card, Create deck, Show answer.
- One word for each thing, everywhere: card, deck, due, test. Scheduler words never reach the screen: stability, difficulty, retention, interval, FSRS, learning step. The one exception is the optional page "How Nigiri picks your cards" (D43), which names FSRS once. "Studied" means a card has at least one review, and "not studied yet" means none, on every Test mode screen (D44).
- Copy a 12-year-old reads in one go, one idea per line.

**3. Tappable things look tappable** (affordances and signifiers; tips 14, 15, 17).
- Anything you can tap carries a sign that isn't colour alone: a filled or outlined button, an underline, or a chevron on its row.
- Rows that open something look alike on every screen, chevron included.
- Only universal symbols go without a word: the gear for Settings, ✕ to end a review, and − and + on the minutes stepper, each with a spoken name.
- Field labels sit above the field and stay while you type. A placeholder is only an example (tip 12).

**4. Prevent mistakes, then make them cheap** (Nielsen: error prevention; IDF: error tolerance).
- Offer only choices that work.
- Anything that can't be undone sits apart from the main button and asks first, saying what goes ("Delete this card? This can't be undone.").
- One stray tap costs at most one thing: the double-tap guard, and rating keys that turn off ([spec §3](product-spec.md)).
- Undo stays on the 1.1 list ([spec §8](product-spec.md)). Until then, these rules are the safety net.

**5. Errors say what happened and what to tap** (Nielsen: recognise and recover from errors).
- One line, plain words, no codes, no apology: what didn't happen, and the next tap. What you typed stays.
- When a button can't do its job yet, the screen says why in words, next to what needs fixing ("Pick a colour").

**6. Let people leave** (Nielsen: user control and freedom).
- Every screen except home and the storage screen has one visible way out: Close, Cancel, Home, ✕ or Back to home.
- Leaving keeps what's done: ratings are saved, and a half-typed card waits as a draft ([spec §3](product-spec.md)).

**7. Show, don't make people remember** (Nielsen: recognition rather than recall, help; tip 16).
- Choices are shown, not recalled: decks by name and colour, the six colours as swatches.
- Help lives on the screen, in one line where it's needed: the rating hint, the empty states, the storage fixes. No tour or help button. The one help page is the optional "How Nigiri picks your cards", a row in Settings, never linked from the review screen (D43, because the user asked for "optional explanations for curious users").

**8. Short, quiet and honest** (Nielsen: minimalist design; Rams: unobtrusive, honest; tips 2, 7, 18).
- The most important thing comes first: the main button sits above the decks.
- Every extra line competes with the card. To add a line to a screen, take one away.
- Scrolling is up and down only. On the review screen the keys stay put, whatever the card's length.
- No guilt, fake urgency or empty praise. Numbers are real, and the fit check says plainly whether it fits.

**9. A phone in one hand, between classes** (IDF: mobile web; Kirkwood: designing for mobile; tips 14, 19).
- People use Nigiri in short bursts, which the IDF calls microtasking. Adding a card and starting a review are each one tap from home.
- On forms and in review, the main button sits low, where the thumb is (on home it comes first, rule 8). Tap targets stay 48px (the IDF's minimum is 30px).
- Nothing depends on hover, and no swipe or long-press is the only way to do something.
- Fewer inputs: the keyboard's next and done keys move through the form, and there's no sign-in.
- Patchy signal: everything works offline, and nothing typed is lost to a dropped connection or a closed app.
- Text: body and fields at 17px (16px or more also stops iPhone zooming into a field). Anything you need in order to act is at least 15px. 13px is only for extras you can skip.

**10. Stay learnable after updates** (IDF: ease of learning; Nielsen: consistency).
- Once friends use it, the main buttons and their words stay put between updates. If one has to move, What's new says so once ([spec §6](product-spec.md)).

**11. Watch what people do** (IDF: "you are not the user"; usability testing).
- What people say they'd do isn't what they do. The two-week test already counts cards instead of asking ([spec §7](product-spec.md)). Also watch one friend make their first deck and cards without help, at step 2 (decided 2026-11-08, D47; check E2 in [spec §5](product-spec.md)).

**Left out, and why:**
- Personas, empathy maps, journey maps, card sorting: the users are you and a few friends, and there are about ten screens.
- Heat maps and A/B tests: a handful of users can't fill them.
- Separate desktop designs for screens other than Today: they keep the phone layout in a centred column (D49).
- Parallax and other trends: the direction is decided (Highlighter, ruled rows). _Changed 2026-11-08:_ Today's bento grid is in, by the user's choice (D49).
- Accessibility audits and legal accessibility: out of scope. Contrast stays WCAG AA, as decided.
- Wizards, FAQs and voice input: help is one line on the screen, and typing is the only input in version one.

## How Nigiri should feel (added 2026-11-08)

The user's direction: a student opens Nigiri and thinks "I know what to study next, and I can make progress." Simple, clear, friendly, calm, and easy to come back to. Chief-officer turned it into seven principles (D40–D48 in [PROJECT-STATE.md](PROJECT-STATE.md)). Each one has a cost, named here, so nobody adds the cut thing back by accident.

| Principle | On screen | What we give up |
|---|---|---|
| **1. Nigiri picks, you start.** | One button reviews everything due, in spec §2's order. Decks with a test ahead are listed first. | Choosing a session size from home. Each deck page still has its own Review button. |
| **2. Say the cost before the tap.** | Home says about how many minutes the due cards take, and that you can stop anytime. | Precision: 20 seconds a card is rough, so it says "about". |
| **3. Stopping never loses anything.** | Every rating saves as it's tapped, so ✕ is the pause and home's button is the resume. | A "carry on where you left off" screen. The queue is just picked again. |
| **4. Explain when asked, not on the way.** | The review screen keeps its one hint line. The full explanation is one optional page in Settings. | A friend who never opens Settings learns Good from Easy by using them. |
| **5. Facts before forecasts.** | Test mode shows studied, not studied yet, and today's share: counts, not predictions. The fit check is the only estimate, and it states its 20-second assumption. | A readiness number in version one (it's on the 1.1 list). |
| **6. Count effort, never punish absence.** | One-line moments for a finished session, a return after days away, and a test deck fully studied. No lives, caps or blame. _Changed 2026-11-08 (D66, the user):_ a streak is in, from real reviews only, and it never warns or blames (D67). | Loss-aversion pressure: no warnings, no "don't break", no freezes to buy. |
| **7. Calm, with one loud thing per screen.** | Existing tokens, in every theme. The accent stays on the main action, and the highlighter on what just changed. | Nothing new gets a colour. |

**The journey, from opening to useful study:**
1. **Open.** Home shows the date and **Review 18 cards**. Under it: "About 6 minutes." and "Every rating saves, so you can stop anytime." Decks follow, test decks first.
2. **Start.** One tap. A card, **Show answer**, then four ratings with the hint line. Again brings a card back within the session.
3. **Stop or finish.** ✕ goes home, where the rest still waits. Finishing shows **Done** and "18 cards reviewed.", then **Back to home**.
4. **Nothing due.** **Add card** becomes the main button: making cards is the next useful thing.
5. **A test coming.** The deck page shows "Test Friday, in 3 days", "30 of 35 studied" and "5 not studied yet: 2 today, all by Thursday". **Edit test** shows the same plan and whether it fits your time.
6. **Back after days away.** Home says "Welcome back. The cards waiting longest come first.", and still gives the minutes.
7. **Something fails.** One line says what didn't happen and what to tap. What you typed stays.

**Gamification, from the two guides the user sent** (Yu-kai Chou's Octalysis guide, and Adjust's app gamification guide):
- **Kept:** Octalysis's "White Hat" drives. Accomplishment means real counts. Creativity is that you write every card, and the guide calls creativity the engine for the long run. Ownership is your decks and your colours. From Adjust: real-time feedback and visible progress (the review bar, "Saved. Biology has 12 cards.").
- **Softened 2026-11-08 (D66, the user: "Gamification is important"; D67, chief):** a streak (current and best), a calendar of days studied, and Today's focal due count are in. Still out: warnings, freezes, points, levels, badges, leaderboards, and anything needing accounts or other people.
- **Left out (before D66):** Octalysis's "Black Hat" drives, scarcity and loss: they bring urgency, then burnout and resentment. Adjust's coins, leaderboards, lives, levels, mascots and spin-the-wheel. It's a marketing guide for keeping paying users, and none of those help you remember a card.
- **Celebrations:** one line that needs no tap, using the existing highlighter swipe. Under reduced motion, it appears without the swipe. No confetti, no sound, no exclamation marks. Never the words lost, behind, "don't break" or "you missed". ("Streak" is allowed since D66.)

**Experience checks (D48).** Spec §5 points here. Each step keeps these true once its screens exist; E2 runs at step 2, when friends get the link.
- **E1. Clear next step.** With fixed data at 390×844 and 360×640, home shows exactly one filled button. With cards due, it's "Review N cards", with "About M minutes." (N × 20 s, rounded up) and the stop-anytime line under it, all above the fold. With nothing due, it's Add card. Empty home and an empty deck each name one next step.
- **E2. Easy first use, watched.** One friend who hasn't seen Nigiri, on their own phone, makes a deck, writes three cards and finishes a review without help, within five minutes. Watch without prompting, and write down every stop and question. Any question about what to tap next fails the check.
- **E3. Honest Test mode, fixed clock.** A deck of 35 cards, 30 studied, test in 3 days: the deck shows "30 of 35 studied" and "5 not studied yet: 2 today, all by Thursday". Moving the test 6 days out changes only that line and the fit check: every card's `dueAt` stays the same. No screen shows a percentage, grade, "ready" or prediction.
- **E4. Effort counts, absence doesn't.** Done shows the real number of cards reviewed this session. With the last review or card made 3 days ago and cards due, home shows the welcome-back line. Searching every screen's copy and the reminder text finds no lives, cap, points, or "lost", "behind", "don't break" or "you missed". Each celebration is one line, needs no tap, and appears without motion under reduced motion.
- **E5. Nothing lost on the way.** Close the app after five ratings and reopen it: home shows exactly five new reviews, and the unrated card is still due. Offline, a whole session saves. With storage failing, every save keeps what was typed or picked and says what to tap. A half-typed card comes back.
