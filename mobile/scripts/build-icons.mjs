/**
 * From mobile/: npm install --prefix /tmp/anistream-icon-tools sharp@0.34.5
 * node scripts/build-icons.mjs /tmp/anistream-icon-tools/node_modules/sharp
 * Rasterizes the SVG sources without adding a dependency to the app.
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = async (name) => readFile(path.join(root, 'assets/brand', `${name}.svg`));
for (const [name, svg, size, opaque] of [
  ['icon', 'icon', 1024, true],
  ['android-icon-foreground', 'mark', 1024, false],
  ['android-icon-background', 'background', 1024, true],
  ['android-icon-monochrome', 'mark', 1024, false],
  ['splash-icon', 'mark', 1024, false],
  ['favicon', 'icon', 48, true],
]) {
  let image = sharp(await source(svg)).resize(size, size);
  if (opaque) image = image.removeAlpha();
  await image.png().toFile(path.join(root, 'assets/images', `${name}.png`));
}
