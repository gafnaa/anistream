# In-app update verification

Verified on 2026-11-12 with a 390 × 844 Playwright viewport, the Expo production web export served by `npx expo serve`, and mocked API responses. The 9.9.0 version and release notes in screenshots are verification fixtures.

- `startup-dialog.png`: automatic prompt after onboarding.
- `about-latest.png`: manual check with a release matching the installed version (0.4.0).
- `about-dialog.png`: manual check reopens 9.9.0 despite its saved dismissal.

## Checks

- `npx tsc --noEmit`, `npm run lint`, `npm run test:downloads` (7 tests), `npm run test:update` (2 tests): passed.
- `npx expo install --check`: dependencies up to date.
- `npx -y expo-doctor@1.21.6`: 20/20 checks passed.
- Web production export and Android JS export: passed.
- `node --test server/tests/*.test.js`: 11 tests passed.
- Real API on port 5199, authenticated through the host's existing `gh` session: latest returned `version: 0.4.0`, `tag: v0.4.0`, `size: 20476590`, `apkUrl: /api/app/apk` and release notes/publication time. Full APK returned 200, `Content-Type: application/vnd.android.package-archive`, attachment filename `anistream-v0.4.0.apk`, and 20,476,590 bytes. `Range: bytes=0-31` returned 206, `Content-Range: bytes 0-31/20476590`, and 32 bytes.
- Funnel-marked request without the API key: 401 JSON `{"error":"Unauthorized"}`.
- Playwright: automatic prompt, dismissal across reload, manual check bypassing dismissal, latest state, disabled checking state, check failure and retry, failed browser opening and fallback URL, Escape dismissal, English translation, and no horizontal overflow. No uncaught page errors.

## Device limitation

The Android emulator could not boot: “Failed to allocate an emulator port for SimasterAPI36.” Its `avdmanager` requires JDK 17 but detected Java 8. Native download progress, Android unknown-source permission handling, and package installation were therefore not exercised on a device. The Android JS bundle, native module types, dependency compatibility, permission configuration, and installer intent parameters were checked. A newly built APK is required to include the native intent-launcher dependency and install permission.

## Design delivery gate

Direction: existing AniStream settings and RemovalDialog; ENERGY 1 / RHYTHM 1 / MOTION 1. Solid surface and 14 dp sheet radius establish modal hierarchy; crimson identifies the update action. Existing Inter/Plus Jakarta Sans typography, dark background, and spacing tokens preserve the app's identity. No new artwork or decorative effects.

| Gate | Result and evidence |
| --- | --- |
| R-02 | PASS: authored UI copy has no em dash. |
| R-03 | PASS: 390 px screenshots and DOM overflow assertion. |
| R-17, R-18, R-36, R-38 | PASS: no marketing claims or testimonials; fixture release notes explicitly identified above. |
| R-23, R-24 | PASS: existing icon/navigation retained; no assets or routes invented. |
| R-25 | PASS: existing tokens; primary text/surface 16.1:1, muted text/surface 6.4:1, white/crimson 4.7:1. |
| R-26 | PASS: check, update, fallback, later and Escape exercised in Playwright; native installation limitation recorded above. |
| R-27 | PASS: checking, latest, absent release notes, storage and network error states implemented; checking/latest/network error exercised. |
| R-28 | PASS: no FAQ added. |
| R-32 | PASS: shared alert-dialog focus handling; keyboard Escape exercised; existing Button focus-visible styles retained. |
| R-33 | PASS: implementation resides in committed TypeScript/JavaScript source. |
| R-34 | PASS: existing dark theme retained; no theme control added. |
| R-35 | PASS: production web run and click-through, screenshots, Android JS bundle and automated checks recorded above. |
| R-37 | PASS: design read and dials declared before implementation. |
| R-39 | PASS: native named buttons, disabled download/check states, progress accessibility values, live status/error text, shared focus/reduced-motion behavior. |
| R-40 | PASS: existing icon has explicit dimensions; no new media or performance claims. |
| R-01, R-04, R-06–R-10, R-12–R-14, R-19, R-22 | PASS: no new decorative technique; shared modal elevation, fonts and motion serve hierarchy and consistency. |
| Liveliness | PASS: title/action focal point, 24 dp spacing separates metadata/notes/actions; existing crimson accent and type identity; screenshots match declared dials. |
| C-1–C-5, R-05, R-11, R-15, R-16, R-20, R-21, R-29–R-31 | PASS: existing product composition/tokens, distinct sheet/button radii, specific action labels, real behaviors and explicit error states; screenshots reviewed. |
