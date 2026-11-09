// J2, spec §5 check 3: a double tap logs exactly one review, and so does rating the same card in two
// open copies of the app. Also from "Also test": a double tap on Show answer logs no review.
// CR-1 M4: three clicks in one script (faster than any render) make one deck and one card.
import { expect, test, type Page } from '@playwright/test';
import { GUARD_WAIT_MS, addCards, countRecords, showAnswer } from './helpers';

/** Clicks a button three times in one go, before the page can render in between. */
function tripleClick(page: Page, name: string) {
  return page.evaluate((label) => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
    if (!button) throw new Error(`no button ${label}`);
    button.click();
    button.click();
    button.click();
  }, name);
}

test('J2: double taps and a second open copy never log a second review', async ({ page, context }) => {
  await page.goto('./#/');
  await page.getByRole('link', { name: 'New deck' }).click();
  await page.getByLabel('Deck name').fill('Biology');
  await page.getByRole('radio', { name: 'Green' }).check();
  await tripleClick(page, 'Create deck');
  await expect(page.getByRole('heading', { name: 'Add card' })).toBeVisible();
  expect(await countRecords(page, 'decks')).toBe(1);

  await page.getByLabel('Front').fill('Osmosis');
  await page.getByLabel('Back').fill('Water moving across a membrane');
  await tripleClick(page, 'Save card');
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toHaveText('Saved. Biology has 1 card.');
  expect(await countRecords(page, 'cards')).toBe(1);
  await addCards(page, 'Biology', [['Cristae', 'The folds of the inner membrane']], 1);
  expect(await countRecords(page, 'cards')).toBe(2);
  await page.getByRole('link', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await page.getByRole('link', { name: 'Review 2 cards' }).click();

  // A double tap on Show answer: the second tap lands where Good now is, inside the guard. No review.
  await page.waitForTimeout(GUARD_WAIT_MS);
  await page.getByRole('button', { name: 'Show answer' }).dblclick();
  await expect(page.getByRole('group', { name: 'How well did you know it?' })).toBeVisible();
  expect(await countRecords(page, 'reviews')).toBe(0);

  // A double tap on Good: the keys turn off at the first tap. One review.
  await page.waitForTimeout(GUARD_WAIT_MS);
  await page.getByRole('group', { name: 'How well did you know it?' }).getByRole('button', { name: 'Good' }).dblclick();
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  expect(await countRecords(page, 'reviews')).toBe(1);

  // A second open copy shows the same card. Both rate it; only the first rating saves.
  const other = await context.newPage();
  await other.goto('./#/review');
  await showAnswer(page);
  await showAnswer(other);
  await page.waitForTimeout(GUARD_WAIT_MS);
  await page.getByRole('group', { name: 'How well did you know it?' }).getByRole('button', { name: 'Good' }).click();
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
  await other.getByRole('group', { name: 'How well did you know it?' }).getByRole('button', { name: 'Good' }).click();
  // The other copy sees the card changed, saves nothing, and moves on.
  await expect(other.getByRole('heading', { name: 'Done' })).toBeVisible();
  expect(await countRecords(page, 'reviews')).toBe(2);
  const perCard = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const req = indexedDB.open('nigiri');
        req.onsuccess = () => {
          const all = req.result.transaction('reviews').objectStore('reviews').getAll();
          all.onsuccess = () => {
            const counts = new Map<string, number>();
            for (const r of all.result as { cardId: string }[]) counts.set(r.cardId, (counts.get(r.cardId) ?? 0) + 1);
            resolve([...counts.values()]);
            req.result.close();
          };
        };
      }),
  );
  expect(perCard.sort()).toEqual([1, 1]);
});
