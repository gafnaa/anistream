# PRD — AniStream Mobile (React Native)

| | |
|---|---|
| Status | Draft v0.1 — for review |
| Date | 2026-11-11 |
| Owner | @gafnaa |
| Predecessor | Web prototype in this repo (`src/`, `server/`) |

---

## 1. Summary

AniStream Mobile is a native Android/iOS app for browsing and watching anime with
Indonesian subtitles. Catalogue data and video sources come from samehadaku via
the **existing AniStream API** (`server/`) in this repo. The web prototype has
already proven the data flow and playback. This project ports the experience to
React Native while keeping all scraping and stream resolution on the server.

## 2. Goals and non-goals

### Goals
1. Feature parity with the web prototype: home, browse, search, series detail, watch, library.
2. Reliable playback of both mirror types: HLS streams in a native player, and Blogger embeds in a WebView.
3. Fast, native-feeling UI: cached lists, smooth scrolling, fullscreen landscape playback.
4. One codebase for Android and iOS. Android is the primary target.

### Non-goals (v1)
- User accounts, cloud sync, comments, ratings.
- Offline downloads.
- Push notifications for new episodes. This is a v2 candidate, see §9.
- Running the scraper on the device. The scraper stays server-side.
- Publishing to the Play Store or App Store. v1 ships as sideloaded builds (APK or Expo dev build).

## 3. Users

- **Primary:** Indonesian-speaking anime viewers who currently use samehadaku in a
  mobile browser and put up with ads, pop-ups, and a desktop-first layout.
- **Core job:** "Find the new episode of the show I follow and start watching it in two taps."

## 4. Architecture

```
┌────────────────────┐   HTTPS/JSON   ┌──────────────────────┐   HTML/HLS   ┌────────────┐
│ React Native app   │ ─────────────▶ │ AniStream API        │ ───────────▶ │ samehadaku │
│ (mobile/, Expo)    │ ◀───────────── │ (server/, Express)   │ ◀─────────── │ + mirrors  │
└────────────────────┘                └──────────────────────┘              └────────────┘
```

- **Repo layout:** the app lives in a new `mobile/` folder. `server/` and the web `src/` stay where they are.
- **Backend:** reuse the existing endpoints unchanged (see `docs/BACKEND.md` → API). The app
  reads the base URL from `EXPO_PUBLIC_API_URL`. The default is the tailnet URL
  `https://waf-server.tail1ec650.ts.net:5175`.
- **Why the scraper stays on the server:** the site sits behind a WAF that needs browser-like
  headers, its markup changes often, and a server fix reaches every installed app
  at once without an app update.
- **HLS:** play through `/api/hls` (the proxy) by default. Native players aren't bound by
  CORS, so direct playback with `Referer` headers might work. Treat that as an
  optimisation to investigate (§10), not a v1 requirement.

### Proposed stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Expo (current SDK), TypeScript | Managed native builds, OTA updates, dev client |
| Navigation | Expo Router (file-based) | Mirrors the web routes 1:1 |
| Data fetching | TanStack Query | Caching, pagination, retry, pull-to-refresh |
| Video (HLS/MP4) | `expo-video` | Native ExoPlayer/AVPlayer, fullscreen, PiP |
| Iframe mirrors | `react-native-webview` | Blogger player has no extractable manifest |
| Local storage | `@react-native-async-storage/async-storage` | Watchlist and history; same shape as the web `storage.js` |
| Images | `expo-image` | Disk cache for posters |
| Lists | `@shopify/flash-list` | Long episode lists and grids |

## 5. Functional requirements

Priority: **P0** = required for v1, **P1** = should ship in v1, **P2** = later.

### 5.1 Home — `/(tabs)/index`
- P0: Trending carousel, an "Ongoing" horizontal rail, and a grid of the latest episodes (`GET /api/home`).
- P0: Infinite scroll on the latest grid (`GET /api/latest?page=`).
- P0: Pull to refresh.
- P1: A "Continue watching" rail built from local history.

### 5.2 Browse — `/(tabs)/browse`
- P0: Filters for status (ongoing/completed/upcoming), type, and order (`GET /api/browse`).
- P1: Genre filter.
- P0: Paginated grid.

### 5.3 Search — `/(tabs)/search`
- P0: Search runs 300 ms after the user stops typing (`GET /api/search?q=`), with an empty state and a no-results state.
- P2: Recent searches, stored locally.

