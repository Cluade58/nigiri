// Draws Nigiri's home-screen icon and writes it to public/ (D53: manifest icons and the apple-touch-icon).
// The mark is a nigiri in Snow's tokens: rice (the sheet white), the topping in cobalt, the band in ink,
// on Snow's page colour. Rasterized with the Puppeteer the screenshot tool already installs; no new package.
//
// Usage: node tools/icons.mjs
import puppeteer from 'puppeteer';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const PAGE = '#F5F7FC';
const INK = '#17243C';
const COBALT = '#3158C9';
const WHITE = '#FFFFFF';

/** The mark in a 512 box, centred on 256,256. `scale` shrinks it for the maskable safe zone. */
function mark(scale = 1) {
  return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)" stroke-linejoin="round">
    <rect x="116" y="237" width="280" height="120" rx="56" fill="${WHITE}" stroke="${INK}" stroke-width="14"/>
    <rect x="96" y="155" width="320" height="112" rx="56" fill="${COBALT}" stroke="${INK}" stroke-width="14"/>
    <rect x="226" y="147" width="60" height="218" rx="8" fill="${INK}"/>
  </g>`;
}

/** Full-bleed square: the phone rounds or masks the corners itself. */
const square = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${PAGE}"/>${mark(scale)}</svg>`;

/** The browser-tab icon keeps its own rounded corners. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="${PAGE}"/>${mark(1.3)}</svg>\n`;

const out = path.resolve('public');
writeFileSync(path.join(out, 'favicon.svg'), favicon);

const targets = [
  { file: 'pwa-192.png', size: 192, svg: square(1.2) },
  { file: 'pwa-512.png', size: 512, svg: square(1.2) },
  // Maskable: everything inside the central 80% circle, so any mask shape keeps the whole mark.
  { file: 'pwa-maskable-512.png', size: 512, svg: square(1) },
  { file: 'apple-touch-icon.png', size: 180, svg: square(1.1) },
];

const browser = await puppeteer.launch({ headless: 'shell' });
try {
  const page = await browser.newPage();
  for (const { file, size, svg } of targets) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: path.join(out, file), clip: { x: 0, y: 0, width: size, height: size }, omitBackground: false });
    console.log(`wrote public/${file} (${size}x${size})`);
  }
} finally {
  await browser.close();
}
console.log('wrote public/favicon.svg');
