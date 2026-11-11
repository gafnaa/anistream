# AniStream icon v2

The selected **layered play** mark offsets a cyan pane behind a rounded violet play frame. The small highlight separates the panes, and the open aperture keeps playback readable at 48 px. A dark violet/blue/pink field supplies depth without competing with the mark. All geometry is original SVG artwork.

`icon.svg` combines the background and colour mark. `background.svg` is the opaque adaptive background; `mark.svg` is transparent with a true aperture. `monochrome.svg` is a separate white silhouette, retaining the pane offset and aperture without gradients. The foreground's nontransparent bounds are x=275–787, y=231–758 on a 1024 canvas, inside the central 66% safe zone.

The three complete concept SVGs are retained in `concepts/`:

- `01-layered-play.svg`: the selected direction, before the final transparent-aperture refinement.
- `02-ribbon-monogram.svg`: rounded A with a cyan fold; retains more of the previous monogram identity.
- `03-anime-aperture.svg`: asymmetric pink star with a play aperture; stronger anime motif, weaker playback silhouette.

From `mobile/`, using the external Sharp installation already available on this host:

```sh
node scripts/build-icons.mjs /tmp/anistream-icon-tools/node_modules/sharp
node scripts/preview-icons.mjs /tmp/anistream-icon-tools/node_modules/sharp /tmp
```

The build writes the six app PNGs. The preview script writes `/tmp/icon-v2-concepts.png` and `/tmp/icon-v2-final.png`; preview sheets are not app assets and are not committed. The 1024 and 48 px comparison tiles are rasterized at their labelled sizes, with both launcher masks on light and dark wallpapers. The final sheet adds 192 px, themed monochrome and the configured splash size.
