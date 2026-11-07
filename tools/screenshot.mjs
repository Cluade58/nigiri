// Screenshot a page at one or more viewports so designs can be reviewed and iterated on.
//
// Usage:
//   npm run shot -- <url-or-file> [options]
//
// Examples:
//   npm run shot -- mockups/home.html
//   npm run shot -- http://localhost:5173 --viewport all --full
//   npm run shot -- mockups/home.html --dark --name home-v2
//
// Options:
//   --viewport mobile|tablet|desktop|all   (default: mobile; comma lists work)
//   --full                                 capture the full scrollable page
//   --dark                                 emulate prefers-color-scheme: dark
//   --name <name>                          output file prefix (default: from target)
//   --out <dir>                            output folder (default: screenshots)
//   --wait <ms>                            extra wait after load, for animations/fonts (default: 300)
//   --keep                                 add a timestamp so earlier shots aren't overwritten

import puppeteer from 'puppeteer';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

function parseArgs(argv) {
  const opts = { viewport: 'mobile', out: 'screenshots', wait: 300 };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--full') opts.full = true;
    else if (a === '--dark') opts.dark = true;
    else if (a === '--keep') opts.keep = true;
    else if (['--viewport', '--name', '--out', '--wait'].includes(a)) opts[a.slice(2)] = argv[++i];
    else rest.push(a);
  }
  opts.target = rest[0];
  return opts;
}

function toUrl(target) {
  if (/^https?:\/\//i.test(target) || target.startsWith('file:')) return target;
  const abs = path.resolve(target);
  if (!existsSync(abs)) throw new Error(`File not found: ${abs}`);
  return pathToFileURL(abs).href;
}

function defaultName(target) {
  if (/^https?:\/\//i.test(target)) {
    const u = new URL(target);
    return (u.hostname + u.pathname).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'page';
  }
  return path.basename(target).replace(/\.[^.]+$/, '');
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.target) {
  console.error('Usage: npm run shot -- <url-or-file> [--viewport mobile|tablet|desktop|all] [--full] [--dark] [--name x]');
  process.exit(1);
}

const url = toUrl(opts.target);
const names = opts.viewport === 'all' ? Object.keys(VIEWPORTS) : opts.viewport.split(',');
for (const n of names) if (!VIEWPORTS[n]) throw new Error(`Unknown viewport "${n}". Use: ${Object.keys(VIEWPORTS).join(', ')}, all`);

const outDir = path.resolve(opts.out);
mkdirSync(outDir, { recursive: true });
const prefix = opts.name || defaultName(opts.target);
const stamp = opts.keep ? '-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) : '';

const browser = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
try {
  for (const vpName of names) {
    const page = await browser.newPage();
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warn') { problems++; console.log(`  [${vpName}] console.${m.type()}: ${m.text()}`); }
    });
    page.on('pageerror', (e) => { problems++; console.log(`  [${vpName}] page error: ${e.message}`); });
    page.on('requestfailed', (r) => { problems++; console.log(`  [${vpName}] failed request: ${r.url()}`); });

    await page.setViewport(VIEWPORTS[vpName]);
    if (opts.dark) await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluate(() => document.fonts?.ready);
    await new Promise((r) => setTimeout(r, Number(opts.wait)));

    // Flag horizontal overflow, a common mobile layout bug.
    // (clientWidth, not innerWidth: with mobile emulation innerWidth grows to fit wide content.)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) { problems++; console.log(`  [${vpName}] horizontal overflow: ${overflow}px wider than viewport`); }

    const file = path.join(outDir, `${prefix}-${vpName}${opts.dark ? '-dark' : ''}${stamp}.png`);
    await page.screenshot({ path: file, fullPage: !!opts.full });
    console.log(`saved ${path.relative(process.cwd(), file)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(problems ? `${problems} issue(s) reported above.` : 'No console errors, failed requests or overflow.');
