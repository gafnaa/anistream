# v0.6.3 verification

Verified on 2026-11-13 with Chromium headless / Playwright at 400 × 860, using
`EXPO_PUBLIC_API_URL=http://127.0.0.1:5178`. API requests used live responses with
CORS headers added through `page.route`; the API service was left running.

- `cd mobile && npx tsc --noEmit && npm run lint` passed.
- `npm run test:api`, `npm run test:downloads`, and `npm run test:update` passed (11 tests).
- Expo web export and Android Hermes bundle export passed.
- Touch-dragging shows both neighbouring pages before release (`tab-mid-drag.png`).
  Adjacent swipe, short swipe snap-back, reverse swipe, vertical scrolling,
  hero swipe exclusion, tab taps and browser Back passed.
- The hero stops advancing while held and advances after release. Reduce Motion
  disables hero autoplay; tab navigation still works.
- Profile identity persisted across page reloads. Me and Settings share the
  same local identity, including the My List empty state.
- Selecting Rating issued `/api/browse?genre=action&status=&order=rating&page=1`.
- No browser runtime errors occurred during screenshot and interaction checks.

## Source capabilities

Inspected `https://samehadaku.li/anime/`. Its sort options include `order=rating`.
There is no separate score threshold filter. The `article.bs` catalogue cards
contain no numeric rating; numeric scores are in sidebar rankings instead.
Accordingly this release adds rating sorting without inventing card scores or
issuing a detail request for every poster. No server changes were needed.

## Native limitation

The listed Android emulator could not boot: `Failed to allocate an emulator port
for SimasterAPI36`. Device tooling also reported that `avdmanager` requires JDK 17
but detected JDK 8. Native Android gesture arbitration, frame rate and blur still
need a device check; web interaction and Android bundling do not prove those.

## Screenshots

- [Catalogue](catalogue.png)
- [Action genre](genre.png)
- [Rating selected](genre-rating.png)
- [Home hero](home.png)
- [Me](me.png)
- [Tab during drag](tab-mid-drag.png)
