# Publishing

_Written 2026-11-07. How Nigiri gets from this folder onto phones. The decisions here are also in [product-brief.md](product-brief.md)._

## The short version

Nigiri is a website that installs to the home screen. GitHub stores the code and rebuilds the app on every push. GitHub Pages hands out the files. Each phone runs the app and keeps its own cards. There's no app server, no cloud database and no Docker. The one exception arrives in step 4: a small reminder sender on Cloudflare, which knows only when each phone wants a reminder, never anything about cards ([Reminders](#reminders-step-4)).

## Where everything lives

| What | Where | Notes |
|---|---|---|
| Plan, mockups, tools, later the code | This folder, and [Cluade58/nigiri](https://github.com/Cluade58/nigiri) on GitHub | The repo is public, so Pages is free |
| The built app | GitHub Pages, at the web address below | Rebuilt on every push |
| Cards, reviews, tests | Each person's phone, in browser storage (through Dexie) | Never sent to GitHub, and nobody else sees them |
| Backup | The export file | The only copy that isn't on the phone |
| Reminder sender (step 4) | A small Cloudflare Worker, on your free Cloudflare account | It holds only each phone's push address and next reminder time, never cards |
| Downloaded packages | `node_modules/`, on your laptop only | `package.json` and `package-lock.json` keep the exact list, and `npm install` downloads it again |

## What's in the repo

- **The plan:** `CLAUDE.md`, `PROJECT-BRIEF.md`, `product-brief.md`, `product-spec.md`, `UI-DESIGN-BRIEF.md`, `fsrs-notes.md`, `v2-input-flows.md`, `PROJECT-STATE.md` (chief-officer's running record), and this file.
- **Design:** `mockups/`, the phone screens. Start at `mockups/index.html`.
- **Helpers:** `.claude/agents/` (nine roles) and `.claude/skills/`.
- **Tools:** `tools/screenshot.mjs`, `package.json`, `package-lock.json`, `.gitignore`.
- **Left off GitHub on purpose:** `node_modules/`, `screenshots/`, `.claude/settings.local.json`, `.impeccable/`, and any `.env` file.
- **Arrives with build step 1:** `src/` (the app's code), the app's packages (versions in the brief), and `.github/workflows/deploy.yml` (the publishing file).

## Web address

**Decided (2026-11-07): `https://cluade58.github.io/nigiri/`, the free GitHub address.** There's no domain of your own, so nothing to buy or renew.

**Keep it fixed.** A phone saves cards under the exact address the app came from. If the address changed later, the app would open empty at the new address, and everyone's cards would stay behind at the old one. Moving them would mean export, then restore, and home-screen icons would break. The address only changes if the GitHub account or the repository is renamed, so don't rename either once anyone has installed.

## When to publish

- **For you:** at the end of build step 1 ([spec §7](product-spec.md)). Then use it yourself for a week.
- **For friends: after step 2 (export and restore).** Decided 2026-11-07 by chief-officer. They wait a little longer, but from day one their cards can be saved to a file. Before step 2, a deleted icon would lose everything, and a friend who loses their cards in week one is unlikely to come back.

## How to publish

1. You say "start implementing", and step 1 gets built.
2. The publishing file, `.github/workflows/deploy.yml`, gets added.
3. **You do this once:** on github.com, open the repo, then **Settings → Pages**. Under "Build and deployment", set **Source** to **GitHub Actions**.
4. You approve the commit and the push.
5. GitHub builds and publishes it in a minute or two. A green check shows up in the repo's **Actions** tab.
6. Open the web address on your phone and tap **Add to Home Screen**.
7. After step 2, send your friends the link, with the message below.

After that, publishing just means pushing.

## Installing

There's no app store.
- **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap ⋮, then **Install app** (or **Add to Home screen**).

It opens full screen and works offline, because `vite-plugin-pwa` keeps a copy of the app on the phone.

**Tell friends on iPhone:** add it to the home screen first, then make cards there.
- Safari and the home-screen app keep separate cards.
- In a Safari tab, Safari deletes a site's saved data after seven days of using Safari without visiting it. Home-screen apps keep their own count, and WebKit says it doesn't expect their data to be deleted ([WebKit, 2020](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)).
- Since Safari 17, the app can also ask to keep its data, and Safari decides partly by whether it was opened from the home screen ([WebKit, 2023](https://webkit.org/blog/14403/updates-to-storage-policy/)). The app asks after the first save ([spec §3](product-spec.md)).

**Message to send friends** (edit it however you like; you send it, nobody else):

> Here's Nigiri, the flashcards app I made: https://cluade58.github.io/nigiri/
> iPhone: open it in Safari, tap Share, then Add to Home Screen, and always use it from there.
> Android: open it in Chrome, tap ⋮, then Install app.
> Your cards stay on your phone only. Every week or so, open Settings and tap Export to save a backup.

## Updates

- **Silent.** A phone picks up the new version the next time the app opens, and nobody reinstalls.
- **What's new note.** After an update, one short line on home says what changed, shown once. You write it for each release. It's built in step 5 ([spec §6](product-spec.md)).

## Reminders (step 4)

_Researched 2026-11-08 by competitor-researcher (R-NOTIF-1). Every page was opened that day, and nothing was tested on a phone yet._

**You decided you want reminders when cards are due,** and on 2026-11-08 you chose **option B, a small free sender on Cloudflare**, because it's the only way that works on iPhone.

**What a home-screen web app can do with no server:**

| Way | iPhone | Android | Works while Nigiri is closed? | Source |
|---|---|---|---|---|
| Web Push | iOS 16.4+, home-screen apps only, permission asked from a tap | Yes | Yes, **but a server must send each push** | [WebKit, 2023-02-16](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [web.dev](https://web.dev/articles/push-notifications-how-push-works) |
| Declarative Web Push | iOS 18.4+, home-screen apps | Not found in Chrome | Yes, but still needs a sender: "works exactly as before" | [WebKit, 2025-03-27](https://webkit.org/blog/16535/meet-declarative-web-push/) |
| Scheduled local notifications (Notification Triggers) | Never shipped | Ended: Chrome stopped the work | — | [Chrome docs](https://developer.chrome.com/docs/web-platform/notification-triggers) |
| Periodic Background Sync | Not supported | Installed app only; the browser picks when, at most about every 12 hours | Sometimes, at a time Android picks | [Chrome docs](https://developer.chrome.com/docs/capabilities/periodic-background-sync), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API) (2026-08-31) |
| A notification from the open app | Yes, after permission | Yes | No: a closed app runs nothing | [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification) (2026-10-11) |
| Number on the app icon (Badging) | iOS 16.4+, needs notification permission | Not supported (Android shows a dot for unread notifications) | iPhone: only through a push | [Chrome docs](https://developer.chrome.com/docs/capabilities/web-apis/badging-api), [caniuse](https://caniuse.com/mdn-api_navigator_setappbadge) |
| A calendar file (.ics) | **Unverified** from a home-screen app on iOS 26/27 | **Unverified**; Google's help says import works "on a computer" | Yes, once saved: the calendar does the alert. Fixed times, not when cards are due | [Google](https://support.google.com/calendar/answer/37118) |

The researcher read the Safari 26.0, 27.0, 27.1 and 27.2 release posts (Sept 2025 to Oct 2026), and none changes this ([Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)).

**Decided (2026-11-08, your choice): B, a small free sender on Cloudflare** (a Worker with a timer for each phone). Reminders arrive on time on both phones. You make a free Cloudflare account and keep this second small program running. Each phone sends only its push address and its next reminder time, never card text or deck names.
- **The option not chosen:** A, no server. Only Android would get reminders, hours late, and iPhone none while Nigiri is closed.
- **Free plan, checked 2026-11-08** on Cloudflare's own pages:
  - 100,000 requests a day, and 10 ms of processing per request or timer; waiting on the network doesn't count ([limits](https://developers.cloudflare.com/workers/platform/limits/)).
  - Timers (Durable Object alarms) are on the free plan, with SQLite storage, and count toward the same 100,000 a day ([Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)).
  - Cloudflare has its own guide for scheduled web push reminders ([guide](https://developers.cloudflare.com/agents/guides/push-notifications/)).
- **Sign-up:** Cloudflare's account guide asks only for an email and a password, then a verification email ([create an account](https://developers.cloudflare.com/fundamentals/account/create-account/)). It doesn't mention a card. The sign-up form itself wasn't opened, so check it when you make the account.
- **Still to check in step 4:** that one send (signing the push address, with no message body) fits in 10 ms. It probably does, because the signing is a single fast operation.
- **You do this yourself:** make the Cloudflare account. Nobody else can make it for you.
- **Ruled out:** Firebase (scheduled sending needs its paid Blaze plan), OneSignal (delayed sends aren't free), ntfy (every friend installs another app), GitHub Actions (runs "can be delayed" and may be dropped).

**Decided either way (chief, 2026-11-08):**
- **Step 4,** after Test mode, so steps 1–3 don't wait on your choice.
- **At most one reminder a day,** only when cards are due, at about the time you finished your first session after step 4 (rounded to the half hour), changeable in Settings. The notification says "Nigiri" and "Cards are due." and opens home.
- **The ask:** on Done, from the first one after step 4 ships until you answer, from a tap, because iPhone only allows the permission prompt after a tap. "Not now" means it never asks on Done again; Settings has a Reminders switch. Leaving Done without answering isn't a no, so the ask comes back on the next Done (Impeccable critique, 2026-11-08: a habit tap on Back to home shouldn't lose the only ask). It's never shown where reminders can't arrive (an iPhone Safari tab, which only allows them from the home-screen app). Mockup: `mockups/review-done.html?remind`.
- **What leaves the phone:** only the push address and the next time cards will be due, sent after each session or saved card. Never card text, deck names or counts.
- **No icon number:** on iPhone it would go stale while Nigiri is closed, unless the sender updates it. It's on the 1.1 list.

## What can go wrong

- **Cards exist only on the phone.** On iPhone, deleting the home-screen icon deletes its cards. On any phone, clearing browser data can too. The export file is the backup.
- **The repo is public.** Never save an export file inside this folder, or it can get committed and anyone can see it.
- **Changing the address after people install leaves their cards behind** (see Web address).

## Words, in plain language

- **Hosting:** the computer that hands out your app's files. Here, GitHub Pages.
- **Domain:** a web address you buy, like `nigiri-study.com`.
- **Runtime:** what runs the code. Here it's the phone's browser engine, so there's no kernel or server to manage.
- **Container (Docker):** a box for a server program. Nigiri's only server program is the small reminder sender, and Cloudflare runs that without one.
- **Cloudflare Worker:** a small program that Cloudflare runs for you, on a free account. Nigiri's sends the reminders (step 4).
- **Push address:** a private address a phone gives out, so that a sender can deliver notifications to it. It says nothing about your cards.
- **PWA:** a website that installs to the home screen and works offline.
- **GitHub Actions:** GitHub's robot that builds and publishes the app on every push.
- **Dexie:** the library that saves cards in the phone's browser storage.
- **`package.json`:** the list of packages the app needs, with exact versions.

## Undecided

Nothing. The address, when friends get the link, and how reminders are sent (option B, 2026-11-08) are all decided.
