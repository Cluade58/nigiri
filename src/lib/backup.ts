// Export, check and restore (spec §3, §4; D12, D54). The UI arrives in build pass B2.
// The file names the app, a format number and its scheduler; dates become ISO text.
// Restore checks every record and date before touching anything, then replaces all five stores in
// one transaction. The theme and the draft live outside the database, so Restore never touches them.
import {
  DECK_COLOURS,
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  getSettings,
  type Card,
  type Deck,
  type NigiriDb,
  type Review,
  type Settings,
  type Test,
} from './db';
import { SCHEDULER_STAMP } from './scheduler';
import { MAX_MINUTES_PER_DAY, MIN_MINUTES_PER_DAY } from './testMode';
import { isDayKey, localDayKey } from './time';

export const BACKUP_APP = 'nigiri';
export const BACKUP_FORMAT = 1;

export interface BackupData {
  decks: Deck[];
  cards: Card[];
  reviews: Review[];
  tests: Test[];
  settings: Settings;
}

/** D60: nigiri-backup-YYYY-MM-DD.json, by the local date. */
export function backupFileName(now: Date): string {
  return `nigiri-backup-${localDayKey(now)}.json`;
}

/** Reads everything in one transaction, so the file is one consistent moment. */
export async function readAll(db: NigiriDb): Promise<BackupData> {
  return db.transaction('r', [db.decks, db.cards, db.reviews, db.tests, db.settings], async () => {
    const [decks, cards, reviews, tests, settings] = await Promise.all([
      db.decks.toArray(),
      db.cards.toArray(),
      db.reviews.toArray(),
      db.tests.toArray(),
      getSettings(db),
    ]);
    return { decks, cards, reviews, tests, settings };
  });
}

/** The export file as an object (dates still Dates; JSON.stringify writes them as ISO text). */
export async function exportBackup(db: NigiriDb, now: Date) {
  const data = await readAll(db);
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now,
    scheduler: { ...SCHEDULER_STAMP },
    decks: data.decks,
    cards: data.cards,
    reviews: data.reviews,
    tests: data.tests,
    settings: { minutesPerDay: data.settings.minutesPerDay, lastWhatsNewSeen: data.settings.lastWhatsNewSeen },
  };
}

export async function exportBackupText(db: NigiriDb, now: Date): Promise<string> {
  return JSON.stringify(await exportBackup(db, now), null, 2);
}

export type CheckResult = { ok: true; data: BackupData } | { ok: false; message: string; detail: string };

