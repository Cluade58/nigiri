// J4, acceptance A3: export, then restore, round-trips every record; a bad file says what's wrong and
// changes nothing; Restore leaves the chosen theme and a half-typed card alone (D39d, D54).
import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MONDAY_10AM, addCards, createDeck, installClock, rate, readAllStores, showAnswer } from './helpers';

test('J4: export and restore round-trip; bad files change nothing; theme and draft stay', async ({ page }, testInfo) => {
  await installClock(page, MONDAY_10AM);
  await page.goto('./#/');

  // Something worth backing up: a deck, two cards, a review, a test and a minutes-a-day setting.
  await createDeck(page, 'Biology', 'Green');
  await addCards(page, 'Biology', [
    ['Osmosis', 'Water moving across a membrane'],
    ['Cristae', 'The folds of the inner membrane'],
  ]);
  await page.getByRole('link', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Review 2 cards' }).click();
  await showAnswer(page);
  await rate(page, 'Good');
  await page.getByRole('link', { name: /End session/ }).click();
  await page.getByRole('link', { name: /Biology/ }).first().click();
  await page.getByRole('link', { name: /Add a test/ }).click();
  await page.getByLabel('Test date').fill('2026-11-14');
  await page.getByRole('button', { name: 'More minutes' }).click();
  await expect(page.getByLabel('Minutes a day')).toHaveValue('20');
  await page.getByRole('button', { name: 'Save test' }).click();
  await expect(page.getByRole('link', { name: /Edit test/ })).toBeVisible();

  // Export: one file, named by the local date, and a line that says where it went.
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  // Each line sits under the button it answers, so a line never moves that button (UI-CRIT-2 req 1):
  // Export's line comes first on the page, Restore's (under its helper line) second.
  const exportLine = page.getByRole('status').nth(0);
  const restoreLine = page.getByRole('status').nth(1);
  const exportButton = page.getByRole('button', { name: 'Export backup' });
  const exportAt = await exportButton.boundingBox();
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
  expect(download.suggestedFilename()).toBe('nigiri-backup-2026-11-09.json');
  await expect(exportLine).toHaveText('Exported. Look for nigiri-backup-2026-11-09.json in your downloads.');
  expect(await exportButton.boundingBox()).toEqual(exportAt);
  const file = testInfo.outputPath('backup.json');
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, 'utf8')) as { scheduler: unknown; tests: { date: string }[] };
  expect(exported.scheduler).toEqual({ package: 'ts-fsrs', version: '6.0.0', model: 'FSRS-7' });
  const before = await readAllStores(page);
  expect(before.decks).toHaveLength(1);
  expect(before.cards).toHaveLength(2);
  expect(before.reviews).toHaveLength(1);
  expect(before.tests).toHaveLength(1);

  // A chosen theme and a half-typed card live outside the database.
  await page.getByRole('radio', { name: /Midnight/ }).check();
  await page.getByRole('link', { name: 'Home' }).click();
  await page.getByRole('link', { name: /Biology/ }).first().click();
  await page.getByRole('link', { name: 'Add card' }).click();
  await page.getByLabel('Front').fill('Half a card');
  await page.goto('./#/');
  const draftBefore = await page.evaluate(() => localStorage.getItem('nigiri:draft'));
  expect(draftBefore).toContain('Half a card');

  // Change the data after the export, so the restore has something to replace.
  await createDeck(page, 'Chem unit 3', 'Yellow');
  await page.goto('./#/settings');

  // A bad file: not JSON at all. It says so, and nothing changes.
  const notJson = testInfo.outputPath('not-a-backup.json');
  writeFileSync(notJson, 'this is not a backup');
  const changed = await readAllStores(page);
  const restoreButton = page.getByRole('button', { name: 'Restore a backup' });
  const restoreAt = await restoreButton.boundingBox();
  await page.locator('input[type="file"]').setInputFiles(notJson);
  await expect(restoreLine).toHaveText("Not restored. That file isn't a Nigiri backup, so nothing changed. Tap Restore a backup to pick another.");
  await expect(exportLine).toHaveText('');
  expect(await restoreButton.boundingBox()).toEqual(restoreAt);
  expect(await readAllStores(page)).toEqual(changed);

  // A bad file: a test on a day that doesn't exist.
  const badDay = testInfo.outputPath('bad-day.json');
  const broken = JSON.parse(readFileSync(file, 'utf8')) as { tests: { date: string }[] };
  broken.tests[0].date = '2026-02-30';
  writeFileSync(badDay, JSON.stringify(broken));
  await page.locator('input[type="file"]').setInputFiles(badDay);
  await expect(restoreLine).toHaveText("Not restored. A test date isn't a real day (2026-02-30), so nothing changed. Tap Restore a backup to pick another.");
  expect(await readAllStores(page)).toEqual(changed);

  // The good file: the confirm says what's replaced, then everything round-trips.
  await page.locator('input[type="file"]').setInputFiles(file);
  const dialog = page.getByRole('dialog', { name: 'Replace everything on this phone?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    "Your 2 decks and 2 cards here are replaced by the backup's 1 deck and 2 cards. Export first if you want to keep what's here.",
  );
  await dialog.getByRole('button', { name: 'Replace everything' }).click();
  await expect(dialog).toBeHidden();
  await expect(restoreLine).toHaveText('Restored. 1 deck and 2 cards.');
  expect(await readAllStores(page)).toEqual(before);

  // The theme and the draft are as they were.
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('midnight');
  expect(await page.evaluate(() => localStorage.getItem('nigiri:theme'))).toBe('midnight');
  expect(await page.evaluate(() => localStorage.getItem('nigiri:draft'))).toBe(draftBefore);

  // And it survives a reload.
  await page.reload();
  expect(await readAllStores(page)).toEqual(before);
});
