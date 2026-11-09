// Dev-only fixtures for screenshots and manual checks. Never in the build: startup.ts imports this
// only under import.meta.env.DEV, and Vite drops that branch from production.
// Open the dev server with ?seed=NAME before the hash, for example
//   http://localhost:5173/nigiri/?seed=due#/
//   http://localhost:5173/nigiri/?seed=test-edit#/deck/hist/test
// Every seed wipes the database first, then writes real records through the real scheduler, with
// review times in the past, so counts and due times are genuine. The ?seed part is then removed.
// Decks have fixed ids (bio, hist, gatsby, chem, spanish, long, d1..d12) so screens open by address.
// ?theme=midnight (or snow, mist, cream) picks the theme the same way, for screenshots.
//
// Round 1 seeds (B4), with the address that shows each state:
//   ?seed=stages#/deck/bio      the deck bar: AP Bio with 4 solid, 5 learning, 3 new; Decks tab has bars
//   ?seed=allnew#/deck/chem     a deck whose cards are all new (the bar is all New)
//   ?seed=first2#/              first run with 1 deck and 2 cards: Getting started, You at level 1
//   ?seed=history#/             8 weeks of history: You tile with XP, rank and the 4-week calendar
//   ?seed=levelup#/review       5 cards due, and XP just under a level: Done shows XP and "Up to level N"
//   ?seed=zero-xp#/review       3 cards already reviewed today, due again: Done says "No new XP"
//   ?seed=format#/review        one due card with bold and a bulleted answer
//   ?seed=short#/review         one due card with a short answer (22px)
// Pass 2 seeds (R4):
//   ?seed=session3#/review      6 due across 3 decks, 4 due tomorrow: Done's "This session" and "Next: 4 cards tomorrow."
//   ?seed=sunday-streak#/review reviews yesterday, 3 due now: Done says "2 days in a row." with both days in the strip
//   ?seed=practice#/deck/bio    a 12-card deck, nothing due: "Practice all 12 cards" on the deck page
// Rank badges (B5, D79 to D81):
//   ?seed=rankup#/review        5 cards due, XP 1 to 60 under Tamago (900): Done shows the rank-up
//   ?seed=rankup-add#/deck/bio/add  225 XP (15 new cards): saving one card reaches Cucumber Roll on Add card
//   ?seed=ladder#/progress      XP partway through Salmon: the Ranks tile with 5 reached, 5 ahead
//   #/dev/badges                (no seed) every badge at 32, 56 and 120px, and locked
import { Rating } from 'ts-fsrs';
import type { Card, Deck, DeckColour, NigiriDb, Review, Test } from '../lib/db';
import { DEFAULT_SETTINGS } from '../lib/db';
import { DRAFT_KEY } from '../lib/draft';
import { newId } from '../lib/ids';
import { newCardFields, reviewCard, type Grade, type Scheduler } from '../lib/scheduler';
import { isTheme, saveTheme } from '../lib/theme';
import { RANK_STARTS, levelOf, xpOf, xpToReach } from '../lib/xp';
import { addDaysToKey, localDayKey, startOfLocalDayOffset } from '../lib/time';

const H = 3_600_000;
const D = 24 * H;

