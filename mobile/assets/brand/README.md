# AniStream icon v3

A red gradient "A" with a play-triangle counter on a black field, supplied by the owner as `icon.svg`.

`icon.svg` is the full launcher icon. `background.svg` is the opaque black adaptive background. `mark.svg` is the same A without the black field, scaled to 62% about the centre so that it stays inside the adaptive-icon safe zone. `monochrome.svg` is a white silhouette of the A at that scale, used for themed icons.

From `mobile/`, rasterize the six app PNGs with headless Chromium. librsvg/sharp cannot render the icon's `feImage` glow filter.

```sh
node scripts/build-icons.mjs <path-to-playwright> [chromium-executable]
```

The `concepts/` folder holds earlier v2 explorations and is kept for history only.
