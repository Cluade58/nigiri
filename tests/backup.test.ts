// Backup logic (D12, D54): export, check, restore. The Settings screen for it is build pass B2.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import type { NigiriDb } from '../src/lib/db';
import { BACKUP_FORMAT, backupFileName, checkBackup, exportBackup, exportBackupText, readAll, restoreBackup, restoreRejectLine } from '../src/lib/backup';
import { DRAFT_KEY } from '../src/lib/draft';
import { addCard, createDeck, saveRating, saveTest, snapshotOf } from '../src/lib/saves';
import { THEME_KEY } from '../src/lib/theme';
import { MIN, SEC, T0, at, freshDb, scheduler } from './helpers';

let db: NigiriDb;

async function fill(d: NigiriDb) {
  const s = await scheduler();
  const bio = await createDeck(d, { name: 'Biology', colour: 'green' }, T0);
  const hist = await createDeck(d, { name: 'US History unit 2', colour: 'purple' }, at(SEC));
  const a = (await addCard(d, s, { deckId: bio.id, front: 'Osmosis', back: 'Water through a membrane' }, at(2 * SEC))).card;
  const b = (await addCard(d, s, { deckId: hist.id, front: 'Erie Canal', back: '1825' }, at(3 * SEC))).card;
  await saveRating(d, s, snapshotOf(a), Rating.Again, at(4 * SEC));
  const a2 = (await d.cards.get(a.id))!;
  await saveRating(d, s, snapshotOf(a2), Rating.Good, at(2 * MIN));
  await saveRating(d, s, snapshotOf(b), Rating.Easy, at(5 * SEC));
  await saveTest(d, hist.id, '2026-11-20');
  await d.settings.update('settings', { minutesPerDay: 25 });
}

/** A small localStorage for Node, to show Restore leaves the theme and draft alone. */
function fakeLocalStorage() {
  const m = new Map<string, string>();
  const ls = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
  (globalThis as { localStorage?: unknown }).localStorage = ls;
  return ls;
}