const BIO: [string, string][] = [
  ['What does the electron transport chain do?', "It passes electrons along the inner membrane of the mitochondria and pumps H+ out. That build-up powers ATP synthase, which makes most of the cell's ATP."],
  ['Osmosis', 'Water moving across a membrane toward the side with more dissolved stuff'],
  ['Where does glycolysis happen?', 'In the cytoplasm'],
  ['ATP synthase', 'The enzyme that makes ATP as H+ flows back through it'],
  ['Krebs cycle output per glucose', '2 ATP, 6 NADH, 2 FADH2, 4 CO2'],
  ['Mitochondrial matrix', 'The space inside the inner membrane, where the Krebs cycle runs'],
  ['Fermentation', 'Makes ATP without oxygen by recycling NAD+'],
  ['Chemiosmosis', 'Using an H+ gradient across a membrane to make ATP'],
  ['NADH', 'Carries electrons to the electron transport chain'],
  ['Final electron acceptor', 'Oxygen, which becomes water'],
  ['Substrate-level phosphorylation', 'Making ATP directly from a reaction, as in glycolysis'],
  ['Cristae', 'The folds of the inner membrane'],
];
const HIST: [string, string][] = [
  ['Missouri Compromise', 'Missouri joined as a slave state and Maine as a free one, 1820'],
  ['Monroe Doctrine', 'Europe stays out of the Americas, 1823'],
  ['Erie Canal', 'Linked the Great Lakes to New York City, 1825'],
  ['Indian Removal Act', '1830 law forcing tribes west of the Mississippi'],
  ['Nullification Crisis', 'South Carolina tried to cancel a federal tariff, 1832'],
  ['Trail of Tears', 'Forced removal of the Cherokee, 1838'],
  ['Seneca Falls', "First women's rights convention, 1848"],
  ['Manifest Destiny', 'The belief that the US should spread across the continent'],
  ['Corrupt Bargain', 'The 1824 deal that made John Quincy Adams president'],
  ['Spoils system', 'Giving government jobs to supporters'],
  ['Tariff of Abominations', 'The 1828 tariff the South hated'],
  ['Second Great Awakening', 'A wave of religious revival in the early 1800s'],
  ['Lowell mills', 'Textile factories that hired young women'],
  ['Cotton gin', "Whitney's machine that made cotton farming pay, 1793"],
  ['Market Revolution', 'The shift to buying and selling goods over long distances'],
  ['Whig Party', 'Formed against Andrew Jackson in the 1830s'],
  ['Bank War', "Jackson's fight to close the Second Bank of the United States"],
  ['Specie Circular', 'Land had to be bought with gold or silver, 1836'],
  ['Panic of 1837', 'A depression after the bank war and land speculation'],
  ['Texas annexation', 'Texas joined the US in 1845'],
  ['Mexican-American War', '1846 to 1848, ending with the Mexican Cession'],
  ['Wilmot Proviso', 'A failed plan to ban slavery in land won from Mexico'],
  ['Compromise of 1850', 'California free, a stronger Fugitive Slave Act'],
  ['Fugitive Slave Act', 'Made northerners help return people who escaped slavery'],
  ['Kansas-Nebraska Act', 'Let settlers vote on slavery, 1854'],
  ['Bleeding Kansas', 'Violence over whether Kansas would allow slavery'],
  ['Dred Scott decision', 'The 1857 ruling that enslaved people were not citizens'],
  ['Lincoln-Douglas debates', 'Illinois Senate debates over slavery, 1858'],
  ['John Brown', 'Led the raid on Harpers Ferry, 1859'],
  ['Free Soil Party', 'Opposed slavery spreading west'],
  ['Know-Nothings', 'A party against immigrants in the 1850s'],
  ['Gadsden Purchase', 'Land bought from Mexico for a southern railroad, 1853'],
  ['Oregon Trail', 'The overland route settlers took to the Pacific Northwest'],
  ['Gold Rush', 'The 1849 rush of settlers to California'],
  ['Underground Railroad', 'Routes and safe houses for people escaping slavery'],
];
const GATSBY: [string, string][] = [
  ['Supercilious', 'Behaving as if you are better than others'],
  ['Languid', 'Slow and relaxed, without energy'],
  ['Ostentatious', 'Showy, meant to impress'],
  ['Meretricious', 'Attractive on the surface but of little value'],
  ['Florid', 'Too elaborate; also red-faced'],
  ['Laconic', 'Using very few words'],
  ['Vacuous', 'Showing no thought or intelligence'],
  ['Elusive', 'Hard to catch or pin down'],
];

type Plan = { grade: Grade; ago: number }[];

