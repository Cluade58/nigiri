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

- **The plan:** `CLAUDE.md`, `PROJECT-BRIEF.md`, `product-brief.md`, `product-spec.md`, `UI-DESIGN-BRIEF.md`, `v2-input-flows.md`, and this file.
- **Design:** `mockups/`, the phone screens. Start at `mockups/index.html`.
- **Helpers:** `.claude/agents/` (six roles) and `.claude/skills/`.
- **Tools:** `tools/screenshot.mjs`, `package.json`, `package-lock.json`, `.gitignore`.
- **Left off GitHub on purpose:** `node_modules/`, `screenshots/`, `.claude/settings.local.json`, `.impeccable/`, and any `.env` file.
- **Arrives with build step 1:** `src/` (the app's code), the app's packages (versions in the brief), and `.github/workflows/deploy.yml` (the publishing file).

## Web address

**Decided:** `https://cluade58.github.io/nigiri/`.

**An address of your own instead, like `www.nigiri-study.com`: undecided.**
- **Keep the GitHub address:** free and already set up, but the link says "github".
- **Your own domain on GitHub Pages:** the address is yours and hosting stays free, but it usually costs about $10–20 a year and has to be renewed every year.

**Pick before anyone installs.** A phone saves cards under the exact address the app came from. If the address changes later, the app opens empty at the new address and everyone's cards stay behind at the old one. Moving them means export, then restore. Changing the address also breaks home-screen icons.

**If you pick your own domain:**
1. Buy it from a domain seller (a "registrar").
2. On GitHub, go to Settings → Pages → Custom domain, type it, and tick **Enforce HTTPS**.
3. At the domain seller, point `www` at `cluade58.github.io`.
4. The build setting changes from `/nigiri/` to `/`.

If the domain ever runs out, every icon stops working and someone else can buy the name.

## When to publish

- **For you:** at the end of build step 1 ([spec §7](product-spec.md)). Then use it yourself for a week.
- **For friends: undecided.**
  - **Right after your week with step 1:** they get it sooner, but there's no backup yet, so a deleted icon loses their cards.
  - **After step 2 (export and restore):** they wait a little longer, but from day one their cards can be saved to a file.

## How to publish

1. You say "start implementing", and step 1 gets built.
2. The publishing file, `.github/workflows/deploy.yml`, gets added.
3. **You do this once:** on github.com, open the repo, then **Settings → Pages**. Under "Build and deployment", set **Source** to **GitHub Actions**.
4. You approve the commit and the push.
5. GitHub builds and publishes it in a minute or two. A green check shows up in the repo's **Actions** tab.
6. Open the web address on your phone and tap **Add to Home Screen**.
7. When it's their turn, send your friends the link.

After that, publishing just means pushing.

## Installing

There's no app store.
- **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
- **Android:** open the link in Chrome, tap ⋮, then **Install app** (or **Add to Home screen**).

It opens full screen and works offline, because `vite-plugin-pwa` keeps a copy of the app on the phone.

**Tell friends on iPhone:** add it to the home screen first, then make cards there. Safari and the home-screen app keep separate cards.

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

- Your own domain or the GitHub address.
- When friends get the link.
