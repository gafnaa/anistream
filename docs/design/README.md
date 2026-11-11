# AniStream mobile design

The shared Figcraft session contains the page **AniStream / Mobile & foundations**.
The `.figcraft` file is an editable backup with 32 screen/state compositions, 26 theme variables (Dark and AMOLED), seven text styles, native component masters, vector icons, six source images, and prototype navigation.

## Contents
- Foundations: semantic palette, rose ramp, type scale, spacing and radii.
- Library: shadcn-style Button, Badge, Input, Switch, cards, navigation, Skeleton, Alert and Toast; separate interaction-state atoms.
- Screens: five tabs, home continuations, detail/episodes, portrait and landscape player, onboarding/splash, search states, genre catalogue, filters, optional schedule, settings/storage/about, server sheet, destructive dialog, empty/offline/not-found/loading states.
- `tokens.json`: implementation values.
- PNG exports: visual references at 1×.
- `SOURCES.md`: asset provenance. Icon and font files include their original licenses.

## Behavior notes
This is a design and navigation prototype; it does not play video or fetch live catalogue data. Stats, titles, episode dates and progress are representative sample content. Schedule remains conditional on the backend endpoint. The saved font families are Plus Jakarta Sans and Inter; load the included font files if opening the design in another Figcraft instance that does not have them.
The primary browse/detail/watch and tab journeys are linked. Scroll, persistence, server fallback, filtering and destructive actions are specified visually for implementation.


Downloads: four new screen/state compositions, entry from My Space and anime detail, quality sheet, queue progress, pause/retry states and ready-to-watch offline episodes. See DOWNLOADS.md.

## In this repo
- `screens/*.png`: the exported compositions, used as the visual reference for implementation.
- The `.figcraft` backup (about 4.6 MB) is not committed. Ask the maintainer for it if you need to edit the design.
