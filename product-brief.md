# Study App — Product Brief (draft 1)

_Planning stage. Built from your brain dump plus competitor research done 2026-11-07. Nothing here is final. Open questions are at the bottom._

---

## 1. The one-line pitch

**The study app that knows when your tests are.**

Every flashcard app treats memory as one open-ended stream. Every planner treats a test as a date on a calendar. Nobody connects the two. This app does: add a test, and your flashcards reschedule themselves so you know the material *on that day*, and the app tells you honestly whether you're on track.

## 1b. Audience: high school students (decided)

What that changes:
- **Google Classroom comes first, Canvas second.** Most US high schools use Classroom. Its calendar export and API become the first integrations, with Canvas iCal next (many districts use Canvas too).
- **Phone-first.** Teens study on their phones, in short bursts, often at night. Design for a phone screen first and make the desktop version a roomier layout of the same app.
- **School structure:** class periods, A/B day rotations, semesters and units. Tests are often unit tests plus a cumulative final, which suits the "ramp up again before the final" behaviour.
- **AP, SAT and ACT** are long-horizon tests (weeks to months) that sit alongside weekly quizzes, so Test mode has to handle both a Friday quiz and an AP exam in May.
- **Money is tight.** The free tier must cover everything a student needs to study. Any paid tier should be cheap and monthly or yearly, never weekly. A parent-pays option is worth considering.
- **Gamification lands better with teens,** but still respect the "no lives" rule. Light social features (study with friends, a shared class deck) could matter more here than for college students.
- **Legal and safety:**
  - Most users are 14–18, but some will be under 13, which brings US children's privacy law (COPPA) into play. Decide on an age gate early.
  - Collect as little personal data as possible.
  - The Google Classroom API needs Google's OAuth verification, and school admins can block third-party apps. The iCal paste route avoids both.
- **Tone:** friendly and direct, never babyish or corporate. Talk like a sharp older sibling, not a teacher.

## 1c. First release: private beta (confirmed)

The first release is for **you plus a few private testers in several countries**, not a public launch. That changes three things:

**1. What success means.** The goal is to learn, not to grow. Watch testers, without explaining the app first, as they:
1. create a small deck
2. attach a test to it
3. **explain in their own words what readiness means**
4. finish a short review
5. restore a backup in a clean browser

Record where they get confused and whether they **come back on their own** over the following days. Collect feedback manually (messages, a call), so there's no analytics or feedback tool to explain in the privacy notes. Set usability targets after the first session.

**2. The beta's flows**, all of which must work end to end:
1. Start with no account, create a subject and deck, and add a few cards.
2. Add a test date and link the study material.
3. Open Today, understand the due work, reveal answers and rate honestly.
4. Reopen the app (including offline) and see saved progress and what remains.
5. Record an assignment and its deadline next to the test work.
6. Export a backup and restore it in a separate, clean browser profile.

**3. Privacy depends on where testers live.** It's no longer just US COPPA. Before inviting anyone, list each tester's country and age band, then check the rules that apply ([spec §7](product-spec.md)).

**What's not in the beta:** AI generation, accounts, sync and school integrations. Reassess once testers have used the core flow. `.ics` import is an optional extra after manual entry works.

## 2. Where the gap is

