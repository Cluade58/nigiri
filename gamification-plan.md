# Gamification plan: streaks, XP, levels, leagues

_Draft plan, 2026-11-09. The user asked for "streaks, xp, leagues, and that stuff. no implementation, just see what we want to add, planing for iterations", with "almost no limit". Nothing here is built. Chief-officer turns the iterations into tasks when the user says to build one. Two decisions are the user's (at the end)._

**This replaces earlier rules where they clash** (the user's call, 2026-11-09): D67's "no points, levels, badges or freezes", and the "Left out" gamification list in UI-DESIGN-BRIEF.md. Still true: honest numbers, no guilt words ("lost", "behind", "don't break", "you missed"), reduced motion respected, and the four themes.

## The one rule that protects the scheduler

**Ratings never change XP.** If Good earned more than Again, people would tap Good on cards they forgot, and FSRS would schedule those cards wrong. So:
- A review earns the same XP whatever you tap.
- Each card earns review XP **once per day**. Tapping Again to see it again doesn't farm XP.
- XP comes only from saved reviews and cards (Study early's new cards count too, D63). _Corrected 2026-11-09 (LS-4 F1):_ ratings do decide how many cards come due, so tapping Again could raise future review XP. Harmless while solo; leagues need a damper first (D73).
- **Making cards earns the most XP.** The whole product is people writing their own cards, so XP rewards exactly that.

**Everything is counted from saved data** (reviews and cards), like the streak already is. XP, levels, quests and achievements need no new storage, and backups carry them automatically. The only new things stored are the league nickname and the player id.

## Who uses it in month one

- **Everyone, daily:** XP, the daily quest, and the streak, on every session's Done screen.
- **The friend group, weekly:** the league is the reason to keep studying past week one. You're the one who asked for it.
- **Everyone, around week one:** the first achievements and level-ups.

## Iteration 1: XP, levels and a better streak (no server)

| Feature | What it is | Effort |
|---|---|---|
| **XP** | +10 for each card reviewed (once per card per day). +15 for each card written. +20 for finishing every due card. | Small |
| **XP on Done** | The Done screen counts up "+190 XP" line by line: reviews, cards written, bonus. Under reduced motion it just appears. | Small |
| **Levels as sushi ranks** | Levels with names, using the app's name: Rice → Tamago → Cucumber → Salmon → Tuna → Otoro → Master. Each rank has its own small drawn icon (SVG, never emoji). The XP needed rises gently, about 1.4× per level. | Medium (the drawings) |
| **Level bar on Today** | The Streak tile becomes a "You" tile: rank icon, level, an XP bar to the next rank, and the streak. | Small |
| **Streak moment** | Done says "13 days in a row" with this week's strip, and today's square fills in. (Planner's #1 from ADV-1.) | Small |
| **Streak rule** | Every calendar day you review at least one card counts, which is how it already works. No freezes (the user's decision, 2026-11-09). | None |

## Iteration 2: quests and achievements (no server)

| Feature | What it is | Effort |
|---|---|---|
| **Daily quest** | Three small tasks each day, picked from what you can actually do: "Review 10 cards", "Write 3 cards", "Finish everything due". Each one is worth bonus XP. If nothing is due, no quest asks you to review. No penalty for skipping. | Medium |
| **Achievements** | A collection on Progress, each with a drawn badge: first deck, 10/50/100/500 cards written, 7/30/100-day streak, 1,000 reviews, a test deck fully studied. Locked ones show as outlines, so you see what's next. | Medium |
| **Level-up moment** | A full-card moment on Done when you rank up: the new sushi icon drops in, with your new title. No tap needed: Back to home stays the one button (decided 2026-11-09, D80). It's the one place a bigger animation is allowed. | Small |
| **Weekly recap** | On Progress: "This week: 240 XP, 31 cards written, best day Wednesday." | Small |

## Iteration 3: leagues with everybody (needs a server)

**The user's decision (2026-11-09): "leagues with everybody".** Read as one league system for every Nigiri user, with no invite codes, so strangers who find the app join the same leagues as you. If the user meant something narrower, this section changes. This is the only part that needs other people's data.

| Feature | What it is | Effort |
|---|---|---|
| **Join** | A "Join the league" button on the League screen, so it's opt-in. You pick a nickname and you're in. No passwords and no email. Your phone gets a random player id that's kept with your data. | Medium |
| **Groups** | Everyone in the same tier is put in groups of up to 20 each Monday. With a handful of users, that's one group, which is everybody. As more people join, it splits automatically. | Medium |
| **Weekly table** | A League tab ranks your group by **this week's XP**. It resets on Monday, so anyone can win any week. | Medium |
| **Tiers** | Bronze → Silver → Gold → Diamond. Each week the top 3 in a group move up. Nobody moves down while groups are small, because falling a tier brings back the guilt the brief bans. Revisit once groups are full. | Small |
| **What leaves the phone** | Only the nickname, the player id and the week's XP total. Never cards, decks or what you got wrong. | Part of the server work |
| **Leave the league** | One row in Settings removes your nickname and score from the server. | Small |

**What "everybody" adds over friends-only:**
- **Nicknames from strangers:** a length limit (16 characters) and a blocked-words list on the Worker. There's no chat and no profile pages, so a nickname is the only thing anyone can post.
- **Fake scores:** the phone sends totals, and the Worker rejects anything impossible: more XP in a day than the most cards anyone could review, or more than 15 XP per card written. Someone determined could still cheat. With no accounts that can't be fully stopped, and for a study app with no prizes that's an accepted risk.
- **More load:** still tiny. One row per player and one update per session fit Cloudflare's free tier.

**How it would run:** on the Cloudflare Worker already planned for reminders (publishing.md, step 4), plus a small free Cloudflare database (D1) holding one row per player per week.

## Left out, and why

- **Lives or hearts** (lose one for a wrong answer): they teach people to lie about what they forgot, which breaks the scheduler.
- **XP for the rating you tap**, and **XP for speed:** the same reason.
- **Paid boosts, gems, a shop:** no money is involved, and nothing to buy.
- **An all-time leaderboard:** whoever started first would stay on top forever. Weekly groups give everyone a fresh chance.
- **Chat, profiles, following people:** they need moderation and accounts. The nickname is the only public thing.
- **Relegation (dropping a tier):** see Tiers above.

## Order and size

1. **Iteration 1:** about one build cycle. It makes every session feel rewarding.
2. **Iteration 2:** about one build cycle.
3. **Iteration 3:** the biggest. It comes after the Cloudflare account exists (you make it yourself), and ideally after friends have used iterations 1–2 for a week or two, so the XP numbers are tuned before people compete on them.

The drawings (the sushi rank icons and achievement badges) can be designed while iteration 1 is built. ui-designer owns them, using the frontend-design skill.

## Decisions for the user

1. **What a streak counts: decided 2026-11-09, "Every calendar day".** No freezes. A day off resets the streak to 0, and your best streak stays on Progress.
2. **Leagues: decided 2026-11-09, "leagues with everybody"** (see Iteration 3).
