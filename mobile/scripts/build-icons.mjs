/**
 * From mobile/: node scripts/build-icons.mjs <path-to-playwright> [chromium-executable]
 * Rasterizes the SVG sources with headless Chromium (librsvg/sharp cannot
 * render the icon's feImage filter) without adding a dependency to the app.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = async (name) => readFile(path.join(root, 'assets/brand', `${name}.svg`), 'utf8');

const browser = await chromium.launch(process.argv[3] ? { executablePath: process.argv[3] } : {});
const page = await browser.newPage();
for (const [name, svg, size, opaque] of [
  ['icon', 'icon', 1024, true],
  ['android-icon-foreground', 'mark', 1024, false],
  ['android-icon-background', 'background', 1024, true],
  ['android-icon-monochrome', 'monochrome', 1024, false],
  ['splash-icon', 'mark', 1024, false],
  ['favicon', 'icon', 48, true],
]) {
  await page.setViewportSize({ width: size, height: size });
  const markup = (await source(svg)).replace(/width="256" height="256"/, `width="${size}" height="${size}"`);
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${markup}`);
  await page.screenshot({ path: path.join(root, 'assets/images', `${name}.png`), omitBackground: !opaque });
}
await browser.close();