beforeEach(async () => {
  db = await freshDb();
});
afterEach(() => {
  db.close();
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('export', () => {
  it('names the app, the format and the scheduler, with every store and dates as ISO text', async () => {
    await fill(db);
    const file = JSON.parse(await exportBackupText(db, at(10 * MIN)));
    expect(file.app).toBe('nigiri');
    expect(file.format).toBe(1);
    expect(file.exportedAt).toBe(at(10 * MIN).toISOString());
    expect(file.scheduler).toEqual({ package: 'ts-fsrs', version: '6.0.0', model: 'FSRS-7' });
    expect(file.decks).toHaveLength(2);
    expect(file.cards).toHaveLength(2);
    expect(file.reviews).toHaveLength(3);
    expect(file.tests).toEqual([expect.objectContaining({ date: '2026-11-20' })]);
    expect(file.settings).toEqual({ minutesPerDay: 25, lastWhatsNewSeen: null });
    expect(typeof file.cards[0].dueAt).toBe('string');
    expect(file.cards[0].dueAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    expect(backupFileName(T0)).toBe('nigiri-backup-2026-11-09.json');
  });
});

describe('restore', () => {
  it('round-trips: export, wipe, restore, deep-equal with Dates as Dates', async () => {
    await fill(db);
    const before = await readAll(db);
    const text = await exportBackupText(db, T0);
    await Promise.all([db.decks.clear(), db.cards.clear(), db.reviews.clear(), db.tests.clear(), db.settings.clear()]);
    const res = await restoreBackup(db, text);
    expect(res.ok).toBe(true);
    const after = await readAll(db);
    const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id));
    expect(byId(after.decks)).toEqual(byId(before.decks));
    expect(byId(after.cards)).toEqual(byId(before.cards));
    expect(byId(after.reviews)).toEqual(byId(before.reviews));
    expect(after.tests).toEqual(before.tests);
    expect(after.settings).toEqual(before.settings);
    expect(after.cards[0].dueAt).toBeInstanceOf(Date);
    expect(after.reviews[0].reviewTime).toBeInstanceOf(Date);
    expect(after.cards.some((c) => c.lastReviewAt instanceof Date)).toBe(true);
    // A first review's lastReviewAt is null, and Restore accepts that (H5).
    expect(after.reviews.some((r) => r.lastReviewAt === null)).toBe(true);
  });

  it('replaces everything, and leaves the theme and the draft alone', async () => {
    const ls = fakeLocalStorage();
    ls.setItem(THEME_KEY, 'midnight');
    ls.setItem(DRAFT_KEY, JSON.stringify({ deckId: 'x', front: 'half', back: '' }));
    await fill(db);
    const text = await exportBackupText(db, T0);
    const other = await freshDb();
    await createDeck(other, { name: 'Will be replaced', colour: 'blue' }, T0);
    expect((await restoreBackup(other, text)).ok).toBe(true);
    expect((await other.decks.toArray()).map((d) => d.name).sort()).toEqual(['Biology', 'US History unit 2']);
    expect(ls.getItem(THEME_KEY)).toBe('midnight');
    expect(ls.getItem(DRAFT_KEY)).toContain('half');
    other.close();
  });

  describe('rejects a bad file with a plain message, and changes nothing', () => {
    let good: ReturnType<typeof JSON.parse>;
    let before: Awaited<ReturnType<typeof readAll>>;
    beforeEach(async () => {
      await fill(db);
      good = JSON.parse(await exportBackupText(db, T0));
      before = await readAll(db);
    });

    const cases: [string, (f: ReturnType<typeof JSON.parse>) => unknown, RegExp][] = [
      ['not JSON', () => '{ this is not json', /isn't a Nigiri backup/],
      ['the wrong app', (f) => ({ ...f, app: 'anki' }), /isn't a Nigiri backup/],
      ['the wrong format', (f) => ({ ...f, format: 2 }), /different version of Nigiri \(format 2\)/],
      ['the wrong model', (f) => ({ ...f, scheduler: { ...f.scheduler, model: 'FSRS-6' } }), /different way of scheduling/],
      ['a bad date', (f) => ({ ...f, cards: [{ ...f.cards[0], dueAt: 'last Tuesday' }, f.cards[1]] }), /date that isn't a real date/],
      ['an impossible date', (f) => ({ ...f, reviews: [{ ...f.reviews[0], reviewTime: '2026-13-40T00:00:00.000Z' }, ...f.reviews.slice(1)] }), /date that isn't a real date/],
      ['a test on 2026-02-30', (f) => ({ ...f, tests: [{ ...f.tests[0], date: '2026-02-30' }] }), /test date isn't a real day \(2026-02-30\)/],
      ['a duplicate id', (f) => ({ ...f, cards: [f.cards[0], { ...f.cards[1], id: f.cards[0].id }] }), /same card twice/],
      ['a dangling deck reference', (f) => ({ ...f, cards: [{ ...f.cards[0], deckId: 'no-such-deck' }, f.cards[1]] }), /deck that isn't in this backup/],
      ['a dangling card reference', (f) => ({ ...f, reviews: [{ ...f.reviews[0], cardId: 'no-such-card' }, ...f.reviews.slice(1)] }), /card that isn't in this backup/],
      ['a test for a missing deck', (f) => ({ ...f, tests: [{ deckId: 'gone', date: '2026-11-20' }] }), /test belongs to a deck/],
      ['a rating of 5', (f) => ({ ...f, reviews: [{ ...f.reviews[0], rating: 5 }, ...f.reviews.slice(1)] }), /rating Nigiri doesn't know/],
      ['a number that is not finite', (f) => ({ ...f, cards: [{ ...f.cards[0], stability: 'NaN' }, f.cards[1]] }), /number that can't be read/],
      ['missing cards', (f) => ({ ...f, cards: undefined }), /missing its cards/],
    ];

    for (const [name, mutate, message] of cases) {
      it(name, async () => {
        const bad = mutate(structuredClone(good));
        const text = typeof bad === 'string' ? bad : JSON.stringify(bad);
        const res = await restoreBackup(db, text);
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.message).toMatch(message);
        expect(await readAll(db)).toEqual(before);
      });
    }

    it('checks before touching anything, even when the bad record is last', async () => {
      const f = structuredClone(good);
      f.reviews[f.reviews.length - 1].rating = 0;
      expect(checkBackup(JSON.stringify(f)).ok).toBe(false);
      expect(await readAll(db)).toEqual(before);
    });
  });

  it('the format number is 1', () => {
    expect(BACKUP_FORMAT).toBe(1);
    expect(exportBackup).toBeTypeOf('function');
  });
});

describe("Settings' line for a file that doesn't pass (QA-1 F1)", () => {
  it('says what was wrong, that nothing changed, and the next tap', () => {
    const notJson = checkBackup('{ this is not json');
    expect(notJson.ok).toBe(false);
    if (!notJson.ok) {
      expect(restoreRejectLine(notJson.message)).toBe(
        "Not restored. That file isn't a Nigiri backup, so nothing changed. Tap Restore a backup to pick another.",
      );
    }
    expect(restoreRejectLine("A test date isn't a real day (2026-02-30).")).toBe(
      "Not restored. A test date isn't a real day (2026-02-30), so nothing changed. Tap Restore a backup to pick another.",
    );
    // A reason that already says it can't be restored doesn't say "so" twice.
    expect(restoreRejectLine("This backup was made by a different version of Nigiri (format 2), so it can't be restored here.")).toBe(
      'Not restored. This backup was made by a different version of Nigiri (format 2), so nothing changed. Tap Restore a backup to pick another.',
    );
  });
});
