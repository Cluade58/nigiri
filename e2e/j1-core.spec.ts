// J1, acceptance A1: the core journey, in a fresh browser, at the phone size and at 1440×900.
// New deck, three cards, Today's button and time line, a review with Again and its countdown, Done,
// and a reload that keeps everything. Then the edit sheet with a change: a scrim tap or Escape keeps
// it open, says why, keeps focus inside, and Save changes doesn't move (UI-CRIT-1 required 1).
import { expect, test } from '@playwright/test';
import { MONDAY_10AM, addCards, countRecords, createDeck, installClock, rate, showAnswer } from './helpers';

test('J1: make a deck and three cards, review them, and everything survives a reload', async ({ page }) => {
  await installClock(page, MONDAY_10AM);
  await page.goto('./#/');

  // First use: one way forward.
  await expect(page.getByRole('heading', { name: 'Make your first deck' })).toBeVisible();
  await createDeck(page, 'Biology', 'Green');

  // The form stays open after each save, and the line counts the deck's cards.
  await addCards(page, 'Biology', [
    ['Osmosis', 'Water moving across a membrane toward more dissolved stuff'],
    ['Where does glycolysis happen?', 'In the cytoplasm'],
    ['ATP synthase', 'The enzyme that makes ATP'],
  ]);
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toHaveText('Saved. Biology has 3 cards.');

  await page.getByRole('link', { name: 'Close' }).click();
  // The deck page's Back would go to Add card's screen; the Today tab (or sidebar row) goes home.
  await page.getByRole('link', { name: 'Today', exact: true }).click();

  // Today: the one filled button and the time it takes (3 × 20 s).
  // Scoped to the page's content: from 64em the sidebar has its own outlined Review and deck rows.
  const main = page.getByRole('main');
  const review = main.getByRole('link', { name: 'Review 3 cards' });
  await expect(review).toBeVisible();
  await expect(page.getByText('About 1 minute.')).toBeVisible();

  await review.click();
  // Card 1: Again. It comes back later in this session.
  await showAnswer(page);
  await rate(page, 'Again');
  // Cards 2 and 3: Good.
  await showAnswer(page);
  await rate(page, 'Good');
  await showAnswer(page);
  await rate(page, 'Good');

  // Nothing else is due, so the screen counts down to card 1 (due 1 minute after its Again).
  await expect(page.getByRole('heading', { name: /Next card in/ })).toBeVisible();
  await page.clock.fastForward('01:05');
  await expect(page.getByRole('button', { name: 'Show answer' })).toBeVisible();
  await showAnswer(page);
  await rate(page, 'Good');

  // Done: different cards rated this session (Again doesn't count card 1 twice).
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();
  await expect(page.getByText('3 cards reviewed.')).toBeVisible();
  expect(await countRecords(page, 'reviews')).toBe(4);

  // A reload keeps the deck, the cards and every review.
  await page.getByRole('link', { name: 'Back to home' }).click();
  await page.reload();
  await expect(page.getByText('Nothing due right now')).toBeVisible();
  const deckRow = page.getByRole('main').getByRole('link', { name: /Biology/ });
  await expect(deckRow).toContainText('3 cards');
  expect(await countRecords(page, 'decks')).toBe(1);
  expect(await countRecords(page, 'cards')).toBe(3);
  expect(await countRecords(page, 'reviews')).toBe(4);

  // The edit sheet with a change.
  await deckRow.click();
  await page.getByRole('button', { name: /^Osmosis/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Edit card' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Back').fill('Water moving across a membrane, toward more dissolved stuff');
  const save = sheet.getByRole('button', { name: 'Save changes' });
  // Measured once the sheet has finished rising in (its 200 ms entrance).
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const at = await save.boundingBox();
  const note = 'Not closed. Tap Save changes to keep your edits, or Cancel.';
  const focusInSheet = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  // A tap on the scrim, at the top corner (outside the sheet at every width).
  await page.mouse.click(8, 8);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('status')).toHaveText(note);
  expect(await focusInSheet()).toBe(true);
  await expect(sheet.getByRole('heading', { name: 'Edit card' })).toBeFocused();
  expect(await save.boundingBox()).toEqual(at);
  // From that heading, Shift+Tab wraps to the sheet's last control and Tab back to its first (CR-2 m2).
  await page.keyboard.press('Shift+Tab');
  await expect(sheet.getByRole('button', { name: 'Delete card' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: 'Cancel' })).toBeFocused();
  // Escape, its keyboard twin, does the same.
  await sheet.getByLabel('Front').focus();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('status')).toHaveText(note);
  expect(await focusInSheet()).toBe(true);
  expect(await save.boundingBox()).toEqual(at);
  // Cancel is the way out, and nothing was saved.
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Osmosis/ })).toContainText('Water moving across a membrane toward more dissolved stuff');
});
