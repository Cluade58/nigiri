# Product brief

_Rewritten 2026-11-07 after the scope reset. The earlier research-heavy version (competitor research, business model, privacy, beta plan) is in git: `git show f74b21e:product-brief.md`._

## What this is

**Nigiri** is a pure flashcards app for you and a few friends, built as your first AI-assisted app. It has decks, cards and FSRS reviews, and a deck can have a test date (Test mode). Nothing else. There's no company and no launch. **Goal: it works, it's easy to use, and you keep using it.**

**The product is the card and how it gets made.** The whole product is input: making cards has to be so cheap that you keep doing it. The card-creation flow is in [product-spec.md §1](product-spec.md), and you have the final say on it. Everything else is built outward from it.

**Scope rule:** before adding a feature, name who uses it in the first month. If nobody does, it's out.

## Decided

- **Name:** Nigiri.
- **Platform:** a phone web app on the home screen, hosted on GitHub Pages. **It also works on a laptop (your decision, 2026-11-08: "Bento Today + desktop", D49):** Today becomes a grid of tiles that widens on desktop, and every other screen sits in a centred column. Phones stay the main device.
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
- **Test mode is in version one:** one test per deck and the fit check, with no readiness number. The deck shows how many cards are studied and not studied yet, and today's share (D44). The fit check counts a fixed 20 seconds per card and adds up every deck with a test ahead. New cards are spread over the days before the test, so each gets at least a night before it. The date is a calendar day; adding, editing or removing a test never changes a card's schedule; after the test, the deck goes back to normal (decided 2026-11-08; [spec §2](product-spec.md), [fsrs-notes §10](fsrs-notes.md)). A test date is what makes someone open the app on a Tuesday.
- **Reminders when cards are due** (your decision, 2026-11-08): build step 4. At most one a day, only when cards are due, and never any card text or deck name. Asked on Done, from the first one after step 4 ships, until you answer. **Sent through a small free sender on Cloudflare** (your choice, 2026-11-08), so they reach iPhone and Android on time. It gets only each phone's push address and next reminder time ([publishing.md](publishing.md#reminders-step-4)).
- **Pure flashcards:** no assignment tracker and no calendar. Homework gets tracked elsewhere. Rechecked 2026-11-08 against a direction that mentioned assignments, and you confirmed it: "Keep them out" (D40). A test date on a deck is the only thing you schedule.
- **No lives and no caps on reviewing.** No streak either: progress is counted, never lost. Done says how many cards you reviewed, home welcomes you back after days away, and a test deck says when every card is studied. "Days studied this week", which never resets, waits for version 1.1 ([spec §8](product-spec.md); D45).
- **How it should feel** (decided 2026-11-08): you open it and know what to do next and roughly how long it takes, Test mode shows facts rather than forecasts, and stopping never loses anything. The principles and the journey are in [UI-DESIGN-BRIEF.md](UI-DESIGN-BRIEF.md), "How Nigiri should feel".
- **Build order and the two-week test:** [spec §7](product-spec.md).
- **Visual direction: B, Highlighter.** The reference screens start at `mockups/index.html`.
- **Colours: four themes you can switch (your decision, 2026-11-08: "Go with these four, the ink colblat snow is the default, this setting should be able to be sewitched").**
  - **Each theme is a trio you picked:** a background (about 60% of the screen), a text colour (30%), and one accent for the button (10%). **Ink + Cobalt + Snow is the default** on every phone. The themes replace Grape (D38) and the earlier row-103 colours. [PROJECT-STATE.md](PROJECT-STATE.md) D39 has why, and every measured number.
  - **Switching:** Settings → Theme: four rows, one tap each. It arrives in build step 2; step 1 ships with Snow only. The theme replaces following the phone's light/dark setting, and Midnight is the dark one. It's saved on this phone only and isn't in the export (D39a–D39d). **Step 2 tests** (moved from spec §5): one tap on a theme repaints every screen; it survives a reload with no flash of Snow first; the phone's dark mode doesn't change it; Restore leaves it alone.
  - **For the builder** (moved from spec §7): each theme is one `[data-theme]` block of CSS variables, with Ink + Cobalt + Snow on `:root` (`mockups/highlighter.css`). Use no `prefers-color-scheme`. In step 2, an inline script in `index.html` reads the saved theme before the first paint and sets `data-theme` and `<meta name="theme-color">`. The manifest's splash colours are Snow's, because a manifest can't change per person.
  - **The rule:** the accent marks acting and focus only: the one filled button, the key you just rated, the focus ring and the progress bar. Ink draws everything else. The deck highlighters stay yours in every theme.
  - **Supporting colours** are tints and shades of each trio's own hues, measured to WCAG AA: 4.5:1 for text, 3:1 for UI parts and focus. Error red is the one colour outside the trios, because "Not saved" has to read as red.
  - **History:** earlier palettes are in git: navy (`git show bcb812d:product-brief.md`), row 103 (`de1a806`), Grape (`116bf50`).