class Writer {
  decks: Deck[] = [];
  cards: Card[] = [];
  reviews: Review[] = [];
  tests: Test[] = [];
  minutesPerDay = DEFAULT_SETTINGS.minutesPerDay;
  constructor(
    private s: Scheduler,
    readonly now: number,
  ) {}

  deck(id: string, name: string, colour: DeckColour, createdAgo: number): Deck {
    const deck = { id, name, colour, createdAt: new Date(this.now - createdAgo) };
    this.decks.push(deck);
    return deck;
  }

  /** A test `days` calendar days from today (0 = today). */
  test(deck: Deck, days: number) {
    this.tests.push({ deckId: deck.id, date: addDaysToKey(localDayKey(new Date(this.now)), days) });
  }

  /** A card made `createdAgo` ms ago, rated as planned (each `ago` is ms before now). */
  card(deck: Deck, [front, back]: [string, string], createdAgo: number, plan: Plan = []): Card {
    const id = newId();
    const createdAt = new Date(this.now - createdAgo);
    let card: Card = { ...newCardFields(this.s, id, createdAt), id, deckId: deck.id, front, back, createdAt };
    for (const { grade, ago } of plan) {
      const { card: sched, revlog } = reviewCard(this.s, card, grade, new Date(this.now - ago));
      this.reviews.push({ ...revlog, id: newId(), cardId: id, deckId: deck.id });
      card = { ...card, ...sched };
    }
    this.cards.push(card);
    return card;
  }

  /**
   * A Solid card (D74): Good `ago` ms ago, then Good again at the moment it came due, which gives a
   * gap of about 26 days (S2), so it's due well after now.
   */
  cardSolid(deck: Deck, text: [string, string], ago: number): Card {
    const first = this.card(deck, text, ago + D, [{ grade: Rating.Good, ago }]);
    const at = first.dueAt;
    const { card: sched, revlog } = reviewCard(this.s, first, Rating.Good, at);
    this.reviews.push({ ...revlog, id: newId(), cardId: first.id, deckId: deck.id });
    const solid = { ...first, ...sched };
    this.cards[this.cards.indexOf(first)] = solid;
    return solid;
  }

  xp() {
    return xpOf(this.cards, this.reviews).total;
  }

  /** A card rated Good once, timed so it comes due exactly `dueIn` ms from now. */
  cardDueIn(deck: Deck, text: [string, string], createdAgo: number, dueIn: number): Card {
    // Good on a new card always waits the same time (the first review has no history), so measure it.
    // (ts-fsrs refuses the epoch itself as a date, so the probe runs a month back.)
    const t0 = new Date(this.now - 30 * D);
    const probe = newCardFields(this.s, 'probe', t0);
    const wait = reviewCard(this.s, probe, Rating.Good, t0).card.dueAt.getTime() - t0.getTime();
    return this.card(deck, text, createdAgo, [{ grade: Rating.Good, ago: wait - dueIn }]);
  }

  async write(db: NigiriDb) {
    await db.transaction('rw', [db.decks, db.cards, db.reviews, db.tests, db.settings], async () => {
      await Promise.all([db.decks.clear(), db.cards.clear(), db.reviews.clear(), db.tests.clear(), db.settings.clear()]);
      await db.settings.add({ ...DEFAULT_SETTINGS, minutesPerDay: this.minutesPerDay });
      await db.decks.bulkAdd(this.decks);
      await db.cards.bulkAdd(this.cards);
      await db.reviews.bulkAdd(this.reviews);
      await db.tests.bulkAdd(this.tests);
    });
  }
}

const good = (ago: number): Plan => [{ grade: Rating.Good, ago }];
const easy = (ago: number): Plan => [{ grade: Rating.Easy, ago }];

