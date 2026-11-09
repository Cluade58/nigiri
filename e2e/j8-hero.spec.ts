// J8, Card as hero (D65–D70): the tab bar, Add card's deck chips, return times on the keys, and
// Progress counting a saved review as a 1-day streak. Phone size.
import { expect, test } from '@playwright/test';
import { MONDAY_10AM, addCards, createDeck, installClock, rate, showAnswer } from './helpers';

test('J8: tabs, deck chips, return times and the streak', async ({ page }) => {
  await installClock(page, MONDAY_10AM);
  await page.goto('./#/');
  const tabs = page.getByRole('navigation', { name: 'Main' });
  await expect(tabs.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');

  await createDeck(page, 'Biology', 'Green');
  // Forms hide the tab bar.
  await expect(tabs).toHaveCount(0);
  await addCards(page, 'Biology', [['Osmosis', 'Water moving across a membrane']]);
  await page.getByRole('link', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Back' }).click();
  await page.getByRole('link', { name: 'New deck' }).first().click();
  await page.getByLabel('Deck name').fill('History');
  await page.getByRole('radio', { name: 'Purple' }).check();
  await page.getByRole('button', { name: 'Create deck' }).click();
  await page.getByRole('link', { name: 'Close' }).click();

  // Decks tab: both decks, Decks marked current.
  await page.getByRole('link', { name: 'Decks', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Decks', level: 1 })).toBeVisible();
  await expect(tabs.getByRole('link', { name: 'Decks' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('main').getByRole('link', { name: /Biology/ })).toBeVisible();

  // Add card from Today: chips, nothing picked, focus on the first chip.
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await page.getByRole('link', { name: 'Add card' }).click();
  const deckGroup = page.getByRole('group', { name: 'Deck' });
  const chips = deckGroup.getByRole('radio');
  await expect(chips).toHaveCount(2);
  for (const chip of await chips.all()) await expect(chip).not.toBeChecked();
  await expect(chips.first()).toBeFocused();
  // Saving with no deck says so under the chips and keeps focus there.
  await page.getByLabel('Front').fill('Cristae');
  await page.getByLabel('Back').fill('The folds of the inner membrane');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByText('Choose a deck first')).toBeVisible();
  await expect(chips.first()).toBeFocused();
  // A tap picks the deck and moves to the card.
  await deckGroup.getByRole('radio', { name: 'Biology' }).click();
  await expect(deckGroup.getByRole('radio', { name: 'Biology' })).toBeChecked();
  await expect(page.getByLabel('Back')).toBeFocused(); // Front has text, so the cursor goes on (the draft rule)
  await expect(page.getByText('Choose a deck first')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved.' })).toHaveText('Saved. Biology has 2 cards.');
  await page.getByRole('link', { name: 'Close' }).click();

  // Review: each key says (accessible names normalise the no-break space) when the card comes back, in words a screen reader hears too.
  await page.getByRole('main').getByRole('link', { name: 'Review 2 cards' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await showAnswer(page);
  const keys = page.getByRole('group', { name: 'How well did you know it?' });
  await expect(keys.getByRole('button', { name: /^Again, back in 1\smin$/ })).toBeVisible();
  await expect(keys.getByRole('button', { name: /^Hard, back in 90\ssec$/ })).toBeVisible();
  await expect(keys.getByRole('button', { name: /^Good, back in \d+\sdays?$/ })).toBeVisible();
  await rate(page, 'Good');
  await page.getByRole('link', { name: /End session/ }).click();

  // Progress: a 1-day streak, and today in the calendar.
  await page.getByRole('link', { name: 'Progress', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Progress', level: 1 })).toBeVisible();
  await expect(page.getByText('1\u00A0day in a row')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Days studied, last 8 weeks' })).toContainText('today, 9 November, 1\u00A0card');
  await expect(page.getByText('Studied on 1 of the last 50\u00A0days.')).toBeVisible();
});
