// J5, acceptance A5 and "Step 2 also tests" (themes, D39a–D39d): one tap repaints; the theme is on the
// page before React draws anything after a reload (no flash of Snow); the phone's dark mode doesn't
// pick a theme. At the phone size and at 1440×900.
import { expect, test } from '@playwright/test';

const SNOW_PAGE = 'rgb(245, 247, 252)';
const MIDNIGHT_PAGE = 'rgb(20, 27, 36)';

test('J5: one tap picks Midnight, and a reload has it before the app draws', async ({ page }) => {
  // Records the theme at the moment the parser adds #root, before any script could draw into it.
  await page.addInitScript(() => {
    const w = window as unknown as { __themeAtRoot?: string | null; __rootEmpty?: boolean };
    w.__themeAtRoot = null;
    const observer = new MutationObserver(() => {
      const root = document.getElementById('root');
      if (!root || w.__themeAtRoot !== null) return;
      w.__themeAtRoot = document.documentElement.getAttribute('data-theme');
      w.__rootEmpty = root.childNodes.length === 0;
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });

  await page.goto('./#/settings');
  await expect(page.getByRole('radio', { name: /Ink.+Cobalt.+Snow/ })).toBeChecked();
  await page.getByRole('radio', { name: /Midnight.+Ice.+Sky/ }).check();

  // The repaint is the confirmation: no Save, no message.
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'midnight');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#141B24');
  await expect(page.locator('body')).toHaveCSS('background-color', MIDNIGHT_PAGE);
  await expect(page.getByRole('radio', { name: /Midnight/ })).toBeChecked();

  await page.reload();
  const atRoot = await page.evaluate(() => {
    const w = window as unknown as { __themeAtRoot?: string | null; __rootEmpty?: boolean };
    return { theme: w.__themeAtRoot, empty: w.__rootEmpty };
  });
  expect(atRoot).toEqual({ theme: 'midnight', empty: true });
  await expect(html).toHaveAttribute('data-theme', 'midnight');
  await expect(page.locator('body')).toHaveCSS('background-color', MIDNIGHT_PAGE);
  await expect(page.getByRole('radio', { name: /Midnight/ })).toBeChecked();

  // Every screen follows it: Today too.
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', MIDNIGHT_PAGE);
});

test('J5: a phone in dark mode with no saved theme gets Snow (D39a)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./#/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'snow');
  await expect(page.locator('body')).toHaveCSS('background-color', SNOW_PAGE);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F5F7FC');
});