class Reject extends Error {
  constructor(
    readonly plain: string,
    readonly detail: string,
  ) {
    super(plain);
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function str(o: Obj, key: string, what: string): string {
  const v = o[key];
  if (typeof v !== 'string') throw new Reject(`${what} is missing some of its text.`, `${key} is not text`);
  return v;
}

function id(o: Obj, key: string, what: string): string {
  const v = str(o, key, what);
  if (!v) throw new Reject(`${what} is missing its name tag.`, `${key} is empty`);
  return v;
}

function date(o: Obj, key: string, what: string): Date {
  const v = o[key];
  if (typeof v !== 'string' || !ISO.test(v)) throw new Reject(`${what} has a date that isn't a real date.`, `${key}: ${String(v)}`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19) !== v.slice(0, 19)) {
    throw new Reject(`${what} has a date that isn't a real date.`, `${key}: ${v}`);
  }
  return d;
}

function dateOrNull(o: Obj, key: string, what: string): Date | null {
  return o[key] === null ? null : date(o, key, what);
}

function num(o: Obj, key: string, what: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Reject(`${what} has a number that can't be read.`, `${key}: ${String(v)}`);
  return v;
}

function int(o: Obj, key: string, what: string, min: number, max: number): number {
  const v = num(o, key, what);
  if (!Number.isInteger(v) || v < min || v > max) throw new Reject(`${what} has a number that can't be read.`, `${key}: ${v}`);
  return v;
}

function oneOf<T extends string>(o: Obj, key: string, what: string, allowed: readonly T[]): T {
  const v = o[key];
  if (typeof v !== 'string' || !allowed.includes(v as T)) throw new Reject(`${what} has a setting Nigiri doesn't know.`, `${key}: ${String(v)}`);
  return v as T;
}

function cardIdField(o: Obj, what: string): string {
  const v = o.cardId;
  if (typeof v === 'string' && v) return v;
  throw new Reject(`${what} is missing its name tag.`, `cardId: ${String(v)}`);
}

function list(file: Obj, key: string, plain: string): Obj[] {
  const v = file[key];
  if (!Array.isArray(v)) throw new Reject(`This backup is missing its ${plain}.`, `${key} is not a list`);
  return v.map((item, i) => {
    if (!isObj(item)) throw new Reject(`This backup has a broken record in its ${plain}.`, `${key}[${i}]`);
    return item;
  });
}

const SCHEDULE_STATUSES = ['new', 'learning', 'review'] as const;

function parseDeck(o: Obj): Deck {
  const what = 'A deck';
  return { id: id(o, 'id', what), name: str(o, 'name', what), colour: oneOf(o, 'colour', what, DECK_COLOURS), createdAt: date(o, 'createdAt', what) };
}

function parseCard(o: Obj): Card {
  const what = 'A card';
  return {
    id: id(o, 'id', what),
    deckId: id(o, 'deckId', what),
    front: str(o, 'front', what),
    back: str(o, 'back', what),
    createdAt: date(o, 'createdAt', what),
    stability: num(o, 'stability', what),
    stabilityFast: num(o, 'stabilityFast', what),
    difficulty: num(o, 'difficulty', what),
    dueAt: date(o, 'dueAt', what),
    lastReviewAt: dateOrNull(o, 'lastReviewAt', what),
    state: int(o, 'state', what, 0, 3),
    scheduleStatus: oneOf(o, 'scheduleStatus', what, SCHEDULE_STATUSES),
    cardId: cardIdField(o, what),
    reps: int(o, 'reps', what, 0, Number.MAX_SAFE_INTEGER),
    lapses: int(o, 'lapses', what, 0, Number.MAX_SAFE_INTEGER),
    scheduledDays: num(o, 'scheduledDays', what),
    learningStep: int(o, 'learningStep', what, 0, Number.MAX_SAFE_INTEGER),
  } as Card;
}

function parseReview(o: Obj): Review {
  const what = 'A review';
  const rating = o.rating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 4) {
    throw new Reject("A review has a rating Nigiri doesn't know.", `rating: ${String(rating)}`);
  }
  return {
    id: id(o, 'id', what),
    cardId: cardIdField(o, what),
    deckId: id(o, 'deckId', what),
    rating,
    reviewTime: date(o, 'reviewTime', what),
    stability: num(o, 'stability', what),
    stabilityFast: num(o, 'stabilityFast', what),
    difficulty: num(o, 'difficulty', what),
    dueAt: date(o, 'dueAt', what),
    lastReviewAt: dateOrNull(o, 'lastReviewAt', what),
    state: int(o, 'state', what, 0, 3),
    scheduleStatus: oneOf(o, 'scheduleStatus', what, SCHEDULE_STATUSES),
    scheduledDays: num(o, 'scheduledDays', what),
    learningStep: int(o, 'learningStep', what, 0, Number.MAX_SAFE_INTEGER),
  } as Review;
}

function parseTest(o: Obj): Test {
  const deckId = id(o, 'deckId', 'A test');
  const d = o.date;
  if (!isDayKey(d)) throw new Reject(`A test date isn't a real day (${String(d)}).`, `test date: ${String(d)}`);
  return { deckId, date: d };
}

function parseSettings(v: unknown): Settings {
  if (!isObj(v)) throw new Reject('This backup is missing its settings.', 'settings is not an object');
  const minutesPerDay = int(v, 'minutesPerDay', 'The minutes-a-day setting', MIN_MINUTES_PER_DAY, MAX_MINUTES_PER_DAY);
  const w = v.lastWhatsNewSeen;
  if (w !== null && typeof w !== 'string') throw new Reject('This backup has a setting Nigiri doesn\'t know.', 'lastWhatsNewSeen');
  return { id: SETTINGS_ID, minutesPerDay, lastWhatsNewSeen: w };
}

function unique(items: { key: string }[], plain: string): void {
  const seen = new Set<string>();
  for (const { key } of items) {
    if (seen.has(key)) throw new Reject(`This backup lists the same ${plain} twice.`, `duplicate ${plain}: ${key}`);
    seen.add(key);
  }
}

