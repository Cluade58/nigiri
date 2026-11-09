# Features plan: making Nigiri fuller

_Draft plan, 2026-11-09. The user picked these six from a list of 13: "Progress bar, grouping decks, practice round, several cars in a row, formatting, share into nigiri, is ggood. i ike it". Nothing is built. Gamification is planned separately in [gamification-plan.md](gamification-plan.md). Chief-officer turns these into tasks when the user says to build._

## The six features

| # | Feature | What it is | Who uses it in month one | Effort |
|---|---|---|---|---|
| 1 | **Several cards in a row** | After Save card, you stay on the same deck and the cursor goes back to Front. Cards saved this session stack up below as a short list you can tap to edit. | Anyone making a deck from their notes | Small |
| 2 | **Formatting** | Line breaks, **bold** and bullet lists in answers. Written with a few simple marks or toolbar buttons, and shown formatted in review and on the deck page. | Anyone with multi-part answers | Small–medium |
| 3 | **Share into Nigiri** | Highlight text in another app, tap Share, then Nigiri, and Add card opens with that text as the front. You still write the back. | Anyone reading for class on their phone | Medium |
| 4 | **Deck progress bar** | Each deck shows a bar split into New, Learning and Solid, with real counts, on the deck page and in deck lists. | Everyone, every deck | Small |
| 5 | **Practice round** | Run through any deck now, including cards that aren't due, without changing when they come back. Reached from the deck page, apart from Review. | Anyone with a test tomorrow | Medium |
| 6 | **Group decks by class** | Put decks under a class ("AP Bio" holds unit 3 and unit 4). Decks tab, sidebar and Today show classes you can open or fold. | Anyone with several units per class | Medium |

## Things to settle before building

- **Share into Nigiri changes the card flow (spec §1), which is the user's.** By picking it, the user approved shared text arriving as the front. Still to be written into §1 by chief-officer.
- **iPhones can't share into web apps.** The share target only works on Android, in a Nigiri installed from Chrome. Safari on iPhone doesn't support it. So on iPhone, feature 3 does nothing, and iPhone users keep copy and paste. Check which phones the friends have before building it.
- **What "Solid" means** on the progress bar: chief-officer decides, with learning-specialist (for example, a card that won't be due for at least 3 weeks). The screen never shows scheduler words.
- **Practice round and the scheduler:** practice answers must not save as reviews or change any card's next date. They also earn no XP, because XP comes only from due cards (gamification plan).
- **Formatting stays text.** No images, colours or fonts. Images are still undecided (spec §1).
- **Grouping decks** needs a new "class" record in the database and in backups. That's the only feature here that changes what's stored. It needs an old-backup restore check.

## Suggested order

1. **Round A, small and close to the card:** several cards in a row (1), the deck progress bar (4), formatting (2).
2. **Round B:** practice round (5), group decks by class (6).
3. **Round C:** share into Nigiri (3), once it's known whether the friends' phones are Android.

These can be mixed with gamification rounds. Round A fits well alongside gamification round 1, because both touch the Done screen and deck lists.
