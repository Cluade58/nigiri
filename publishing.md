# Publishing

_Written 2026-11-07. How Nigiri gets from this folder onto phones. The decisions here are also in [product-brief.md](product-brief.md)._

## The short version

Nigiri is a website that installs to the home screen. GitHub stores the code and rebuilds the app on every push. GitHub Pages hands out the files. Each phone runs the app and keeps its own cards. There's no server, no cloud database and no Docker.

## Where everything lives

| What | Where | Notes |
|---|---|---|
| Plan, mockups, tools, later the code | This folder, and [Cluade58/nigiri](https://github.com/Cluade58/nigiri) on GitHub | The repo is public, so Pages is free |
| The built app | GitHub Pages, at the web address below | Rebuilt on every push |
| Cards, reviews, tests | Each person's phone, in browser storage (through Dexie) | Never sent to GitHub, and nobody else sees them |
| Backup | The export file | The only copy that isn't on the phone |
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
- **What's new note.** After an update, one short line on home says what changed, shown once. You write it for each release. It's built in step 4 ([spec §6](product-spec.md)).

## What can go wrong

- **Cards exist only on the phone.** On iPhone, deleting the home-screen icon deletes its cards. On any phone, clearing browser data can too. The export file is the backup.
- **The repo is public.** Never save an export file inside this folder, or it can get committed and anyone can see it.
- **Changing the address after people install leaves their cards behind** (see Web address).

## Words, in plain language

- **Hosting:** the computer that hands out your app's files. Here, GitHub Pages.
- **Domain:** a web address you buy, like `nigiri-study.com`.
- **Runtime:** what runs the code. Here it's the phone's browser engine, so there's no kernel or server to manage.
- **Container (Docker):** a box for a server program. Nigiri has no server program, so it doesn't need one.
- **PWA:** a website that installs to the home screen and works offline.
- **GitHub Actions:** GitHub's robot that builds and publishes the app on every push.
- **Dexie:** the library that saves cards in the phone's browser storage.
- **`package.json`:** the list of packages the app needs, with exact versions.

## Undecided

Nothing. The address and when friends get the link are both decided.