| App | Strong at | Where it falls short |
|---|---|---|
| **Anki** | Free, FSRS built in, powerful | Steep learning curve, dated UI, confusing settings, $25 iOS app, no exam-date mode |
| **RemNote** | Notes plus cards, has an exam scheduler | Slow and buggy, desktop-first, no assignment tracker |
| **Mochi** | Clean, simple | Weak mobile app, thin analytics, no optimizer |
| **Gizmo AI** | Fun, AI import, heavy gamification | **Lives (hearts) cut sessions short**, weekly billing (~$364/yr), favours recent cards |
| **Quizlet** | Huge library | Paywalls on Learn and tests, images locked to Plus, 1.4★ on Trustpilot |
| **Knowt** | Generous free tier, Quizlet import | Ads over answer buttons, AI cards with front and back swapped |
| **Brainscape** | Mastery % students trust | Only one answer format, images Pro-only |
| **MyStudyLife / Shovel** | Assignments, timetable, LMS import | No memory or flashcards at all. Shovel plans *hours*, not *recall* |
| **StudyFetch** | Calendar study sessions that open your material and practice ([source](https://www.studyfetch.com/study-schedule-maker)) | Connecting planning to practice is **not** unique to us |
| **Revu / Paced** | Study scheduling plus missed-work and debrief flows ([Revu](https://revu.cards/), [Paced](https://pacedstudy.com/)) | Adaptive planning exists; what matters is how clearly it explains itself |

_Lesson from Shovel: explaining whether the work fits your time may matter more to students than another score. That supports making the fit check the centre of Test mode._

**What none of them do:** combine (a) a real FSRS scheduler, (b) a test-date-aware study mode, and (c) an assignment and test tracker, in one simple app. RemNote comes closest on (a)+(b) but has none of (c), and it's slow.

## 3. Where we stand out (ranked)

> RemNote already has an exam scheduler, so the date-based scheduling alone isn't new. What we improve is the **fit check against your available time**, tests coming straight from the tracker (several tests per deck), and an honest readiness score. Exact rules are in [product-spec.md](product-spec.md) §1–3.

1. **Test mode (the headline feature).** Attach a deck to a test date. The scheduler aims for, say, 90% predicted recall *on test day*. It paces new cards backward from the date, pulls forward only cards that would otherwise land after the test, and gives every card one last look in the final days. After the test, the deck drops back to a light maintenance schedule (or ramps up again before a cumulative final).
2. **A readiness score you can trust.** "Bio midterm: 74% ready → 88% if you do 15 min a day." It's computed from FSRS's per-card recall probability, so it's not a fake progress bar. This is the number students actually care about.
3. **One calendar for the whole workload.** Assignments, tests, and *predicted review minutes per day* all on the same calendar. Heavy days are flagged ahead of time, and reviews shift earlier to make room.
4. **No settings to start, every setting if you want them.** It works well out of the box with plain-language presets ("Test in 3 weeks", "Keep it long-term"). The optimizer runs quietly once you have a few hundred reviews. A clearly separated "Advanced" area exposes desired retention, learning steps, and parameters for people coming from Anki.
5. **Images free and everywhere.** Images on both sides of a card, plus image occlusion (hide parts of a diagram), on the free tier. Every competitor charges for or limits this.
6. **Never limit studying your own cards.** No lives, no round caps, no paywall on reviewing. Money comes from AI features and extras later.

## 4. Feature map

### MVP: what makes it real
**Flashcards and FSRS**
- Decks, cards (front/back, text plus images both sides), tags
- FSRS scheduling with 4-button grading (Again / Hard / Good / Easy). Library: `ts-fsrs` (MIT; already supports FSRS-6 and FSRS-7)
- Review session with short same-day learning steps (handles the short-term "understand it before the test" use)
- **Cram / extra review** mode: study extra before a test *without* messing up the long-term schedule, and say so in the UI
- Review history logged per card (needed for analytics and the optimizer)

**Tests and assignments**
- Classes (name and colour)
- Assignments (due date, class, done/not done, optional time estimate)
- Tests (date, class, linked decks) → turns on Test mode for those decks
- Calendar: month and week views, plus an "Up next" list

**Progress**
- Readiness per test
- Review forecast (honestly including any backlog)
- Streak (forgiving, see §5) and a simple activity heatmap

**Data (local-only)**
- Everything is stored on the device in IndexedDB, and the app asks the browser for persistent storage
- Export / Import backup as one file

### V2: soon after
- Image occlusion editor (freehand masks, works on phone)
- Import from Anki (.apkg) and Quizlet (export text). Competitors grow mainly this way
- Canvas / Google Classroom import via **iCal feed** (paste a URL, a few days to build, no school approval needed)
- Per-user FSRS parameter optimization
- Reminders timed to gaps in your class schedule

### Later
- **PDF / notes / photo → AI-generated cards**, always shown for review before saving (competitors get front/back wrong)
- Google Classroom API and Canvas OAuth (need Google verification and per-school approval, so slow)
- Shared decks and study with friends
- Native mobile apps (start as a responsive web app / PWA)

## 5. Gamification: what to take, what to skip

**Take**
- **Streaks with a safety net.** Something like 2 free "repairs" a month (Brainscape does this). Missing one day shouldn't wipe out months.
- **Readiness and mastery as the reward.** Brainscape users say its mastery % predicts their exam scores. Watching *your test readiness* climb motivates more than XP does.
- **Small, earned moments.** A clean "session done" summary (cards reviewed, readiness change, time). One satisfying moment, not confetti everywhere.
- **Optional social later.** Gizmo and Knowt's live multiplayer quiz games are well liked for studying with friends. It's a V-later feature.

**Skip**
- **Lives / hearts.** It's the #1 complaint about Gizmo, because it punishes you for getting cards wrong, which is how learning works.
- **Caps on reviews or tests.** It's Quizlet's #1 complaint.
- **Pop-up spam for XP and streaks.** Knowt had to tone this down after complaints.
- **Weekly billing.** It feels predatory to students.

## 6. Design direction (to be developed with the frontend-design skill)

Principles only for now. Colour, type and layout tokens come in the design-plan pass.

- **Calm and quick.** The app is opened in 3-minute gaps between classes. The first screen answers "what should I do right now?" in one glance.
- **The test date is the hero.** The most characteristic thing in this app's world is the countdown-plus-readiness pairing. That's where the boldness goes, and the rest stays quiet.
- **Plain language.** "Test in 9 days · 74% ready", never "R=0.74, S=12.3d". The FSRS numbers live in Advanced.
- **Simple by default.** One primary action per screen, settings tucked away, a new user reviewing their first card in under a minute.
- **Avoid** the generic AI-app look (cream plus terracotta, identical rounded SaaS cards, gradient washes) and Anki's dated, dense UI.

### Chosen direction: B, Highlighter (decided 2026-11-07)

**Idea:** students colour-code notes by subject and highlight what they've learned, so readiness is a highlighter stroke across the page. Reference mockup: [mockups/today-b-highlighter.html](mockups/today-b-highlighter.html). The token values below are the ones that mockup actually uses.

| Token | Light | Dark |
|---|---|---|
| Page (cool copy paper, not cream) | `#F8FAFD` | `#141B2B` |
| Ink (gel-pen navy) | `#1B2A4A` | `#E6ECF7` |
| Secondary text | `#4A5874` | `#A8B4CB` |
| Tint (the one tinted surface) | `#EEF3FA` | `#1C2539` |
| Rules / dividers | `#E3E9F2` | `#263049` |
| Primary button | navy fill, white text | light fill, navy text |
| Highlighters (subjects) | Bio `#7BE38A`, Algebra `#7CC8FF`, Spanish `#FF8FC8`, English `#FFB65C`, Chem `#FFE45C`, History `#C3A6FF` (lavender) | same colours at 85% opacity |
| Error (form errors only, always with text) | `#B3261E` | `#FFB4AB` |

- **Type:**
  - Bricolage Grotesque for display: 34px test title (700), 24px section headings (600)
  - Atkinson Hyperlegible Next for body: 17 body, 15 secondary, 13 meta
  - Schibsted Grotesk is the fallback if Bricolage starts to feel generic
  - **Self-host both fonts in the real app** ([spec §7](product-spec.md))
- **Spacing:** 8 / 12 / 20 / 32 / 48. Primary button 50px tall with a 25px radius; secondary is a 1.5px navy outline. Tap targets are at least 48px.
- **The memorable element:** the readiness strip.
  - a hand-drawn SVG highlighter stroke for "ready now"
  - a hatched lighter stretch for "with the plan"
  - a navy tick at the goal
  - the stroke draws in once on load and appears without animation under reduced motion
- **Stays quiet:**
  - Everything else is navy on paper, with no containers on the hero.
  - Subject colour appears only as small swatches, and the subject name is always printed too, so colour never carries meaning on its own.
- **Avoid:** script or handwriting fonts, doodles, a cream background, and spreading highlighter colour beyond readiness and subject swatches.
- **Ideas to try later (not decided):** borrow A's big bold readiness number if the screen needs to be louder. Watch the yellow Chem swatch, which has low contrast on the page and is acceptable only because the subject name is printed.

## 7. Tech stack (decided 2026-11-07)

**Shape:** a static single-page web app with no server. It's built into plain files and hosted for free on any static host. That suits local-only perfectly: nothing to run, nothing to pay for, no data leaving the device.

| Job | Choice | Version | Why |
|---|---|---|---|
| Language | **TypeScript** | `6.0.3` | Catches mistakes before they run. **Not 7.x yet:** the lint tooling (typescript-eslint) only supports TS up to 6.0. |
| UI | **React** | `19.3.1` | The most widely used option, with the most tutorials and examples, and the agents are fluent in it. It's the best choice for someone learning. |
| Build / dev server | **Vite** + `@vitejs/plugin-react` | `8.3.6` / `6.2.1` | Fast, simple, and the standard pairing with React. |
| Installable / offline | **vite-plugin-pwa** (Workbox) | `2.0.0` | Generates the app manifest and the service worker that makes the app open offline. Supports Vite 8. |
| Local database | **Dexie** + `dexie-react-hooks` | `4.4.7` / `4.4.0` | A friendly layer over IndexedDB, with real transactions (spec §4: a review and its log save together). Screens update automatically when data changes. It also has a sync path for later. |
| Scheduler | **ts-fsrs** | `6.0.0` (exact) | FSRS, MIT licence (spec §2). |
| Routing | **React Router** | `8.5.1` | Today / Decks / Calendar / Progress screens. |
| Backup `.zip` | **fflate** | `0.8.3` | Small, fast zip in the browser (spec §4). |
| Calendar import | **ical.js** | `2.2.1` | Parses `.ics` files, including recurring events and time zones (spec §6). MPL-2.0 licence, which is fine to use unmodified. |
| Dates | **date-fns** + `@date-fns/tz` | `4.4.0` / `1.5.0` | Local-date maths without off-by-one-day bugs. |
| Styling | **Plain CSS with CSS variables** (CSS Modules) | none | The Highlighter tokens (§6) map straight onto CSS variables. No Tailwind: the look is custom, and a utility kit would pull it back toward generic. |
| Fonts (self-hosted) | `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/atkinson-hyperlegible-next` | `5.3.0` | Bundled with the app, so no request goes to Google (spec §7). OFL licence. |
| Unit tests | **Vitest** + `fake-indexeddb` | `5.1.0` / `6.2.7` | Readiness maths, scheduling rules, backup merge and undo (spec §8). |
| Behaviour tests | **Playwright** | `1.65.0` | Real-browser checks: offline reviews, restoring a backup, double taps. **It can run WebKit, the engine behind iPhone Safari,** which matters for a phone-first app. |
| Screenshots | Existing `npm run shot` (Puppeteer) | already installed | Keep it for the visual loop. |
| Hosting | Any static host (Cloudflare Pages, Netlify, GitHub Pages) | none | Free tier, HTTPS (which installable apps require). **Choose when it's time to publish.** |

**Rules:**
- **Exact versions everywhere** (no `^`), committed lockfile.
- Upgrades are deliberate changes, with the tests run afterwards.
- No other dependency gets added without a reason written down here.

**Considered and not chosen:**
- **Svelte/SvelteKit:** simpler syntax, but fewer learning resources.
- **Next.js:** built around a server we don't need.
- **Native apps:** decided against for now.
- **Tailwind:** fights a custom look.
- **localStorage:** too small for images, and has no transactions.

**Still open:** where the code lives (a new `app/` folder inside this project or a separate repo) and git setup. Both get decided when implementation is authorized.

## 7a. Technical notes

- **FSRS:** `ts-fsrs` (TypeScript, MIT) for scheduling, with its optimizer package for per-user parameters. Anki says optimization needs a few hundred reviews and re-running about monthly.
- **Exam-date scheduling is unsolved territory.** Anki's own contributors tried and found it non-trivial. We'll design our own rule (prioritize cards whose predicted recall on test day is below target, pull forward only post-test cards, cap daily load) and test it with simulated review data.
- **Offline-first sync** matters. Mobile sync is a weak spot for both RemNote and Mochi.

## 7b. Decisions log

- **Audience:** high school students (§1b).
- **First release:** a private beta for you plus a few testers in several countries (§1c). Countries, ages and devices are still open.
- **Platform:** a phone-first web app that installs like an app (PWA), designed at 390px first.
- **Data:** local-only. IndexedDB, no accounts, Export/Import backup in the MVP, records built for sync later ([spec §4](product-spec.md)).
- **Scheduler:** `ts-fsrs@6.0.0`, pinned to that exact version. Four grading buttons.
- **Readiness:** predicted recall on test day, with unstarted cards counted as 0 ([spec §2](product-spec.md)).
- **Notifications:** no web push in the MVP (proposed, [spec §5](product-spec.md)).
- **Privacy:** US launch, nothing collected or sent off the device in the MVP, fonts self-hosted (proposed, [spec §7](product-spec.md)).
- **Gamification:** forgiving streaks and readiness. No lives, no review caps.
- **Visual direction:** B, Highlighter (§6). Options A and C stay in `mockups/` for reference.
- **Business model:** a side project paid for by students. Free at launch (no payments). Plus at about $2.99/mo or $19.99/yr arrives with sync and AI. Studying, Test mode, images and the tracker are never paywalled, and there are no ads (§7c).
- **Tech stack (decided):** React + TypeScript 6 + Vite, an installable offline web app (vite-plugin-pwa), Dexie (IndexedDB), ts-fsrs, plain CSS variables, Vitest + Playwright, static hosting with no server (§7).

## 7c. Business model (decided 2026-11-07)

**Goal:** a side project with real users that earns some income. **Payer:** students themselves.

**The model: free to study forever, plus a cheap "Plus" plan for the features that cost money to run.**

**Phase 1, launch: completely free, no payments at all.**
- The app is local-only, with no accounts and no server, so running it costs almost nothing (free static hosting plus a domain at about $12/yr).
- There's no way to attach a subscription to a person without accounts, and taking payments means collecting data from teens. Neither fits phase 1.
- What phase 1 is for: get students using it, learn what they value, earn reviews and word of mouth.
- Optional: a "Support the app" link to an external tip page (e.g. Ko-fi). No payment data touches the app.

**Phase 2, when accounts and sync arrive: launch Plus.** Charge for what costs us money:
- **Sync and cloud backup** across phone and school Chromebook (server and storage costs)
- **AI cards from PDFs, notes and photos** (AI API costs per use; Plus gets a generous monthly amount, free users a small taste)
- Nice extras that cost nothing to run but add value: extra themes and the detailed stats page

**Price (proposed):** about **$2.99/month or $19.99/year**. Never weekly. That's well below Quizlet Plus (~$36/yr), Knowt Ultra (~$96/yr) and Gizmo (~$7–14/week).

**Never behind the paywall** (these are the reasons students pick us over Quizlet, Gizmo and Knowt):
- reviewing your own cards, without limits
- Test mode, readiness and the fit check
- images on cards and image occlusion
- the assignment and test tracker and calendar
- backups, `.ics` import, Anki and Quizlet import
- no ads, ever (ads mean tracking, which conflicts with the privacy policy and COPPA)

**Things to know before phase 2:**
- **Many teens don't have their own card.** In practice a parent's card, or app-store gift cards (common with teens), will often pay. Gift cards only work in native apps, so that's one argument for app-store versions later. Make it easy to hand the checkout to a parent ("Send this to a parent").
- **Selling subscriptions to minors** brings refund and consumer-protection rules, and accounts bring the age policy in spec §7. Get proper advice before launching Plus.
- **Payment provider:** decide at phase 2 (Stripe for web; Apple and Google billing if native apps exist by then).

## 8. Open questions for you

1. ~~Who is it for first?~~ **High schoolers** (see §1b).
2. ~~Web first?~~ **A phone-first web app, installable on phones as a PWA.** It needs to:
   - be designed at 390px wide first, with desktop as a roomier layout of the same app
   - add to the home screen and work offline for reviews
   - leave native apps until later

   **No web push in the first release** (proposed; see [product-spec.md §5](product-spec.md)). Push needs a server, which conflicts with local-only. Reminders come from in-app nudges plus exporting dates to the phone's own calendar.
3. ~~Accounts and sync?~~ **Local-only to start.** Everything is stored on the device (IndexedDB), with no sign-up. Consequences:
   - **Simpler privacy.** No accounts means no personal data collected, which makes COPPA much easier. A light age check is still worth keeping for later.
   - **The risk is losing data.** Browsers can clear site storage. iOS Safari can wipe data for sites not added to the home screen after about 7 days unused. Countermeasures:
     - ask the browser for persistent storage
     - push "Add to home screen" early
     - include **Export / Import backup** (one file) in the MVP
     - nudge students to make a backup before big tests
   - **Build for sync later.** Every record gets a random ID (UUID) and created/updated timestamps. The review log is append-only, never edited. Adding accounts and sync later then doesn't mean rewriting the data.
   - **Google Classroom / Canvas import has to wait or be done another way.** The Classroom API needs sign-in. Canvas and Google calendar feeds can't be fetched straight from a browser (the browser's cross-site rules (CORS) block it), so they need a tiny server proxy. Fully local options for now: manual entry and uploading a downloaded `.ics` calendar file.
   - **One device per student for now.** Moving between devices works through backup export and import.
4. ~~Business model?~~ **Free to study forever, with Plus later for sync and AI** (§7c). Phase 1 is completely free.
5. **A name?** Or should naming be part of the design pass?
7. **Tester countries and ages.** Who exactly is in the beta, and where do they live? This decides which privacy rules apply (US, EU, UK, Singapore and so on). Needed **before inviting testers**, not before designing.
8. **Testers' devices.** Which phones and browsers do the testers use (iPhone/Safari, Android/Chrome)? These become the minimum supported devices, tested on the real hardware.
9. **Images in the beta?** The planning pack suggests text-only cards for the beta to keep backups simple. **I've kept images**, because you asked for picture uploads, and the backup format already handles them ([spec §4](product-spec.md)). Say if you'd rather start text-only.
10. **Beta hosting budget.** Proposed: **$0/month** (a free static host) plus an optional ~$12/yr domain.
6. ~~Visual vibe?~~ **B, Highlighter** (§6).

---
_Sources: competitor research by three research agents on 2026-11-07. Key references: RemNote Exam Scheduler docs, Anki forum "Deadline/exam date feature" thread, ts-fsrs and fsrs-rs repos, Trustpilot pages for Quizlet, Knowt and Brainscape, Canvas iCal and OAuth docs. Some pricing and complaint data came second-hand from review blogs and is marked unverified in the raw notes._
