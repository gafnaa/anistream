import { brandRamp, tones, gradients, genreGradients } from '../src/theme/palette.ts';

const rgb = hex => hex.slice(1).match(/../g).slice(0, 3).map(v => parseInt(v, 16));
const luminance = rgb => rgb.map(v => {
  const n = v / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const composite = (front, back, alpha) => front.map((v, i) => Math.round(v * alpha + back[i] * (1 - alpha)));
const check = (name, foreground, background) => {
  const value = ratio(foreground, background);
  console.log(`${name}: ${value.toFixed(2)}:1`);
  if (value < 4.5) throw new Error(`${name} fails AA`);
};
const text = rgb('#EEF1F7');
const muted = rgb('#8B93A7');
for (const surface of ['#0B0D12', '#12151D', '#171B25', '#1E2431', '#222838']) {
  check(`primary on ${surface}`, text, rgb(surface));
  check(`muted on ${surface}`, muted, rgb(surface));
}
check('primary on overlay', text, rgb('#2B3345'));
const glass = composite(rgb('#12151D'), rgb('#FFFFFF'), 0.9);
check('muted on glass over white', muted, glass);
check('primary on glass over white', text, glass);
for (const [name, tone] of Object.entries(tones)) {
  check(`${name} solid`, rgb('#0B0D12'), rgb(tone.solid));
  for (const surface of ['#0B0D12', '#12151D', '#222838', '#2B3345']) {
    check(`${name} subtle on ${surface}`, text, composite(rgb(tone.solid), rgb(surface), 31 / 255));
  }
}
// RGB gradients cannot exceed their brightest endpoint's luminance.
for (const [name, stops] of Object.entries({ ...gradients, ...genreGradients })) {
  for (const stop of stops) check(`${name} ${stop}`, text, rgb(stop));
}
console.log(`${Object.keys(brandRamp).length} ramp labels sit on bg (primary contrast checked above).`);