### 5.4 Series detail — `/series/[slug]`
- P0: Poster, title, metadata, genres, synopsis, and episode list (`GET /api/series/:slug`).
- P0: Watchlist toggle.
- P0: The episode list marks watched episodes and highlights the last-watched episode.
- P1: Sort the episode list ascending or descending.

### 5.5 Watch — `/watch/[slug]`
- P0: Fetch the episode (`GET /api/episode/:slug`), then resolve the selected mirror (`GET /api/resolve`).
- P0: `hls` / `mp4` → `expo-video` with native controls. `iframe` → WebView, with pop-ups and navigation away blocked.
- P0: A server switcher. If a mirror errors or stalls for 15 s, switch to the next mirror automatically.
- P0: Previous and next episode buttons, plus the full episode list below the player.
- P0: Fullscreen locks the screen to landscape. Exiting returns to portrait.
- P0: Save playback position every 5 s and when the user leaves the screen. Resume from that position on return.
- P1: Picture-in-picture on Android and iOS, HLS only.
- P2: Quality picker (the HLS ladder is 480/720/1080).

### 5.6 Library — `/(tabs)/library`
- P0: A "Continue watching" list showing progress, and the saved watchlist.
- P0: Remove items from either list.

### 5.7 Cross-cutting
- P0: Dark theme with the same palette as the web prototype.
- P0: Error states with retry on every screen that loads data. Offline banner.
- P1: Shared links: `anistream://series/<slug>` and `anistream://watch/<slug>`.
- P1: Settings screen with an API base URL override, for pointing at a dev server.

## 6. Non-functional requirements

| Area | Target |
|---|---|
| Cold start to interactive Home | < 2.5 s on a mid-range Android device (cache warm on the server) |
| Tap episode to first frame | < 4 s on HLS mirrors |
| Scrolling | 60 fps on the latest-episode grid of 200+ items |
| Crash-free sessions | ≥ 99% |
| Minimum OS | Android 8 (API 26), iOS 15 |
| Accessibility | Labelled touch targets ≥ 44 pt; scales with the system font size |

## 7. Data model (local)

Same shape as the web `src/storage.js`, so a later sync feature can merge the two.

```ts
type Bookmark = { slug: string; title: string; poster: string; addedAt: number };
type HistoryItem = {
  episodeSlug: string; seriesSlug: string; title: string; episode: string;
  poster: string; position: number; duration: number; updatedAt: number;
};
// keys: anistream.bookmarks.v1, anistream.history.v1
```

## 8. Milestones

Each milestone is one or more PRs (see AGENTS.md → Git workflow).

| # | Milestone | Done when |
|---|---|---|
| M0 | Docs: this PRD, AGENTS.md, the project skill | Merged |
| M1 | Scaffold `mobile/` (Expo + TS + Router + Query), theme, tab shell, typed API client | App boots on Android showing 4 empty tabs |
| M2 | Home, Browse, Search with real data | All three render live data and paginate |
| M3 | Series detail and local storage (watchlist, history) | Watchlist persists across restarts |
| M4 | Watch screen: expo-video + WebView mirrors, fallback, resume, fullscreen | HLS and iframe episodes both play; resume works |
| M5 | Polish: errors/offline, deep links, settings, icons/splash, Android APK build | Installable APK reviewed on a real phone |

## 9. Future (v2+)
- Push notifications for new episodes of watchlisted shows (server cron + Expo push).
- Offline downloads (HLS → local MP4, which depends on the mirror).
- Account sync between web and mobile.
- Persistent server deployment: a systemd unit, then a public host with auth or rate limiting.

## 10. Risks and open questions

| Risk / question | Impact | Mitigation |
|---|---|---|
| samehadaku markup or domain changes | Data breaks | All parsing stays in `server/scraper.js`; fix it once on the server |
| Mirrors are flaky or disappear | Playback fails | Server switcher + automatic fallback; iframe as a last resort |
| API is only reachable on the tailnet | App doesn't work off-tailnet | Acceptable for the review phase; deciding on public hosting is open |
| Can `expo-video` play the CDN stream directly with a `Referer` header? | Cuts load on the proxy | Spike during M4; keep the proxy as the default |
| Blogger WebView may show ads or redirects | Poor experience | Block navigation via `onShouldStartLoadWithRequest`; allowlist hosts |
| Content rights | Store rejection, takedown | Sideload only; the app hosts nothing. Revisit before any public release |
| Server process doesn't survive a reboot | Downtime | Add a systemd unit (tracked separately) |
