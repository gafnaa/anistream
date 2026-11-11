/** Run after build-icons.mjs; previews are written outside the repository. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || 'sharp');
const root = fileURLToPath(new URL('../assets/', import.meta.url));
const output = process.argv[3] || '/tmp';
const label = (text, color = '#EEF1F7', width = 1100) => Buffer.from(
  `<svg width="${width}" height="60"><text x="20" y="40" font-size="28" font-family="sans-serif" fill="${color}">${text}</text></svg>`);
const masked = async (source, size, circle) => {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * (circle ? 0.5 : 0.23)}" fill="white"/></svg>`);
  const png = await sharp(source).resize(size, size).png().toBuffer();
  return sharp(png).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
};
const tile = async (width, height, background) => sharp({ create: { width, height, channels: 3, background } }).png().toBuffer();
const concepts = (await readdir(path.join(root, 'brand/concepts'))).filter(name => name.endsWith('.svg')).sort();
const layers = [];
for (let row = 0; row < 4; row++) {
  const dark = row >= 2;
  const circle = row % 2 === 1;
  for (let col = 0; col < concepts.length; col++) {
    const left = col * 1120;
    const top = row * 1200;
    const source = path.join(root, 'brand/concepts', concepts[col]);
    layers.push({ input: await tile(1120, 1200, dark ? '#0B0D12' : '#E5EAF3'), left, top });
    layers.push({ input: label(`${col + 1}. ${['Layered play', 'Ribbon monogram', 'Anime aperture'][col]} / ${dark ? 'dark' : 'light'} ${circle ? 'circle' : 'squircle'}`, dark ? '#EEF1F7' : '#152039'), left, top: top + 8 });
    layers.push({ input: await masked(source, 1024, circle), left: left + 48, top: top + 80 });
    layers.push({ input: await masked(source, 48, circle), left: left + 48, top: top + 1120 });
    layers.push({ input: label('1024 px above / 48 px at left', dark ? '#A0A9BD' : '#3C4963', 850), left: left + 100, top: top + 1110 });
  }
}
await sharp({ create: { width: 3360, height: 4800, channels: 3, background: '#0B0D12' } }).composite(layers).png().toFile(path.join(output, 'icon-v2-concepts.png'));

const final = [];
const icon = path.join(root, 'images/icon.png');
for (let col = 0; col < 2; col++) {
  const dark = col === 1;
  for (let row = 0; row < 2; row++) {
    const left = col * 1120;
    const top = row * 1200;
    final.push({ input: await tile(1120, 1200, dark ? '#0B0D12' : '#E5EAF3'), left, top });
    final.push({ input: label(`1024 px / ${dark ? 'dark' : 'light'} / ${row ? 'circle' : 'squircle'}`, dark ? '#EEF1F7' : '#152039'), left, top });
    final.push({ input: await masked(icon, 1024, row === 1), left: left + 48, top: top + 80 });
  }
}
for (let row = 0; row < 2; row++) {
  const top = row * 600;
  const dark = row === 1;
  final.push({ input: await tile(1120, 600, dark ? '#0B0D12' : '#E5EAF3'), left: 2240, top });
  final.push({ input: label(`192 px / 48 px / ${dark ? 'dark' : 'light'}`, dark ? '#EEF1F7' : '#152039'), left: 2240, top });
  for (let circle = 0; circle < 2; circle++) {
    final.push({ input: await masked(icon, 192, !!circle), left: 2300 + circle * 420, top: top + 100 });
    final.push({ input: await masked(icon, 48, !!circle), left: 2520 + circle * 420, top: top + 172 });
  }
}
final.push({ input: label('Themed monochrome / 192 px + 48 px'), left: 2240, top: 1240 });
for (let i = 0; i < 2; i++) {
  const size = i ? 48 : 192;
  const silhouette = await sharp(path.join(root, 'images/android-icon-monochrome.png')).resize(size, size).tint('#CDBBFF').png().toBuffer();
  const themed = await sharp({ create: { width: size, height: size, channels: 4, background: '#2B1D5C' } }).composite([{ input: silhouette }]).png().toBuffer();
  final.push({ input: await masked(themed, size, false), left: 2300 + i * 260, top: 1340 });
}
final.push({ input: label('Splash / #0B0D12 / configured 160 dp'), left: 2240, top: 1700 });
final.push({ input: await sharp(path.join(root, 'images/splash-icon.png')).resize(160, 160).png().toBuffer(), left: 2700, top: 1860 });
await sharp({ create: { width: 3360, height: 2400, channels: 3, background: '#0B0D12' } }).composite(final).png().toFile(path.join(output, 'icon-v2-final.png'));
console.log(`Preview sheets: ${output}/icon-v2-concepts.png, ${output}/icon-v2-final.png`);
