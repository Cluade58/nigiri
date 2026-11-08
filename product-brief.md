# Product brief

_Rewritten 2026-11-07 after the scope reset. The earlier research-heavy version (competitor research, business model, privacy, beta plan) is in git: `git show f74b21e:product-brief.md`._

## What this is

**Nigiri** is a pure flashcards app for you and a few friends, built as your first AI-assisted app. It has decks, cards and FSRS reviews, and a deck can have a test date (Test mode). Nothing else. There's no company and no launch. **Goal: it works, it's easy to use, and you keep using it.**

**The product is the card and how it gets made.** The whole product is input: making cards has to be so cheap that you keep doing it. The card-creation flow is in [product-spec.md §1](product-spec.md), and you have the final say on it. Everything else is built outward from it.

**Scope rule:** before adding a feature, name who uses it in the first month. If nobody does, it's out.

## Decided

- **Name:** Nigiri.
- **Platform:** a phone web app on the home screen, hosted on GitHub Pages. No desktop layout.
- **Web address:** `https://cluade58.github.io/nigiri/`, the free GitHub address, with no domain of your own (decided 2026-11-07). Keep it fixed once anyone installs, because changing it breaks their home-screen icon and leaves their cards behind ([publishing.md](publishing.md)).
- **Friends get the link after step 2** (export and restore), so their cards can be backed up from day one (decided 2026-11-07 by chief-officer; [publishing.md](publishing.md)).
- **Updates:** silent. A phone picks up the new version the next time the app opens, and nobody reinstalls. After an update, a short "What's new" note shows once on home ([spec §6](product-spec.md)).
- **Decks:** made with a separate **New deck** button on home. You name each deck and pick its highlighter colour ([spec §6](product-spec.md)).
- **Scheduling:** FSRS via `ts-fsrs@6.0.0` (pinned), default parameters (the FSRS-7 model), target 90% (fixed), except **95% for Easy** (your rule, 2026-11-08: a shorter Easy). A new card rated Easy now comes back in about 13 days instead of 54, and on a card you know, Easy is a day longer than Good ([fsrs-notes §9](fsrs-notes.md)). How the library behaves is in [spec §2](product-spec.md). With no test date, new cards come due as ts-fsrs 6 decides, with no daily limit added by the app. "Due" means due now, with no day boundary ([spec §2](product-spec.md)).
  - **Steps (your rule, 2026-11-08):** only Again has a set delay, 1 minute, for new and forgotten cards (`learningSteps` and `relearningSteps` `['1m']`, model override off). Hard on a card you're still learning waits 90 seconds, the library's built-in rule (as in Anki). Everything else is calculated by FSRS, never less than 1 day.
  - **FSRS-7 stays** over Anki's FSRS-6, because FSRS-6 inside ts-fsrs counts whole UTC days ([fsrs-notes §5](fsrs-notes.md)).
- **Built first:** plain English text cards. Mandarin and math are on the [v2 page](v2-input-flows.md).
- **One way to make cards: write your own.** No import, and no AI ([spec §1](product-spec.md)).
- **Domains:** each domain is its own product, with its own input path and its own review screen. They share only the scheduler and the deck.
- **Test mode is in version one:** one test per deck and the fit check, with no readiness number. The fit check counts a fixed 20 seconds per card and adds up every deck with a test ahead. New cards are spread over the days before the test, so each gets at least a night before it. The date is a calendar day; adding, editing or removing a test never changes a card's schedule; after the test, the deck goes back to normal (decided 2026-11-08; [spec §2](product-spec.md), [fsrs-notes §10](fsrs-notes.md)). A test date is what makes someone open the app on a Tuesday.
- **Reminders when cards are due** (your decision, 2026-11-08): build step 4. At most one a day, only when cards are due, and never any card text or deck name. Asked on Done, from the first one after step 4 ships, until you answer. **Sent through a small free sender on Cloudflare** (your choice, 2026-11-08), so they reach iPhone and Android on time. It gets only each phone's push address and next reminder time ([publishing.md](publishing.md#reminders-step-4)).
- **Pure flashcards:** no assignment tracker and no calendar. Homework gets tracked elsewhere.
- **No lives and no caps on reviewing.** The streak waits for version 1.1 ([spec §8](product-spec.md)).
- **Build order and the two-week test:** [spec §7](product-spec.md).
- **Visual direction: B, Highlighter.** The reference screens start at `mockups/index.html`.

| Token | Light | Dark |
|---|---|---|
| Page | `#F8FAFD` | `#141B2B` |
| Ink | `#1B2A4A` | `#E6ECF7` |
| Secondary text | `#4A5874` | `#A8B4CB` |
| Tint | `#EEF3FA` | `#1C2539` |
| Rules | `#E3E9F2` | `#263049` |
| Highlighters (one per deck, you pick) | Green `#7BE38A`, Blue `#7CC8FF`, Pink `#FF8FC8`, Orange `#FFB65C`, Yellow `#FFE45C`, Purple `#C3A6FF` | same at 85% opacity |
| Error | `#B3261E` | `#FFB4AB` |

  Type: Bricolage Grotesque for headings, Atkinson Hyperlegible Next for body, both bundled with the app. The highlighter marks deck colours and what just changed; everything else stays quiet.

- **Stack (exact versions):**
  - React 19.3.1, TypeScript 6.0.3
  - Vite 8.3.6 with `@vitejs/plugin-react` 6.2.1, and `vite-plugin-pwa` 2.0.0 (home screen and offline)
  - Dexie 4.4.7 with `dexie-react-hooks` 4.4.0
  - `ts-fsrs` 6.0.0, React Router 8.5.1, date-fns 4.4.0
  - plain CSS variables
  - `@fontsource-variable/bricolage-grotesque` and `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0
  - Vitest 5.1.0, Playwright 1.65.0 (the `@playwright/test` package)
  - Helpers for checking code, never shipped to phones (added 2026-11-08): `@types/react` 19.3.0 and `@types/react-dom` 19.3.0 (TypeScript needs them for React), `fake-indexeddb` 6.2.7 (tests saving without a browser)
  - GitHub Pages, from the `Cluade58/nigiri` repository (renamed from `study-app-design` on 2026-11-07; public, so Pages is free)

## Undecided

- **What v2 is.** The two-week test decides ([spec §7](product-spec.md)).

## What the research taught (one line each)

- **Gizmo's lives** and **Quizlet's caps** are what students resent most. We have neither.
- **RemNote** already schedules around exam dates. Our difference is the fit check: does the plan fit your time?
- **Anki** is powerful but hard to learn. Ours works with no settings.
- **Anki's FSRS settings** (checked 2026-11-08): we copy its single-step setup (Again 1 minute, Hard 1.5×), but not its FSRS-6, fuzz, learn-ahead, day boundary, leeches or optimizer ([fsrs-notes §8](fsrs-notes.md)).
- **Spacing before a test** (checked 2026-11-08): a gap of under a day before the test costs the most, so new cards finish a day early ([fsrs-notes §10](fsrs-notes.md)).
- **Reminders** (checked 2026-11-08): with no server, an iPhone home-screen app can't remind anyone while it's closed ([publishing.md](publishing.md#reminders-step-4)).
- **Other apps** (checked 2026-11-08): our card-making flow already beats most. We added a double-tap guard and kept drafts (AnkiMobile has a double-tap guard).
- **Cards you write yourself** beat premade ones in 5 of 6 experiments, but only when students were told which terms to cover ([spec §1](product-spec.md)).