/** Three decks, 18 cards due: "Review 18 cards", "About 6 minutes." (mockups/home.html). */
function threeDecks(w: Writer, mode: 'due' | 'clear') {
  const bio = w.deck('bio', 'AP Bio unit 4', 'green', 20 * D);
  const hist = w.deck('hist', 'US History unit 2', 'purple', 14 * D);
  const gatsby = w.deck('gatsby', 'Gatsby vocab', 'orange', 3 * D);
  // Good on a new card waits about 4.78 days, so a Good 5 days ago is due now; a Good 1 day ago isn't.
  const dueAgo = mode === 'clear' ? 1 * D : 5 * D;
  BIO.forEach((c, i) => {
    if (i < 6) w.card(bio, c, 19 * D, good(dueAgo));
    else if (i < 10 || mode === 'clear') w.card(bio, c, 19 * D, good(1 * D));
    else w.card(bio, c, 19 * D - i * 1000); // new
  });
  HIST.slice(0, 10).forEach((c, i) => {
    if (i < 4) w.card(hist, c, 13 * D, good(dueAgo));
    else if (i < 8) w.card(hist, c, 13 * D, good(mode === 'clear' ? 1 * D : 2 * D));
    else if (mode === 'clear') w.card(hist, c, 13 * D, good(1 * D));
    else w.card(hist, c, 13 * D - i * 1000);
  });
  GATSBY.forEach((c, i) => {
    if (i < 4 && mode !== 'clear') w.card(gatsby, c, 3 * D - i * 1000);
    else w.card(gatsby, c, 3 * D - i * 1000, good(1 * D));
  });
  return { bio, hist, gatsby };
}

/** US History with all 35 cards: `studied` of them reviewed (6 of those due now), the rest new. */
function histDeck(w: Writer, studied: number) {
  const hist = w.deck('hist', 'US History unit 2', 'purple', 14 * D);
  HIST.forEach((c, i) => {
    if (i >= studied) w.card(hist, c, 13 * D - i * 1000);
    else w.card(hist, c, 13 * D - i * 1000, good(i < 6 ? 5 * D : 1 * D));
  });
  return hist;
}

/** AP Bio with 12 cards: `studied` reviewed (none due), the rest new. */
function bioDeck(w: Writer, studied: number) {
  const bio = w.deck('bio', 'AP Bio unit 4', 'green', 20 * D);
  BIO.forEach((c, i) => {
    if (i >= studied) w.card(bio, c, 19 * D - i * 1000);
    else w.card(bio, c, 19 * D - i * 1000, good(1 * D));
  });
  return bio;
}

function gatsbyDeck(w: Writer) {
  const gatsby = w.deck('gatsby', 'Gatsby vocab', 'orange', 3 * D);
  GATSBY.forEach((c, i) => w.card(gatsby, c, 3 * D - i * 1000, i < 4 ? good(5 * D) : good(1 * D)));
  return gatsby;
}

const LONG_NAME = 'Advanced Placement United States History unit 2 review set A';
const DECK_NAMES: [string, DeckColour][] = [
  ['Chem unit 1', 'yellow'],
  ['Chem unit 2', 'yellow'],
  ['Spanish verbs', 'blue'],
  ['Spanish food words', 'blue'],
  ['Geometry proofs', 'pink'],
  ['Physics formulas', 'green'],
  ['Gatsby vocab', 'orange'],
  ['World capitals', 'purple'],
  ['AP Bio unit 4', 'green'],
  ['US History unit 2', 'purple'],
  ['French irregulars', 'pink'],
  ['Music theory terms', 'orange'],
];

