// Shared steps for the browser journeys. Everything goes through the UI, as a person would, except
// reading IndexedDB to count what was saved.
import { expect, type Page } from '@playwright/test';

/** Monday 9 November 2026, 10:00 in New York (the projects' time zone). */
export const MONDAY_10AM = new Date('2026-11-09T10:00:00-05:00');

/**
 * Fixes the page's clock at `time` (it keeps ticking from there). Test-only shim: Playwright's fake Date
 * shares the native Date.prototype, but that prototype's `constructor` still points at the native Date,
 * and Dexie decides whether to copy a value by checking `value.constructor` against the global Date.
 * Without the shim, dates read back from IndexedDB become plain objects and every screen crashes.
 * Real browsers never hit this: their Date is the native one.
 */
export async function installClock(page: Page, time: Date) {
  await page.clock.install({ time });
  await page.addInitScript(() => {
    Object.defineProperty(Date.prototype, 'constructor', { value: Date, writable: true, configurable: true });
  });
}

/** D16: taps within 400 ms of a card or answer appearing do nothing, so wait past it. */
export const GUARD_WAIT_MS = 450;

export type StoreName = 'decks' | 'cards' | 'reviews' | 'tests' | 'settings';

/** Counts the records in one store of the app's database. */
export function countRecords(page: Page, store: StoreName): Promise<number> {
  return page.evaluate(
    (name) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('nigiri');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const c = db.transaction(name).objectStore(name).count();
          c.onsuccess = () => {
            resolve(c.result);
            db.close();
          };
          c.onerror = () => reject(c.error);
        };
      }),
    store,
  );
}

/** Every record in every store, as JSON text values (dates become ISO text), sorted, for comparing. */
export function readAllStores(page: Page): Promise<Record<StoreName, unknown[]>> {
  return page.evaluate(
    () =>
      new Promise<Record<StoreName, unknown[]>>((resolve, reject) => {
        const names = ['decks', 'cards', 'reviews', 'tests', 'settings'] as const;
        const req = indexedDB.open('nigiri');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction([...names]);
          const out: Record<string, unknown[]> = {};
          for (const name of names) {
            const all = tx.objectStore(name).getAll();
            all.onsuccess = () => {
              const rows = JSON.parse(JSON.stringify(all.result)) as Record<string, string>[];
              rows.sort((a, b) => String(a.id ?? a.deckId).localeCompare(String(b.id ?? b.deckId)));
              out[name] = rows;
            };
          }
          tx.oncomplete = () => {
            db.close();
            resolve(out as Record<StoreName, unknown[]>);
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** From Today: New deck, a name and a colour, Create deck. Ends on Add card in the new deck. */
export async function createDeck(page: Page, name: string, colour: string) {
  await page.getByRole('link', { name: 'New deck' }).click();
  await page.getByLabel('Deck name').fill(name);
  await page.getByRole('radio', { name: colour }).check();
  await page.getByRole('button', { name: 'Create deck' }).click();
  await expect(page.getByRole('heading', { name: 'Add card' })).toBeVisible();
}

/** On Add card: types each card and saves it, checking the "Saved." line each time. */
export async function addCards(page: Page, deckName: string, cards: readonly [string, string][], startCount = 0) {
  for (const [i, [front, back]] of cards.entries()) {
    await page.getByLabel('Front').fill(front);
    await page.getByLabel('Back').fill(back);
    await page.getByRole('button', { name: 'Save card' }).click();
    const n = startCount + i + 1;
    await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toHaveText(`Saved. ${deckName} has ${n} ${n === 1 ? 'card' : 'cards'}.`);
  }
}

/**
 * Show answer, past the double-tap guard. The guard starts when the card appears, and after a rating
 * that's only once the save and the re-read finish, so the wait starts once Show answer is on screen
 * (the keys are gone), not when the rating was tapped (CR-2 m3).
 */
export async function showAnswer(page: Page) {
  const show = page.getByRole('button', { name: 'Show answer' });
  const keys = page.getByRole('group', { name: 'How well did you know it?' });
  await expect(show).toBeVisible();
  await expect(keys).toHaveCount(0);
  await page.waitForTimeout(GUARD_WAIT_MS);
  await show.click();
  await expect(keys).toBeVisible();
}

/** Taps a rating key, past the double-tap guard. */
export async function rate(page: Page, label: 'Again' | 'Hard' | 'Good' | 'Easy') {
  await page.waitForTimeout(GUARD_WAIT_MS);
  await page.getByRole('group', { name: 'How well did you know it?' }).getByRole('button', { name: label }).click();
}

/** Words Test mode must never show (D44): no percentage, readiness or grade. */
export async function expectNoForecastWords(page: Page) {
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/%/);
  expect(text).not.toMatch(/\bready\b/i);
  expect(text).not.toMatch(/\bgrades?\b/i);
}
