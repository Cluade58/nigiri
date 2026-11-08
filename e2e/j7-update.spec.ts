// J7, D53 and acceptance A5's last line: a new version installs in the background and waits; the open
// page keeps running the old one, even through a reload; once every Nigiri window has closed, the next
// launch runs the new one. This journey builds the app twice (VITE_BUILD_ID A, then B) into its own
// folder and serves it with a small static server, so the shared preview on port 4173 is untouched.
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const PORT = 4180;
const ORIGIN = `http://localhost:${PORT}`;
const APP = `${ORIGIN}/nigiri/`;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function build(id: string, outDir: string) {
  execFileSync('node', [resolve('node_modules/vite/bin/vite.js'), 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'warn'], {
    env: { ...process.env, VITE_BUILD_ID: id },
    stdio: 'pipe',
  });
}

/** Serves the folder at /nigiri/, read fresh on every request (like GitHub Pages after a deploy). */
function serve(dir: string): Promise<Server> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', ORIGIN).pathname);
    // A page outside the app's scope, to watch the worker without being one of its windows.
    if (path === '/outside.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>outside</title>');
      return;
    }
    if (!path.startsWith('/nigiri/') || path.includes('..')) {
      res.writeHead(404);
      res.end();
      return;
    }
    const rel = path.slice('/nigiri/'.length) || 'index.html';
    readFile(join(dir, rel), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(data);
    });
  });
  return new Promise((done) => server.listen(PORT, () => done(server)));
}

const buildOf = (page: Page) => page.evaluate(() => document.documentElement.dataset.build);

test('J7: a new version waits until every window has closed, then runs on the next launch', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Once is enough: it builds the app twice.');
  test.setTimeout(240_000);
  const dir = testInfo.outputPath('dist');
  build('A', dir);
  const server = await serve(dir);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    // Version A installs and takes control from the second load.
    const page = await context.newPage();
    await page.goto(APP);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    expect(await buildOf(page)).toBe('A');
    await expect(page.getByRole('heading', { name: 'Make your first deck' })).toBeVisible();

    // Publish version B while the app is open.
    build('B', dir);

    // A reload finds B, which installs and waits. The page still runs A: nothing changes mid-session.
    await page.reload();
    await expect
      .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state ?? 'none'), { timeout: 60_000 })
      .toBe('installed');
    expect(await buildOf(page)).toBe('A');
    await page.reload();
    expect(await buildOf(page)).toBe('A');
    await expect(page.getByRole('heading', { name: 'Make your first deck' })).toBeVisible();

    // Close every Nigiri window. With no window left, the browser lets B take over.
    await page.close();
    const outside = await context.newPage();
    await outside.goto(`${ORIGIN}/outside.html`);
    await expect
      .poll(
        () =>
          outside.evaluate(async () => {
            const reg = await navigator.serviceWorker.getRegistration('/nigiri/');
            return reg && !reg.waiting && reg.active?.state === 'activated' ? 'activated' : 'waiting';
          }),
        { timeout: 30_000 },
      )
      .toBe('activated');

    // The next launch runs B.
    const next = await context.newPage();
    await next.goto(APP);
    await expect(next.locator('html')).toHaveAttribute('data-build', 'B');
    await expect(next.getByRole('heading', { name: 'Make your first deck' })).toBeVisible();
  } finally {
    await context.close();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