| Token | What it draws | Ink + Cobalt + Snow (default) | Plum + Berry + Mist | Espresso + Amber + Cream | Midnight + Ice + Sky |
|---|---|---|---|---|---|
| Page (your background, 60%) | the page, bars, fields | `#F5F7FC` | `#FAF7FB` | `#FBF8F1` | `#141B24` |
| Surface | the edit sheet only | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#1E2836`, with a `#56647A` hairline on its top edge |
| Ink (your text, 30%) | all text and icons, outlined buttons, rating keys at rest, the rule under the question | `#17243C` | `#302039` | `#33291F` | `#F3F5F7` |
| Secondary text | secondary lines, placeholders, field borders, chevrons | `#4C576A` | `#5F5266` | `#5E564C` | `#AEB7C4` |
| Rules | dividers, progress track | `#DBDEE5` | `#E2DEE4` | `#E3DFD8` | `#2A3340` |
| Primary button (your accent, 10%) and its text | the one filled button per screen | `#3158C9`, white | `#9C356B`, white | `#A45613`, white | `#8FB7FF`, `#141B24` |
| Pressed button | the filled button while pressed | `#2D50B4` | `#8C3264` | `#934F15` | `#80A4E5` |
| Rated key | the key you just tapped, with the button's text colour | `#3158C9` | `#9C356B` | `#A45613` | `#8FB7FF` |
| Focus ring | keyboard focus, the field you're typing in | `#3158C9` | `#9C356B` | `#A45613` | `#8FB7FF` |
| Progress bar | the review progress, on the rules track | `#3158C9` | `#9C356B` | `#A45613` | `#8FB7FF` |
| Done highlight | the highlighter behind "Done" (full strength in every theme) | `#A6BEFF` | `#F5A3CE` | `#F5BC8A` | `#C1D6FB` |
| Error | error lines, invalid borders | `#B91C1C` | `#B91C1C` | `#B91C1C` | `#F87171` |
| Text on highlights | dark text on every deck colour and on Done | the ink | the ink | the ink | `#141B24` (the page) |
| Scrim | behind the edit sheet | ink at 50% | ink at 50% | ink at 50% | `#06090D` at 60% |

  **Tile roles (D51, 2026-11-08):** Today's tiles use Surface with a 1px Rules border and a 16px radius. Midnight's tiles use the Page colour with the Rules border instead, so their dividers stay visible (1.36, not 1.17 on `#1E2836`). Rules also fills a pressed row. On desktop the edit sheet becomes a centred dialog, and Midnight's hairline goes all the way round it. No new token.

