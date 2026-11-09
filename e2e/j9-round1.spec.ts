// J9, round 1 (D73 to D75): Getting started, the "Added this time" list, the You tile, formatting on the
// review card, and Done's XP ledger with a level-up. Phone size. Everything through the UI.
import { expect, test } from '@playwright/test';
import { MONDAY_10AM, addCards, createDeck, installClock, rate, showAnswer } from './helpers';

test('J9: Added list, You tile, formatting and XP on Done', async ({ page }) => {
  await installClock(page, MONDAY_10AM);
  await page.emulateMedia({ reducedMotion: 'reduce' }); // Done shows its final numbers at once
  await page.goto('./#/');

  // First run: Study, then Getting started.
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
  await createDeck(page, 'Biology', 'Green');

  // Four cards in a row: the list grows newest first, with 15 XP for each card written.
  await addCards(page, 'Biology', [
    ['What does the **Krebs cycle** make?', 'In the **matrix**:\n- 2 ATP\n- 6 NADH'],
    ['Osmosis', 'Water moving across a membrane'],
    ['Glycolysis', 'In the cytoplasm'],
    ['Cristae', 'The folds of the inner membrane'],
  ]);
  const added = page.getByRole('region', { name: 'Added this time' });
  await expect(added).toBeVisible();
  await expect(added).toContainText('+60\u00A0XP');
  const rows = added.getByRole('listitem');
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText('Cristae');
  // Plain text in the list: no ** marks.
  await expect(rows.last()).toContainText('What does the Krebs cycle make?');
  await expect(page.getByLabel('Back')).toHaveAccessibleDescription('Use **bold**, or start a line with - for a list.');

  // Tap a row: the edit sheet shows the marks as typed; Cancel returns focus to the row.
  await rows.last().getByRole('button').click();
  const sheet = page.getByRole('dialog', { name: 'Edit card' });
  await expect(sheet.getByLabel('Front')).toHaveValue('What does the **Krebs cycle** make?');
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  await expect(rows.last().getByRole('button')).toBeFocused();
  await page.getByRole('link', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Today', exact: true }).click();

  // Today: Getting started has two steps done, and the You tile is at level 1 with 60 XP.
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
  const you = page.getByRole('region', { name: 'Rice Grain' });
  await expect(you).toContainText('Level 1, 60\u00A0XP');
  await expect(you).toContainText('40\u00A0XP to level 2');
  await expect(you).toContainText('Review a card to start a streak.');

  // Review all four; the formatted card renders bold and a list on the answer.
  await page.getByRole('main').getByRole('link', { name: 'Review 4 cards' }).click();
  let sawList = false;
  for (let i = 0; i < 4; i++) {
    await showAnswer(page);
    const card = page.locator('.rcard');
    if ((await card.locator('.answer li').count()) > 0) {
      sawList = true;
      await expect(card.locator('h1 strong')).toHaveText('Krebs cycle');
      await expect(card.locator('.answer strong')).toHaveText('matrix');
      await expect(card.locator('.answer li')).toHaveText(['2 ATP', '6 NADH']);
      await expect(card.getByText('**')).toHaveCount(0);
    }
    await rate(page, 'Good');
  }
  expect(sawList).toBe(true);

  // Done: 4 × 10 reviewed + 20 bonus (nothing was waiting) = +60, from 60 to 120 XP: level 2.
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
  await expect(page.getByText('1\u00A0day in a row.')).toBeVisible();
  const ledger = page.locator('.done-xp');
  await expect(ledger.locator('.sr-only')).toHaveText('+60\u00A0XP');
  await expect(ledger.getByRole('term')).toHaveText(['Cards reviewed', 'Bonus: every waiting card reviewed']);
  await expect(ledger.getByRole('definition')).toHaveText(['+40', '+20']);
  await expect(ledger.getByText('Up to level 2.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to home' }).click();

  // Back on Today: Getting started is gone after the first review, and the You tile says level 2.
  await expect(page.getByRole('heading', { name: 'Getting started' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Rice Grain' })).toContainText('Level 2, 120\u00A0XP');
  await expect(page.getByRole('region', { name: 'Rice Grain' })).toContainText('1\u00A0day in a row');
});
