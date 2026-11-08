// J6, acceptance A4 in the browser, with a fixed clock: 10 new cards and a test 5 days away. The deck
// page and Today show D44's facts and the fit line, and never a percentage, "ready" or a grade.
// D63: the share is a pace, not a limit, so the deck page offers "Study 8 cards early".
import { expect, test, type Page } from '@playwright/test';
import { MONDAY_10AM, addCards, createDeck, expectNoForecastWords, installClock, rate, readAllStores, showAnswer } from './helpers';

/** Each card's front and dueAt (ISO text), by id, from IndexedDB. */
async function cardsById(page: Page) {
  const { cards } = await readAllStores(page);
  return new Map((cards as { id: string; front: string; dueAt: string }[]).map((c) => [c.id, c]));
}

test('J6: a test 5 days away shows the facts and the fit, and no forecast', async ({ page }) => {
  // Monday 9 November; the test is Saturday 14 November, so new cards finish by Friday.
  await installClock(page, MONDAY_10AM);
  await page.goto('./#/');
  await createDeck(page, 'AP Bio', 'Green');
  await addCards(
    page,
    'AP Bio',
    Array.from({ length: 10 }, (_, i) => [`Term ${i + 1}`, `Meaning ${i + 1}`] as [string, string]),
  );
  await page.getByRole('link', { name: 'Close' }).click();

  // The deck page with no test: one link, "Add a test".
  await page.getByRole('link', { name: /Add a test/ }).click();
  await expect(page.getByRole('heading', { name: 'Add a test' })).toBeVisible();
  // The date can't be before today (D61(5)).
  await expect(page.getByLabel('Test date')).toHaveAttribute('min', '2026-11-09');
  await page.getByLabel('Test date').fill('2026-11-14');
  await expect(page.getByText('In 5 days, Saturday Nov 14')).toBeVisible();
  // 10 cards × 20 s ÷ 5 days = 40 s, rounded up to 1 minute.
  await expect(page.getByRole('heading', { name: 'It fits' })).toBeVisible();
  await expect(page.getByText('10 cards at 20 seconds each, with 5 days left, needs about 1 min a day. You have 15.')).toBeVisible();
  await expect(page.getByText('10 not studied yet: 2 today, all by Friday.')).toBeVisible();
  // The stepper's ends are marked, not hidden.
  await expect(page.getByRole('button', { name: 'Fewer minutes' })).not.toHaveAttribute('aria-disabled', 'true');
  await expectNoForecastWords(page);
  await page.getByRole('button', { name: 'Save test' }).click();

  // The deck page: the test's facts, one link to Edit test.
  const testLine = page.getByRole('link', { name: /Edit test/ });
  await expect(testLine).toBeVisible();
  await expect(testLine).toContainText('Test Saturday, in 5 days');
  await expect(testLine).toContainText('0 of 10 studied');
  await expect(testLine).toContainText('10 not studied yet: 2 today, all by Friday');
  // Today's share only: 2 of the 10 new cards are due.
  await expect(page.getByRole('link', { name: 'Review 2 cards' })).toBeVisible();
  await expectNoForecastWords(page);

  // Today: the Tests tile with the same facts, and one fit line.
  await page.getByRole('link', { name: 'Home' }).click();
  const tests = page.getByRole('region', { name: 'Tests' });
  await expect(tests).toContainText('AP Bio');
  await expect(tests).toContainText('Test Saturday, in 5 days');
  await expect(tests).toContainText('0 of 10 studied');
  await expect(tests).toContainText('10 not studied yet: 2 today, all by Friday');
  await expect(tests).toContainText('It fits: this test needs about 1 minute a day, and you have 15.');
  // The deck row shows its test day.
  await expect(page.getByRole('region', { name: 'Decks' }).getByRole('link', { name: /AP Bio/ })).toContainText('Test Saturday');
  await expect(page.getByRole('link', { name: 'Review 2 cards' })).toBeVisible();
  await expectNoForecastWords(page);
  // Studying early is offered on the deck page only, never on Today.
  await expect(page.getByRole('link', { name: /early/ })).toHaveCount(0);

  // D63: the deck page offers the 8 held-back cards, and says the due ones come first.
  await page.getByRole('region', { name: 'Tests' }).getByRole('link', { name: /AP Bio/ }).click();
  const early = page.getByRole('link', { name: 'Study 8 cards early' });
  await expect(early).toBeVisible();
  await expect(page.getByText('The 2 cards due now come first.')).toBeVisible();
  const before = await cardsById(page);
  await early.click();
  // The session holds every new card: the 2 due now, then the 8 held back.
  const left = page.locator('.session-bar .count');
  await expect(left).toHaveText('10 left');
  for (let i = 0; i < 5; i++) {
    await showAnswer(page);
    await rate(page, 'Good');
  }
  await expect(left).toHaveText('5 left');
  await page.getByRole('link', { name: 'End session. Your ratings are saved.' }).click();

  // The 5 rated are Term 1 to 5, in writing order: Terms 3 to 5 were held back. Every other card's
  // dueAt is unchanged: studying early writes only the cards it rates.
  const { reviews } = await readAllStores(page);
  const after = await cardsById(page);
  const ratedIds = new Set((reviews as { cardId: string }[]).map((r) => r.cardId));
  expect([...ratedIds].map((id) => after.get(id)!.front).sort()).toEqual(['Term 1', 'Term 2', 'Term 3', 'Term 4', 'Term 5']);
  for (const [id, card] of after) {
    if (!ratedIds.has(id)) expect(card.dueAt).toBe(before.get(id)!.dueAt);
    else expect(card.dueAt).not.toBe(before.get(id)!.dueAt);
  }

  // The share recomputes: none left today, and the other 5 can still be studied early.
  const testsAfter = page.getByRole('region', { name: 'Tests' });
  await expect(testsAfter).toContainText('5 of 10 studied');
  await expect(testsAfter).toContainText('5 not studied yet: none left today, all by Friday');
  await expect(page.getByText('Nothing due right now')).toBeVisible();
  await testsAfter.getByRole('link', { name: /AP Bio/ }).click();
  await expect(page.getByRole('link', { name: /Edit test/ })).toContainText('5 not studied yet: none left today, all by Friday');
  await expect(page.getByRole('link', { name: 'Study 5 cards early' })).toBeVisible();
  await expect(page.getByText(/due now come/)).toHaveCount(0);
  await page.getByRole('link', { name: 'Home' }).click();

  // The day after the test, the deck acts as if it has none (D30): the tile goes, "Add a test" is back.
  await page.clock.fastForward(6 * 24 * 60 * 60 * 1000);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Tests' })).toHaveCount(0);
  await page.getByRole('link', { name: /AP Bio/ }).first().click();
  await expect(page.getByRole('link', { name: /Add a test/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /early/ })).toHaveCount(0);
});
