// J3, spec §5 check 1 (A2): once the service worker has installed, the app loads with no network,
// a review saves offline, and after another offline reload there's exactly one review.
import { expect, test } from '@playwright/test';
import { addCards, countRecords, createDeck, rate, showAnswer } from './helpers';

test('J3: offline, the app loads and a review saves exactly once', async ({ page, context }) => {
  await page.goto('./#/');
  // The worker installs on the first visit; it controls the page from the next load (no clientsClaim, D53).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await createDeck(page, 'Biology', 'Green');
  await addCards(page, 'Biology', [['Osmosis', 'Water moving across a membrane']]);
  await page.getByRole('link', { name: 'Close' }).click();
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Review 1 card' })).toBeVisible();

  await context.setOffline(true);
  // Really offline: a file the worker never kept can't be fetched.
  const probe = await page.evaluate(() => fetch(`/nigiri/not-kept-${Date.now()}.txt`).then(() => 'online', () => 'offline'));
  expect(probe).toBe('offline');

  // The app loads from the worker's copy, with the card still due.
  await page.reload();
  await expect(page.getByRole('link', { name: 'Review 1 card' })).toBeVisible();
  await page.getByRole('link', { name: 'Review 1 card' }).click();
  await showAnswer(page);
  await rate(page, 'Good');
  await expect(page.getByRole('heading', { name: 'Done' })).toBeVisible();

  // Still offline: reload, and the review is there, once.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Done' }).or(page.getByText('Nothing due right now'))).toBeVisible();
  expect(await countRecords(page, 'reviews')).toBe(1);
  await page.goto('./#/');
  await expect(page.getByText('Nothing due right now')).toBeVisible();
  expect(await countRecords(page, 'reviews')).toBe(1);
  await context.setOffline(false);
});
