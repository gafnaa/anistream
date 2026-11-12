# Skip controls verification

- Mobile: `npx tsc --noEmit`, `npm run lint`, `npm run test:downloads` (7 tests), `npm run test:update` (2 tests): passed.
- Server: `node --test server/tests/*.test.js` (15 tests): passed.
- `npx expo export --platform web`: passed. Served with `npx expo serve --port 5198`.
- Playwright Chromium headless shell, 390 × 844 viewport, Indonesian language. API responses and a 400-second solid-color WebM fixture were mocked; no anime footage is represented by these screenshots.
- Intro click: 160 → 243.3 seconds; ending: 325 → 350; recap: 25 → 40.
- Intro click also seeks with controls hidden. Empty intervals show the smaller fallback and advance 85 seconds. Iframe playback shows no skip controls.
- Screenshots: `intro.png`, `ending.png`, `recap.png`, `intro-hidden-controls.png`, `fallback.png`, `iframe.png`.

Live API smoke check on port 5199:

```sh
curl --get http://localhost:5199/api/skip \
  --data-urlencode 'title=Kikansha no Mahou wa Tokubetsu desu 2nd Season' \
  --data 'episode=5' --data 'duration=1470'
# {"malId":null,"intervals":[]}
```

AniList returned MAL id 57612. AniSkip returned `found:false`, empty results, and statusCode 404 for the supplied episode and duration (also with duration 0), so the previously reported 153–243 interval could not be reproduced live. Mocked intro boundaries use 153.3–243.3 seconds.

Native Android/iOS and real HLS playback were not exercised. Download metadata is wired to the same player, but offline skip data requires a previously cached query; otherwise the manual fallback is available.