/** Checks a backup file's text. Nothing is written. Every rejection says what was wrong in plain words. */
export function checkBackup(text: string): CheckResult {
  try {
    let file: unknown;
    try {
      file = JSON.parse(text);
    } catch {
      throw new Reject("This file isn't a Nigiri backup.", 'not JSON');
    }
    if (!isObj(file) || file.app !== BACKUP_APP) throw new Reject("This file isn't a Nigiri backup.", `app: ${isObj(file) ? String(file.app) : typeof file}`);
    if (file.format !== BACKUP_FORMAT) {
      throw new Reject(`This backup was made by a different version of Nigiri (format ${String(file.format)}), so it can't be restored here.`, `format: ${String(file.format)}`);
    }
    const sched = file.scheduler;
    if (!isObj(sched) || sched.model !== SCHEDULER_STAMP.model || sched.package !== SCHEDULER_STAMP.package) {
      throw new Reject("This backup was made with a different way of scheduling cards, so it can't be restored here.", `scheduler: ${JSON.stringify(sched)}`);
    }
    if (typeof file.exportedAt !== 'string' || Number.isNaN(new Date(file.exportedAt).getTime())) {
      throw new Reject("This backup has a date that isn't a real date.", 'exportedAt');
    }
    const decks = list(file, 'decks', 'decks').map(parseDeck);
    const cards = list(file, 'cards', 'cards').map(parseCard);
    const reviews = list(file, 'reviews', 'reviews').map(parseReview);
    const tests = list(file, 'tests', 'tests').map(parseTest);
    const settings = parseSettings(file.settings);

    unique(decks.map((d) => ({ key: d.id })), 'deck');
    unique(cards.map((c) => ({ key: c.id })), 'card');
    unique(reviews.map((r) => ({ key: r.id })), 'review');
    unique(tests.map((t) => ({ key: t.deckId })), 'test');

    const deckIds = new Set(decks.map((d) => d.id));
    const cardIds = new Set(cards.map((c) => c.id));
    for (const c of cards) if (!deckIds.has(c.deckId)) throw new Reject("A card belongs to a deck that isn't in this backup.", `card ${c.id} → deck ${c.deckId}`);
    for (const r of reviews) {
      if (!cardIds.has(r.cardId)) throw new Reject("A review belongs to a card that isn't in this backup.", `review ${r.id} → card ${r.cardId}`);
      if (!deckIds.has(r.deckId)) throw new Reject("A review belongs to a deck that isn't in this backup.", `review ${r.id} → deck ${r.deckId}`);
    }
    for (const t of tests) if (!deckIds.has(t.deckId)) throw new Reject("A test belongs to a deck that isn't in this backup.", `test → deck ${t.deckId}`);

    return { ok: true, data: { decks, cards, reviews, tests, settings } };
  } catch (e) {
    if (e instanceof Reject) return { ok: false, message: e.plain, detail: e.detail };
    return { ok: false, message: "This file isn't a Nigiri backup.", detail: String(e) };
  }
}

/** Replaces all five stores in one transaction. Call only with data from a passing checkBackup. */
export async function replaceAll(db: NigiriDb, data: BackupData): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards, db.reviews, db.tests, db.settings], async () => {
    await Promise.all([db.decks.clear(), db.cards.clear(), db.reviews.clear(), db.tests.clear(), db.settings.clear()]);
    await db.decks.bulkAdd(data.decks);
    await db.cards.bulkAdd(data.cards);
    await db.reviews.bulkAdd(data.reviews);
    await db.tests.bulkAdd(data.tests);
    await db.settings.add({ ...DEFAULT_SETTINGS, ...data.settings, id: SETTINGS_ID });
  });
}

/**
 * Settings' line for a file that didn't pass the check (QA-1 F1): what was wrong, that nothing
 * changed, and the next tap. A reason that already says "so it can't be restored here" loses that
 * part, since the line starts with "Not restored."
 */
export function restoreRejectLine(message: string): string {
  if (message === "This file isn't a Nigiri backup.") {
    return "Not restored. That file isn't a Nigiri backup, so nothing changed. Tap Restore a backup to pick another.";
  }
  const reason = message.replace(/, so it can't be restored here\.$/, '').replace(/\.$/, '');
  return `Not restored. ${reason}, so nothing changed. Tap Restore a backup to pick another.`;
}

/** Check, then restore. If the check fails, nothing changes and the result says what was wrong. */
export async function restoreBackup(db: NigiriDb, text: string): Promise<CheckResult> {
  const checked = checkBackup(text);
  if (checked.ok) await replaceAll(db, checked.data);
  return checked;
}