| Deck colour (you pick one per deck) | Highlight: marks and the picker | Pen: the 6px swatch, light themes | Midnight |
|---|---|---|---|
| Green | `#7BE38A` | `#33934A` | highlight at 85% |
| Blue | `#7CC8FF` | `#3384CC` | highlight at 85% |
| Pink | `#FF8FC8` | `#D23C8A` | highlight at 85% |
| Orange | `#FFB65C` | `#C2650C` | highlight at 85% |
| Yellow | `#FFE45C` | `#A37F00` | highlight at 85% |
| Purple | `#DAA8F7` | `#AD4BD0` | `#E2A0F0` at 85% |

  The deck colours are unchanged in every theme. The light themes need two tones per deck: a pastel can't reach 3:1 against the page as a thin swatch and also keep dark text readable as a highlight. Dark text sits on every highlight, like a real pen.
  **Near pairs:** Cobalt and Sky sit near Blue, Berry near Pink, and Amber near Orange. They stay apart by shape: the accent only fills buttons and keys and draws the 2px ring and progress line, while deck colours only draw 6px swatches, picker tiles, and bands behind text. Neither ever takes the other's role. In the light themes, a deck's highlight is also about 3:1 lighter than the accent. In Midnight every deck colour is as light as Sky, so shape is the only cue (D39e).

  Type: Bricolage Grotesque for headings, Atkinson Hyperlegible Next for body, both bundled with the app. Colour marks only what matters: the main button, the key you just rated, focus, deck colours, and the highlighter over what just changed. Everything else stays quiet.

- **Stack (exact versions):**
  - React 19.3.1, TypeScript 6.0.3
  - Vite 8.3.6 with `@vitejs/plugin-react` 6.2.1, and `vite-plugin-pwa` 2.0.0 (home screen and offline)
  - Dexie 4.4.7 with `dexie-react-hooks` 4.4.0
  - `ts-fsrs` 6.0.0, React Router 8.5.1, date-fns 4.4.0
  - plain CSS variables
  - `@fontsource-variable/bricolage-grotesque` and `@fontsource-variable/atkinson-hyperlegible-next` 5.3.0
  - Vitest 5.1.0, Playwright 1.65.0 (the `@playwright/test` package)
  - Helpers for checking code, never shipped to phones (added 2026-11-08): `@types/react` 19.3.0 and `@types/react-dom` 19.3.0 (TypeScript needs them for React), `fake-indexeddb` 6.2.7 (tests saving without a browser)
  - Lint, never shipped to phones (D55, installed 2026-11-08): `eslint` 10.14.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.72.1, `eslint-plugin-react-hooks` 7.1.1, `globals` 17.14.0
  - Screenshots: `puppeteer` (from before the build, still a `^25.16.0` range in package.json; 25.16.0 installed)
  - GitHub Pages, from the `Cluade58/nigiri` repository (renamed from `study-app-design` on 2026-11-07; public, so Pages is free)

## Undecided

- **What v2 is.** The two-week test decides ([spec §7](product-spec.md)).

## What the research taught (one line each)

- **Gizmo's lives** and **Quizlet's caps** are what students resent most. We have neither.
- **Gamification** (two guides, read 2026-11-08): Octalysis says progress, creativity and ownership keep people coming back, while scarcity and fear of loss bring burnout. Writing your own cards is the creativity part, so we count effort and never punish a missed day (D45).
- **RemNote** already schedules around exam dates. Our difference is the fit check: does the plan fit your time?
- **Anki** is powerful but hard to learn. Ours works with no settings.
- **Anki's FSRS settings** (checked 2026-11-08): we copy its single-step setup (Again 1 minute, Hard 1.5×), but not its FSRS-6, fuzz, learn-ahead, day boundary, leeches or optimizer ([fsrs-notes §8](fsrs-notes.md)).
- **Spacing before a test** (checked 2026-11-08): a gap of under a day before the test costs the most, so new cards finish a day early ([fsrs-notes §10](fsrs-notes.md)).
- **Reminders** (checked 2026-11-08): with no server, an iPhone home-screen app can't remind anyone while it's closed ([publishing.md](publishing.md#reminders-step-4)).
- **Other apps** (checked 2026-11-08): our card-making flow already beats most. We added a double-tap guard and kept drafts (AnkiMobile has a double-tap guard).
- **Cards you write yourself** beat premade ones in 5 of 6 experiments, but only when students were told which terms to cover ([spec §1](product-spec.md)).
