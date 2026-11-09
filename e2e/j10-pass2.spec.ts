// J10, pass 2 (D76, D77): the practice round writes nothing; Add card's "Saved." line follows a delete
// from the Added list; Settings in tiles; New deck's preview. Phone size. Everything through the UI,
// except reading IndexedDB and localStorage to compare what's stored.
import { expect, test, type Page } from '@playwright/test';
import { GUARD_WAIT_MS, MONDAY_10AM, addCards, createDeck, installClock, rate, readAllStores, showAnswer } from './helpers';

const NBSP = String.fromCharCode(0xa0);

/** Every localStorage key and value, sorted, as text. */
const readLocal = (page: Page) =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .sort()
      .map((k) => [k, localStorage.getItem(k)]),
  );

test('J10: a practice round shows every card and writes nothing (D77)', async ({ page }) => {
  await installClock(page, MONDAY_10AM);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/');
  await createDeck(page, 'Biology', 'Green');
  await addCards(page, 'Biology', [
    ['Osmosis', 'Water moving across a membrane'],
    ['Glycolysis', 'In the cytoplasm'],
    ['Cristae', 'The folds of the inner membrane'],
  ]);
  // A half-typed card stays as this deck's draft, so the draft is part of what must not change.
  await page.getByLabel('Front').fill('Half a card');
  await page.goto('./#/');

  // Review all three, so there are reviews, XP and a streak to keep.
  await page.getByRole('main').getByRole('link', { name: 'Review 3 cards' }).click();
  for (let i = 0; i < 3; i++) {
    await showAnswer(page);
    // Review unchanged by D78: its answer still takes focus when it appears.
    await expect(page.locator('.rcard .answer')).toBeFocused();
    await rate(page, 'Good');
  }
  await page.getByRole('link', { name: 'Back to home' }).click();
  const you = page.getByRole('region', { name: /Rice Grain|Level/ }).first();
  await expect(you).toContainText('1 day in a row');
  const youBefore = await you.innerText();

  const before = { stores: await readAllStores(page), local: await readLocal(page) };
  expect(before.stores.reviews).toHaveLength(3);
  expect(before.local.some(([k, v]) => k === 'nigiri:draft' && v?.includes('Half a card'))).toBe(true);

  // The deck page's row, under the test row.
  await page.getByRole('main').getByRole('link', { name: /Biology/ }).first().click();
  await page.getByRole('link', { name: 'Practice all 3 cards' }).click();

  const seen = new Set<string>();
  for (let left = 3; left >= 1; left--) {
    await expect(page.locator('.session-bar .count')).toHaveText(`Practice, ${left}${NBSP}left`);
    await expect(page.getByRole('navigation')).toHaveCount(0); // no tab bar
    const show = page.getByRole('button', { name: 'Show answer' });
    await expect(show).toBeVisible();
    // A tap inside the 400 ms guard does nothing.
    await show.click();
    await expect(page.locator('.rcard .answer')).toHaveCount(0);
    await page.waitForTimeout(GUARD_WAIT_MS);
    await show.click();
    await expect(page.locator('.rcard .answer')).toBeVisible();
    seen.add(await page.locator('.rcard h1').innerText());
    // Focus stays on the one button (now Next card); the answer is announced politely (QA-7 m1).
    await expect(page.getByRole('button', { name: 'Next card' })).toBeFocused();
    await expect(page.locator('.session [role="status"]')).toContainText('Answer: ');
    // No rating keys, no hint line, no return times.
    await expect(page.getByRole('group', { name: 'How well did you know it?' })).toHaveCount(0);
    await expect(page.getByText('Forgot it?')).toHaveCount(0);
    const next = page.getByRole('button', { name: 'Next card' });
    await expect(next).toBeVisible();
    await page.waitForTimeout(GUARD_WAIT_MS);
    await next.click();
  }
  expect([...seen].sort()).toEqual(['Cristae', 'Glycolysis', 'Osmosis']);

  await expect(page.getByRole('heading', { name: 'Practice done.' })).toBeVisible();
  await expect(page.getByText('3 cards. Nothing was rescheduled.')).toBeVisible();
  await expect(page.getByText(/XP|in a row/)).toHaveCount(0);

  // Byte-identical: cards, reviews, settings (every store) and localStorage, draft included.
  const after = { stores: await readAllStores(page), local: await readLocal(page) };
  expect(JSON.stringify(after.stores)).toBe(JSON.stringify(before.stores));
  expect(JSON.stringify(after.local)).toBe(JSON.stringify(before.local));

  // D78: Practice again, outlined, under the one filled button, Back to deck.
  const backBtn = page.getByRole('link', { name: 'Back to deck' });
  const again = page.getByRole('button', { name: 'Practice again' });
  await expect(page.locator('.done .btn-primary')).toHaveCount(1);
  await expect(backBtn).toHaveClass(/btn-primary/);
  await expect(again).toHaveClass(/btn-secondary/);
  expect((await again.boundingBox())!.y).toBeGreaterThan((await backBtn.boundingBox())!.y);
  await again.click();

  // A second round, by keyboard only: Enter, Enter per card, respecting the 400 ms guard. Focus never leaves the button.
  const seen2 = new Set<string>();
  const btn = page.locator('.action-zone .btn-primary');
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeFocused();
  for (let left = 3; left >= 1; left--) {
    await expect(page.locator('.session-bar .count')).toHaveText(`Practice, ${left}${NBSP}left`);
    await expect(btn).toHaveText('Show answer');
    await expect(btn).toBeFocused();
    await page.waitForTimeout(GUARD_WAIT_MS);
    await page.keyboard.press('Enter');
    await expect(page.locator('.rcard .answer')).toBeVisible();
    await expect(btn).toHaveText('Next card');
    await expect(btn).toBeFocused();
    seen2.add(await page.locator('.rcard h1').innerText());
    await page.waitForTimeout(GUARD_WAIT_MS);
    await page.keyboard.press('Enter');
  }
  expect([...seen2].sort()).toEqual(['Cristae', 'Glycolysis', 'Osmosis']);
  await expect(page.getByRole('heading', { name: 'Practice done.' })).toBeVisible();

  // Still nothing written after the second round.
  const after2 = { stores: await readAllStores(page), local: await readLocal(page) };
  expect(JSON.stringify(after2.stores)).toBe(JSON.stringify(before.stores));
  expect(JSON.stringify(after2.local)).toBe(JSON.stringify(before.local));

  await page.getByRole('link', { name: 'Back to deck' }).click();
  await expect(page.getByRole('heading', { name: 'Biology' })).toBeVisible();
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  // XP and streak are unchanged.
  await expect(you).toContainText('1 day in a row');
  expect(await you.innerText()).toBe(youBefore);

  // An address for a deck that doesn't exist goes home, like the deck page.
  await page.goto('./#/deck/nope/practice');
  await expect(page).toHaveURL(/#\/$/);
});

test('J10: deleting from the Added list corrects the "Saved." line and moves focus to Front', async ({ page }) => {
  await installClock(page, MONDAY_10AM);
  await page.goto('./#/');
  await createDeck(page, 'Biology', 'Green');
  await addCards(page, 'Biology', [
    ['Osmosis', 'Water moving across a membrane'],
    ['Glycolysis', 'In the cytoplasm'],
    ['Cristae', 'The folds of the inner membrane'],
  ]);
  const line = page.getByRole('status').filter({ hasText: 'Saved.' });
  await expect(line).toHaveText('Saved. Biology has 3 cards.');
  const rows = page.getByRole('region', { name: 'Added this time' }).getByRole('listitem');
  await rows.first().getByRole('button').click();
  const sheet = page.getByRole('dialog', { name: 'Edit card' });
  page.once('dialog', (d) => void d.accept());
  await sheet.getByRole('button', { name: 'Delete card' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(rows).toHaveCount(2);
  await expect(line).toHaveText('Saved. Biology has 2 cards.');
  await expect(page.getByLabel('Front')).toBeFocused();
  // Cancel on a row puts focus back on that row.
  await rows.first().getByRole('button').click();
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  await expect(rows.first().getByRole('button')).toBeFocused();
});

test('J10: Settings in three tiles, no Home link, Export the one filled button', async ({ page }) => {
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(page.locator('.settings-tiles > .tile')).toHaveCount(3);
  await expect(page.getByRole('link', { name: 'Home' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Today', exact: true })).toBeVisible(); // the tab bar
  const main = page.getByRole('main');
  await expect(main.locator('.btn-primary')).toHaveCount(1);
  await expect(main.locator('.btn-primary')).toHaveText('Export backup');
  // The Export line sits under Export backup, above Restore (D64).
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  await download;
  const exported = page.getByRole('status').filter({ hasText: 'Exported.' });
  await expect(exported).toBeVisible();
  const [btn, lineBox, restore] = await Promise.all([
    page.getByRole('button', { name: 'Export backup' }).boundingBox(),
    exported.boundingBox(),
    page.getByRole('button', { name: 'Restore a backup' }).boundingBox(),
  ]);
  expect(lineBox!.y).toBeGreaterThan(btn!.y + btn!.height - 1);
  expect(restore!.y).toBeGreaterThan(lineBox!.y);
  const how = page.getByRole('link', { name: 'How Nigiri picks your cards' });
  expect((await how.boundingBox())!.height).toBeGreaterThanOrEqual(48);
});

test('J10: New deck shows a live preview of its row, and swatches are at least 48×48', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('./#/new-deck');
  const preview = page.locator('.deck-preview');
  await expect(preview).toHaveAttribute('aria-hidden', 'true');
  await expect(preview).toContainText('In your deck list');
  await expect(preview.locator('.name')).toHaveText('Your deck');
  await expect(preview.locator('.sub')).toHaveText('0 cards');
  await expect(preview.locator('.swatch')).toHaveClass(/is-unset/);
  await page.getByLabel('Deck name').fill('Chem unit 3');
  await expect(preview.locator('.name')).toHaveText('Chem unit 3');
  await page.getByRole('radio', { name: 'Yellow' }).check();
  await expect(preview.locator('.swatch')).not.toHaveClass(/is-unset/);
  for (const radio of await page.getByRole('radio').all()) {
    const box = (await radio.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
  // QA-7 m2: at 320 too, both the tap area and the visible swatch are at least 48 wide, with no sideways scroll.
  await page.setViewportSize({ width: 320, height: 568 });
  for (const radio of await page.getByRole('radio').all()) {
    const box = (await radio.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
  for (const swatch of await page.locator('.colours .colour').all()) {
    const box = (await swatch.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
