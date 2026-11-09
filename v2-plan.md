# v2 plan: the working list

_Started 2026-11-09. This collects what has been agreed or suggested for Nigiri's second version, so nothing gets lost while the user writes their own list of changes. Nothing here is built. When the user's list is ready, the two get merged, cut down, and turned into one build plan._

**New goal (the user, 2026-11-09):** publish Nigiri publicly and make it a real alternative to Anki, RemNote and Gizmo, not just an app for a few friends. The goal lines in CLAUDE.md, PROJECT-BRIEF.md and product-brief.md still say "a few friends" and need updating before v2 is built.

## 1. Do first (small, big impact)

1. **Publish:** add the GitHub Pages deploy file and turn Pages on.
2. **Rename and delete a deck.**
3. **Undo the last rating.**
4. **Edit a card during review.**
5. **Protect people's data:** an "add to home screen" prompt (Safari can wipe a site's storage after about 7 days without a visit) and a gentle backup reminder.

## 2. AI card making (the user's decision, 2026-11-09: Cloudflare Workers AI)

Turn a PDF or pasted text into **draft** cards. The user checks, edits, keeps or deletes each draft before it saves.

- **Service:** Cloudflare Workers AI, starting on the free 10,000 neurons a day. Model to start with: Gemma 4 (26B), about 45 free 20-page PDFs a day (estimate).
- **How it works:** the app pulls the text out of the PDF (pdf.js, a new dependency), sends it to a Cloudflare Worker, and the Worker asks the model for front/back pairs. The key and the model stay on the Worker, never in the app.
- **Limits:** a page cap (about 30 pages), a daily limit per device, and the free allowance. Scanned PDFs (photos of pages) won't work.
- **Shown to users:** "Cards drafted by AI", plus a privacy note on what is sent and where.
- **Cost if it grows** (estimates): 10,000 users doing one PDF a day would be about $720 a month on Gemma, plus the $5 Workers Paid plan.

**Before building:**
- Check Cloudflare's terms and the model's licence for age rules (account holder, and apps used by under-18s). Gemini was ruled out because its terms ban apps likely used by under-18s.
- The user (or an adult, if the terms require it) creates the Cloudflare account.
- Update the card-flow rule (product-spec.md §1, the user's): "no import, no AI" becomes "AI may draft cards from your own material, and you approve each one".

## 3. Card types

- **Reverse cards:** one card tests both directions (vocab decks).
- **Fill-in-the-blank (cloze):** "The Krebs cycle makes [2 ATP] per glucose".
- **Images:** still undecided in the spec.

## 4. Faster card making

- **Keyboard flow:** Enter on Front jumps to Back; Ctrl+Enter saves.
- **Paste a list:** "term – definition" lines become cards to check before saving.
- **Quick add:** a + that's always visible.
- **"This card is too long" nudge**, and spotting cards people keep forgetting so they can rewrite them.

## 5. Screens (from the latest screenshots)

- **Add card:** Bold and List buttons instead of `**bold**` marks; Save right under the fields (no empty gap); a deck picker you can tap to change; rank-ups only on Done, not in "Added this time".
- **Review:** show that a long card scrolls; a smaller deck label instead of the big coloured banner; a ⋯ menu with undo, edit and skip; on desktop, Space to reveal and 1–4 to rate.
- **Today on a phone:** due cards, then decks, then progress. Make the streak a single week strip; keep the full calendar on Progress.
- **Deck page:** search cards; deck settings (rename, colour, delete); sort by newest, due soon, or most forgotten.
- **First time:** a clear "Make your first deck" screen, maybe a small sample deck to try a review in 10 seconds.
- **Polish:** a stronger "Nigiri" title on phone; fill desktop Today's empty right side; the "Done" heading highlight box.

## 6. Bringing people back, and knowing it works

- **Reminders:** a daily "12 cards due" notification (spec step 4; on iPhone only for home-screen apps).
- **A "Send feedback" link** in Settings.
- **Simple, privacy-friendly usage counts** (does anyone come back after 7 days?), with a privacy note.
- **A one-page website** that says what Nigiri is and why writing your own cards works.

## 7. Later or parked

- **Accounts and sync:** the biggest gap with competitors, built once people keep coming back.
- **Anki import:** only if Nigiri goes after Anki users. It's the user's call, because it changes the card-flow rule.
- **Group decks by class.**
- **Leagues, quests, achievements, weekly recap.**
- **Share into Nigiri** (Android only).
- **Mandarin and math cards** ([v2-input-flows.md](v2-input-flows.md)).
- **Test readiness number.**
- **Rank badges:** fix the egg-shaped Rice Grain, commit, and stop there.