/** Dev only: ?theme=midnight (or snow, mist, cream) picks a theme for screenshots, as Settings would. */
export function themeFromUrl(): void {
  const url = new URL(location.href);
  const theme = url.searchParams.get('theme');
  if (!theme) return;
  if (isTheme(theme)) saveTheme(theme);
  url.searchParams.delete('theme');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export async function seedFromUrl(db: NigiriDb, s: Scheduler): Promise<void> {
  const url = new URL(location.href);
  const name = url.searchParams.get('seed');
  if (!name) return;
  const now = Date.now();
  const w = new Writer(s, now);
  switch (name) {
    case 'empty':
      break;
    case 'nocards':
      w.deck('chem', 'Chem unit 3', 'yellow', 2 * H);
      break;
    case 'due':
    case 'clear':
      threeDecks(w, name);
      break;
    case 'clear-later':
    case 'clear-tomorrow': {
      // Nothing due; the next card comes due later today (in an hour, or before 23:30), or tomorrow at 10:00.
      const { hist } = threeDecks(w, 'clear');
      const endOfToday = startOfLocalDayOffset(new Date(now), 1).getTime() - 30 * 60_000;
      const dueIn = name === 'clear-later' ? Math.max(5 * 60_000, Math.min(H, endOfToday - now)) : startOfLocalDayOffset(new Date(now), 1).getTime() + 10 * H - now;
      w.cardDueIn(hist, HIST[12], 13 * D, dueIn);
      break;
    }
    case 'back': {
      // Welcome back: the last review 6 days ago, 47 cards due (47 × 20 s, about 16 minutes).
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 30 * D);
      const hist = w.deck('hist', 'US History unit 2', 'purple', 30 * D);
      const gatsby = w.deck('gatsby', 'Gatsby vocab', 'orange', 30 * D);
      BIO.forEach((c) => w.card(bio, c, 29 * D, good(8 * D)));
      HIST.forEach((c) => w.card(hist, c, 29 * D, good(8 * D)));
      GATSBY.forEach((c) => w.card(gatsby, c, 29 * D, easy(6 * D)));
      break;
    }
    case 'one': {
      // One new card, for the review, Again and waiting states.
      const deck = w.deck('bio', 'AP Bio unit 4', 'green', 2 * D);
      w.card(deck, BIO[0], 1 * D);
      break;
    }
    case 'long': {
      // A 60-character name in Tests and Decks, and a long card.
      const deck = w.deck('long', LONG_NAME, 'blue', 2 * D);
      w.card(deck, ['Explain how the Missouri Compromise, the Nullification Crisis and the Indian Removal Act each tested the balance of power between the states and the federal government in the years before 1840.', 'Each one pitted a state or a region against federal power: Missouri over slavery in new states, South Carolina over a tariff, Georgia over Cherokee land. Supercalifragilisticexpialidociouslylongwordwithoutspaces.'], 1 * D);
      HIST.slice(10, 20).forEach((c, i) => w.card(deck, c, 1 * D - i * 1000));
      w.test(deck, 9);
      threeDecks(w, 'due');
      break;
    }
    case 'test1': {
      // One test: US History in 3 days, 30 of 35 studied.
      bioDeck(w, 12);
      const hist = histDeck(w, 30);
      gatsbyDeck(w);
      w.test(hist, 3);
      break;
    }
    case 'tests3': {
      // Three tests, one today, needing more than 120 minutes a day in all (4 + 134 + 4 = 142).
      const bio = bioDeck(w, 6);
      const hist = histDeck(w, 30);
      const spanish = w.deck('spanish', 'Spanish verbs', 'blue', 5 * D);
      for (let i = 0; i < 400; i++) w.card(spanish, [`Verb ${i + 1}`, `Meaning ${i + 1}`], 4 * D - i * 1000);
      gatsbyDeck(w);
      w.test(bio, 0);
      w.test(spanish, 1);
      w.test(hist, 3);
      w.minutesPerDay = 60;
      break;
    }
    case 'decks12': {
      DECK_NAMES.forEach(([deckName, colour], i) => {
        const deck = w.deck(`d${i + 1}`, deckName, colour, (30 - i) * D);
        for (let j = 0; j < 3 + (i % 4); j++) w.card(deck, [`${deckName} card ${j + 1}`, 'Answer'], (29 - i) * D, j < i % 3 ? good(5 * D) : good(1 * D));
      });
      break;
    }
    case 'history': {
      // About 8 weeks of real reviews for the streak, the calendar and the bars (D67): a 12-day streak
      // through yesterday (nothing yet today), a best of 20 days before a gap, and scattered older days,
      // light to heavy (1 to 35 cards a day). Plus the 18 due cards of ?seed=due.
      threeDecks(w, 'due');
      const spanish = w.deck('spanish', 'Spanish verbs', 'blue', 60 * D);
      const verbs: [string, string][] = Array.from({ length: 60 }, (_, i) => [`Verb ${i + 1}`, `Meaning ${i + 1}`]);
      const plans: Plan[] = verbs.map(() => []);
      const studyDays = [53, 50, 47, 46, 45, 40, 37, 36, ...Array.from({ length: 20 }, (_, i) => 33 - i), ...Array.from({ length: 12 }, (_, i) => 12 - i)];
      const sizes = [3, 8, 14, 35, 6, 22, 1, 12, 30, 9, 4, 18];
      let next = 0;
      studyDays.forEach((daysAgo, n) => {
        const dayStart = startOfLocalDayOffset(new Date(now), -daysAgo).getTime() + 16 * H;
        const k = sizes[n % sizes.length];
        for (let j = 0; j < k; j++) {
          const i = next++ % verbs.length;
          plans[i].push({ grade: (n + j) % 7 === 0 ? Rating.Again : Rating.Good, ago: now - (dayStart + j * 60_000) });
        }
      });
      verbs.forEach((v, i) => w.card(spanish, v, 60 * D - i * 1000, plans[i]));
      break;
    }
    case 'long-card': {
      // One due card with a long question and a 600-character answer, for the card that scrolls inside.
      const deck = w.deck('long', LONG_NAME, 'pink', 2 * D);
      const answer =
        "Each one pitted a state or a region against federal power. In 1820 the Missouri Compromise let Missouri in as a slave state and Maine as a free one, and drew a line across the Louisiana Purchase. In 1832 South Carolina declared the federal tariff void inside its borders; Jackson answered with the Force Bill and Clay brokered a lower tariff. In 1830 the Indian Removal Act, and Georgia's claims over Cherokee land, ended in the Trail of Tears, even after the Supreme Court sided with the Cherokee in Worcester v. Georgia. Together they show the balance tipping back and forth, decades before secession.";
      w.card(deck, ['Explain how the Missouri Compromise, the Nullification Crisis and the Indian Removal Act each tested the balance of power between the states and the federal government in the years before 1840.', answer.slice(0, 600)], 1 * D);
      HIST.slice(0, 4).forEach((c, i) => w.card(deck, c, 1 * D - (i + 1) * 1000));
      break;
    }
    case 'test-add':
      threeDecks(w, 'due');
      break;
    case 'test-some':
    case 'test-edit':
    case 'test-nofit': {
      // US History: test in 3 days, 30 of 35 studied. AP Bio: test in 2 days, which adds to the fit.
      const bio = bioDeck(w, 8);
      const hist = histDeck(w, 30);
      gatsbyDeck(w);
      w.test(hist, 3);
      if (name !== 'test-some') w.test(bio, 2);
      if (name === 'test-nofit') w.minutesPerDay = 5; // needs 6 a day in all, so it doesn't fit
      break;
    }
    case 'test-all': {
      bioDeck(w, 12);
      const hist = histDeck(w, 35);
      w.test(hist, 3);
      break;
    }
    case 'test-today': {
      bioDeck(w, 12);
      const hist = histDeck(w, 30);
      w.test(hist, 0);
      break;
    }
    case 'test-far': {
      bioDeck(w, 12);
      const hist = histDeck(w, 30);
      w.test(hist, 13);
      break;
    }
    case 'test-over': {
      // 400 cards and the test tomorrow: about 134 minutes a day, more than the 120 you can set.
      const spanish = w.deck('spanish', 'Spanish verbs', 'blue', 5 * D);
      for (let i = 0; i < 400; i++) w.card(spanish, [`Verb ${i + 1}`, `Meaning ${i + 1}`], 4 * D - i * 1000);
      w.test(spanish, 1);
      w.minutesPerDay = 120;
      break;
    }
    case 'stages': {
      // AP Bio: 4 solid, 5 learning (Good a day ago), 3 new; US History and Gatsby as in ?seed=test1.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 40 * D);
      BIO.forEach((c, i) => {
        if (i < 4) w.cardSolid(bio, c, 30 * D);
        else if (i < 9) w.card(bio, c, 19 * D, good(1 * D));
        else w.card(bio, c, 19 * D - i * 1000);
      });
      histDeck(w, 30);
      gatsbyDeck(w);
      break;
    }
    case 'allnew': {
      const chem = w.deck('chem', 'Chem unit 3', 'yellow', 2 * D);
      ['Mole', 'Avogadro number', 'Molar mass', 'Limiting reagent', 'Percent yield', 'Empirical formula'].forEach((f, i) =>
        w.card(chem, [f, 'Answer'], 1 * D - i * 1000),
      );
      break;
    }
    case 'first2': {
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 2 * H);
      w.card(bio, BIO[2], 1 * H);
      w.card(bio, BIO[1], 1 * H - 1000);
      break;
    }
    case 'levelup': {
      // 5 cards due now (Good 5 days ago) and XP that this session's 5 × 10 + 20 takes over a level:
      // filler cards (Good 1 day ago, 25 XP each) bring it to between 1 and 60 XP under the next level.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 40 * D);
      BIO.forEach((c, i) => {
        if (i < 4) w.cardSolid(bio, c, 30 * D);
        else if (i < 9) w.card(bio, c, 19 * D, good(5 * D));
        else w.card(bio, c, 19 * D, good(1 * D));
      });
      const spanish = w.deck('spanish', 'Spanish verbs', 'blue', 10 * D);
      for (let i = 0; i < 400; i++) {
        const xp = w.xp();
        const left = xpToReach(levelOf(xp).level + 1) - xp;
        if (left >= 1 && left <= 60) break;
        w.card(spanish, [`Verb ${i + 1}`, `Meaning ${i + 1}`], 9 * D - i * 1000, good(1 * D + i * 1000));
      }
      break;
    }
    case 'rankup': {
      // As ?seed=levelup, but the fillers stop 1 to 60 XP under the next rank's start (Tamago at 900 from
      // here), so this session's 5 × 10 + 20 crosses it and Done shows the rank-up.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 40 * D);
      BIO.forEach((c, i) => {
        if (i < 4) w.cardSolid(bio, c, 30 * D);
        else if (i < 9) w.card(bio, c, 19 * D, good(5 * D));
        else w.card(bio, c, 19 * D, good(1 * D));
      });
      const spanish = w.deck('spanish', 'Spanish verbs', 'blue', 10 * D);
      for (let i = 0; i < 400; i++) {
        const xp = w.xp();
        const nextStart = RANK_STARTS.map(xpToReach).find((t) => t > xp) ?? Infinity;
        if (nextStart - xp >= 1 && nextStart - xp <= 60) break;
        w.card(spanish, [`Verb ${i + 1}`, `Meaning ${i + 1}`], 9 * D - i * 1000, good(1 * D + i * 1000));
      }
      break;
    }
    case 'rankup-add': {
      // 15 new cards, 225 XP (15 each): one more card on Add card makes 240, Cucumber Roll's start.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 2 * D);
      for (let i = 0; i < 15; i++) w.card(bio, i < BIO.length ? BIO[i] : [`Term ${i + 1}`, `Meaning ${i + 1}`], 1 * D - i * 1000);
      break;
    }
    case 'ladder': {
      // The ?seed=due decks plus Spanish fillers (25 XP each) until XP is partway through Salmon (3,300
      // to 5,699): about 3,700.
      threeDecks(w, 'due');
      const spanish = w.deck('spanish', 'Spanish verbs', 'blue', 30 * D);
      for (let i = 0; i < 400 && w.xp() < 3700; i++) w.card(spanish, [`Verb ${i + 1}`, `Meaning ${i + 1}`], 29 * D - i * 1000, good(2 * D + i * 1000));
      break;
    }
    case 'zero-xp': {
      // Three cards rated Again earlier today (so they're due again): reviewing them adds no XP.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 2 * D);
      const sinceMidnight = now - startOfLocalDayOffset(new Date(now), 0).getTime();
      const ago = Math.max(3 * 60_000, Math.min(20 * 60_000, sinceMidnight - 60_000));
      BIO.slice(0, 3).forEach((c, i) => w.card(bio, c, 1 * D, [{ grade: Rating.Again, ago: ago - i * 1000 }]));
      break;
    }
    case 'format': {
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 2 * D);
      w.card(bio, ['What does the **Krebs cycle** make per glucose?', 'In the **mitochondrial matrix**, it makes:\n- 2 ATP\n- 6 NADH\n- 2 FADH2\n- 4 CO2, which you breathe out'], 1 * D);
      break;
    }
    case 'short': {
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 2 * D);
      w.card(bio, BIO[2], 1 * D);
      break;
    }
    case 'session3': {
      // Pass 2 R3: 6 cards due now across three decks (AP Bio 3, US History 2, Gatsby 1), and 4 more
      // that come due tomorrow at 10:00. After the session, Done lists the three decks and says
      // "Next: 4 cards tomorrow." (each Good here waits days, so tomorrow's 4 come first).
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 20 * D);
      const hist = w.deck('hist', 'US History unit 2', 'purple', 14 * D);
      const gatsby = w.deck('gatsby', 'Gatsby vocab', 'orange', 3 * D);
      const tomorrow10 = startOfLocalDayOffset(new Date(now), 1).getTime() + 10 * H - now;
      BIO.slice(0, 3).forEach((c) => w.card(bio, c, 19 * D, good(5 * D)));
      HIST.slice(0, 2).forEach((c) => w.card(hist, c, 13 * D, good(5 * D)));
      w.card(gatsby, GATSBY[0], 3 * D, good(5 * D));
      BIO.slice(3, 5).forEach((c) => w.cardDueIn(bio, c, 19 * D, tomorrow10));
      w.cardDueIn(hist, HIST[2], 13 * D, tomorrow10);
      w.cardDueIn(gatsby, GATSBY[1], 3 * D, tomorrow10);
      break;
    }
    case 'sunday-streak': {
      // Pass 2 R2: reviews yesterday (Sunday when today is Monday) and 3 cards due now. After the session
      // Done says "2 days in a row." and its strip shows yesterday and today, today last.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 20 * D);
      const yesterday16 = now - (startOfLocalDayOffset(new Date(now), -1).getTime() + 16 * H);
      BIO.slice(0, 3).forEach((c) => w.card(bio, c, 19 * D, good(5 * D)));
      BIO.slice(3, 7).forEach((c, i) => w.card(bio, c, 19 * D, good(yesterday16 - i * 60_000)));
      break;
    }
    case 'practice': {
      // D77: a practice-ready deck. AP Bio with 12 cards (4 solid, 5 learning, 3 new, one with bold and
      // a list) and nothing due, so the deck page shows "Practice all 12 cards" under the test row.
      const bio = w.deck('bio', 'AP Bio unit 4', 'green', 40 * D);
      BIO.forEach((c, i) => {
        const text: [string, string] = i === 0 ? ['What does the **Krebs cycle** make per glucose?', 'In the **mitochondrial matrix**:\n- 2 ATP\n- 6 NADH\n- 2 FADH2'] : c;
        if (i < 4) w.cardSolid(bio, text, 30 * D);
        else if (i < 9) w.card(bio, text, 19 * D, good(1 * D));
        else w.card(bio, text, 19 * D - i * 1000);
      });
      gatsbyDeck(w);
      break;
    }
    case 'milestone': {
      // AP Bio: 11 of 12 studied (none due), 1 new, the test in 2 days, so the last card is due today.
      const bio = bioDeck(w, 11);
      w.test(bio, 2);
      break;
    }
    default:
      return;
  }
  await w.write(db);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // no draft to clear
  }
  url.searchParams.delete('seed');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}
