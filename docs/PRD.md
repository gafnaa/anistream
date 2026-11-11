# PRD — AniStream Mobile (React Native)

| | |
|---|---|
| Status | Draft v0.2: for review |
| Date | 2026-11-11 |
| Owner | @gafnaa |
| Predecessor | Web prototype in this repo (`src/`, `server/`) |
| Changes in v0.2 | Streaming-app information architecture (§5), new Design system & UX section (§6), skeleton loading, typography, updated milestones |

---

## 1. Summary

AniStream Mobile is a native Android/iOS app for browsing and watching anime with
Indonesian subtitles. Catalogue data and video sources come from samehadaku via
the **existing AniStream API** (`server/`) in this repo.

The app follows the layout patterns of mainstream video-streaming apps:

- a cinematic home screen with horizontal rows
- a hero banner
- a dedicated watch history
- browsing by genre
- a settings area

AniStream uses these as interaction patterns only. It has its own visual identity
(see §6), and copies no other service's branding, colours or assets.

## 2. Goals and non-goals

### Goals
1. A streaming-app experience. Opening the app shows something worth watching, and resuming takes one tap.
2. Reliable playback of both mirror types: HLS streams in a native player, and Blogger embeds in a WebView.
3. A UI that feels fast and polished:
   - skeleton loading, with no blank screens or bare spinners
   - smooth 60 fps scrolling
   - a professional type system
4. One codebase for Android and iOS. Android is the primary target.

### Non-goals (v1)
- User accounts, cloud sync, multiple profiles, comments, ratings.
- Push notifications. This is a v2 candidate, see §10.
- Running the scraper on the device. The scraper stays server-side.
- Publishing to the Play Store or App Store. v1 ships as a sideloaded APK through the release pipeline.

## 3. Users

- **Primary:** Indonesian-speaking anime viewers who currently use samehadaku in a
  mobile browser and put up with ads, pop-ups, and a desktop-first layout.
- **Core jobs:**
  1. "Continue the episode I was watching." This takes 1 tap from Home.
  2. "Watch the new episode of a show I follow." This takes 2 taps from Home.
  3. "Find something new in a genre I like." This takes 3 taps or fewer from Discover.

## 4. Architecture

```
┌────────────────────┐   HTTPS/JSON   ┌──────────────────────┐   HTML/HLS   ┌────────────┐
│ React Native app   │ ─────────────▶ │ AniStream API        │ ───────────▶ │ samehadaku │
│ (mobile/, Expo)    │ ◀───────────── │ (server/, Express)   │ ◀─────────── │ + mirrors  │
└────────────────────┘                └──────────────────────┘              └────────────┘
```

- **Repo layout:** the app lives in `mobile/`. `server/` and the web `src/` stay where they are.
- **Backend:** reuse the existing endpoints (see `docs/BACKEND.md` → API). The app
  reads the base URL from `EXPO_PUBLIC_API_URL`. The default is the tailnet URL
  `https://waf-server.tail1ec650.ts.net:5175`.
- **New endpoints needed** (server work, done in the milestone that needs it):
  - `GET /api/genres`: genre list with slugs, for Discover. Scraped from the site's genre filter.
  - `GET /api/schedule`: weekly release slots inferred from the last eight days of samehadaku RSS timestamps, for the New Episodes screen (M8).
- **Why the scraper stays on the server:** the site sits behind a WAF that needs browser-like
  headers, its markup changes often, and a server fix reaches every installed app
  at once without an app update.
- **HLS:** play through `/api/hls` (the proxy) by default. Native players aren't bound by
  CORS, so direct playback with `Referer` headers might work. Treat that as an
  optimisation to investigate (§11), not a v1 requirement.

### Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Expo SDK 58, TypeScript (strict) | Managed native builds, OTA updates, dev client |
| Navigation | Expo Router (file-based, `src/app/`) | Tabs plus stacks, deep links for free |
| Data fetching | TanStack Query | Caching, pagination, retry, pull-to-refresh, stale-while-revalidate |
| Video (HLS/MP4) | `expo-video` | Native ExoPlayer/AVPlayer, fullscreen, PiP |
| Iframe mirrors | `react-native-webview` | Blogger player has no extractable manifest |
| Local storage | `@react-native-async-storage/async-storage` | History, My List and settings; same shape as the web `storage.js` |
| Images | `expo-image` | Disk cache, blurhash or crossfade placeholders |
| Lists | `@shopify/flash-list` | Long grids and episode lists |
| Fonts | `expo-font` + `@expo-google-fonts/*` | Bundled at build time, no runtime download (§6.2) |
| Animation | `react-native-reanimated` (already installed) | Skeleton shimmer, hero parallax, press feedback on the UI thread |
| UI primitives | NativeWind 4.2.7 + Tailwind CSS 3 + react-native-reusables | shadcn-style native Button, Badge, Card, Separator, ToggleGroup and AlertDialog; existing layouts keep StyleSheet tokens |
| Gradients | `expo-linear-gradient` | Hero scrim and fades at row edges |
| Haptics | `expo-haptics` | Light feedback on key actions |

## 5. Information architecture and screens

### 5.1 Navigation map

```
Bottom tabs (always visible except in the player)
├── Home            /(tabs)/index
├── Discover        /(tabs)/discover      → Search (/search), Genre (/genre/[slug])
├── New             /(tabs)/new           (latest episodes + schedule)
├── History         /(tabs)/history
└── My Space        /(tabs)/me            → My List, Settings/*

Stacks pushed over the tabs
├── Series detail   /series/[slug]
├── Watch (player)  /watch/[slug]         (full screen, tabs hidden)
├── Genre results   /genre/[slug]
├── Search          /search               (modal-style; opens with the keyboard up)
└── Settings        /settings, /settings/playback, /settings/storage, /settings/about
```

Why five tabs: a mobile tab bar holds at most 5 items before targets get too small
(Hick's law and thumb reach). Each tab answers one question:
- **Home:** what should I watch?
- **Discover:** find a specific show or genre.
- **New:** what came out today?
- **History:** where was I?
- **My Space:** my list and preferences.

Priority: **P0** = required for v1, **P1** = should ship in v1, **P2** = later.

### 5.2 Home — `/(tabs)/index`
The main entry point. A vertical feed of horizontal rows under a hero.
- P0 **Hero banner**: a horizontally paged carousel of up to 5 trending titles, topped up with ongoing series. Full-bleed, top-biased cover art fills a banner at 67% of the viewport height. A bottom scrim carries title, genres, **▶ Play** (latest episode) and **+ My List**. It slides every 5 s, pauses during touch/drag or a confirmation, and resumes 3 s after release. Pause/resume and previous/next controls support keyboard operation; Reduce Motion disables automatic movement and image scale. Red pagination pills follow the scroll position without adding tab stops.
- P0 **Continue Watching** row (local history): landscape cards with a progress bar, `S1 · E12`, and the time left. It's hidden when empty. Long-press offers "Remove from row" and "Mark as watched".
- P0 Rows, each loaded on its own with its own skeleton:
  - **Trending Now**
  - **Ongoing Series**
  - **Latest Episodes**: landscape episode cards
  - **Completed Series**
- P1 **Because you watched _X_**: a genre-matched row, built from the genres of the user's history.
- P1 **Top genres**: rows for 2–3 popular genres (e.g. Action, Romance, Isekai).
- P0 A transparent app bar becomes solid as the user scrolls. It has a search icon that opens Search.
- P0 Pull to refresh. Rows show a skeleton the first time they load and cached data after that (§6.4).

### 5.3 Discover — `/(tabs)/discover`
Browse by intent rather than by URL.
- P0 A search field at the top. Tapping it opens Search (§5.4).
- P0 A **Genre grid**: 2-column tiles with the genre name over an artwork collage or a tinted gradient. Tapping one opens Genre results. Data: `GET /api/genres`.
- P0 Quick filters as chips: **Ongoing · Completed · Movie · TV · OVA**. They open the catalogue already filtered.
- P1 "Popular searches": the 8 most common queries, kept locally.

### 5.4 Search — `/search`
- P0 Results come in 300 ms after the user stops typing (`GET /api/search?q=`), shown as a 3-column poster grid.
- P0 States:
  - before typing: recent searches, removable
  - while loading: skeleton grid
  - no results: a message plus genre suggestions
  - error: retry button
- P1 Filter sheet: status, type, order (`GET /api/browse`).

### 5.5 Genre results — `/genre/[slug]`
- P0 A header with the genre name and the result count once known, then an infinite 3-column poster grid (`GET /api/browse?genre=`).
- P0 Sort: Latest update · A–Z · Popular, from the `order` param.
- P1 Status filter chips.

### 5.6 New — `/(tabs)/new`
- P0 **Latest episodes**: a list of the newest releases (`GET /api/latest`), grouped by **Today · Yesterday · This week**. Each row shows a thumbnail, series title, episode number and time since release.
- P1 **Schedule**: a day picker (Mon–Sun) listing the series airing that day. Uses `GET /api/schedule`; times are inferred upload slots in WIB.
- P1 Badge on episodes from series in My List.

### 5.7 History — `/(tabs)/history`
The user's watch history.
- P0 A list of episodes watched, newest first, grouped by day. Each row shows a thumbnail, series and episode, a progress bar, and "Watched 2 h ago".
- P0 Tapping a row resumes at the saved position. Tapping the series name opens Series detail.
- P0 Swipe left to remove one entry. "Clear history" in the header asks for confirmation.
- P0 Empty state: an illustration, the text "Nothing here yet", and a **Browse anime** button.
- P1 Toggle between **All episodes** and **By series**, which collapses to the latest episode per series.

### 5.8 My Space — `/(tabs)/me`
- P0 **My List**: a grid of saved series. Sort by date added or A–Z. Long-press to remove.
- P0 Quick stats: "Watched 128 episodes · 41 h". Computed locally.
- P0 Entry rows: Settings, About.

### 5.9 Series detail — `/series/[slug]`
- P0 A backdrop image with a gradient, the poster, title, and a meta line (status · type · year · episode count), plus genre chips that link to Genre results.
- P0 Main buttons: **▶ Play E1** or **▶ Resume E12 (14:20)** from history, and **+ My List**.
- P0 Synopsis clamped to 3 lines, with a "More" option.
- P0 Episode list:
  - watched episodes are marked, and the in-progress one shows a progress bar
  - sort ascending or descending
  - for 50+ episodes, a range picker in chunks (1–50, 51–100…)
- P1 A **More like this** row (same genre).
- P1 Share button that sends an `anistream://series/<slug>` link.

### 5.10 Watch — `/watch/[slug]`
- P0 Fetch the episode (`GET /api/episode/:slug`), then resolve the selected mirror (`GET /api/resolve`).
- P0 `hls`/`mp4` → `expo-video`; `iframe` → WebView, with pop-ups and navigation away blocked.
- P0 Custom controls overlay:
  - play/pause, a ±10 s double-tap seek zone, and a scrubber with time
  - server picker, previous/next episode, fullscreen
  - the controls auto-hide after 3 s
- P0 If a mirror errors or stalls for 15 s, switch to the next mirror automatically and show a toast ("Switched to HD-2").
- P0 Fullscreen locks the screen to landscape. Exiting returns to portrait.
- P0 Save the position every 5 s and when the user leaves the screen. Resume where they left off.
- P0 **Up next** card in the last 30 s, with a 10 s countdown before autoplaying the next episode. This can be turned off in Settings.
- P1 Picture-in-picture (HLS only). Keep the screen awake while playing.
- P2 Quality picker (480/720/1080), playback speed.

### 5.11 Settings — `/settings/*`
- P0 **Playback**:
  - autoplay next episode (on)
  - preferred server order
  - resume where I left off (on)
- P0 **Data & storage**:
  - clear image cache (shows its size)
  - clear watch history
  - clear search history
- P0 **About**:
  - app version and build number
  - a "Check for updates" link to GitHub Releases
  - open-source licenses
  - the disclaimer
- P1 **Language**: Bahasa Indonesia / English. Defaults to the device language. All copy goes through an i18n layer from day one.
- P1 **Appearance**: dark (default) or AMOLED black.
- P1 **Developer**, hidden until the version number is tapped 7 times: API base URL override, and an option to show the network inspector.

### 5.12 First run and system screens
- P0 **Splash**: brand mark on the background colour, through `expo-splash-screen`. It stays up until fonts and cached data are ready, so there's no flash of unstyled text.
- P1 **Onboarding**, one screen, can be skipped: "Pick genres you like" chips. These seed the "Top genres" rows on Home.
- P0 **Offline** banner across the app, plus a full-screen "No connection" state with retry on screens that have no cached data.
- P0 **Not found / error** screen for bad deep links.

## 6. Design system and UX principles

> **Visual source of truth (v0.3): [`docs/design/`](design/README.md).** The screen PNGs in `docs/design/screens/` and `docs/design/tokens.json` override the colours, sizes and layouts below wherever they differ. The app icon is unchanged. Downloads (`docs/design/DOWNLOADS.md`) are scheduled in M9 and the schedule tab in M8.

### 6.1 Visual identity
- Dark-first, cinematic. Content (artwork) is the hero and the UI chrome recedes.
- Colour tokens, derived from the web prototype so both clients feel related:

| Token | Value | Use |
|---|---|---|
| `bg` | `#0B0D12` | App background |
| `surface` | `#13151C` | Sheets, fallback material |
| `card` | `#1A1C24` | Cards, skeleton base |
| `card-2` | `#23262F` | Pressed states, skeleton highlight |
| `line` | `#2E323D` | Dividers |
| `text` | `#EEF1F7` | Primary text |
| `text-muted` | `#9299AD` | Secondary text (6.83:1 on `bg`, 5.98:1 on `card`) |
| `brand` | `#F43F5E` | Rose red progress bars, active tab, focus rings, icons |
| `brand-strong` | `#E11D48` | Crimson primary button fill; white labels are 4.70:1 |
| `brand-2` | `#FB923C` | Warm orange companion for artwork and gradients |
| `accent` | `#FDA4AF` | "NEW" badges, live or airing markers |


| `brand-50 … brand-900` | `#FFF1F2`, `#FFE4E6`, `#FECDD3`, `#FDA4AF`, `#FB7185`, `#F43F5E`, `#E11D48`, `#BE123C`, `#9F1239`, `#881337` | Red tonal ramp; labels sit outside swatches |
| `elevated` / `overlay` | `#242630` / `#2C2F3A` | Raised surfaces |
| `glass` | `rgba(19,21,28,0.92)` | Contrast floor above blurred tab material |
| `tones.cyan` | `#22D3EE` / `#22D3EE1F` | Airing; solid / subtle |
| `tones.amber` | `#FBBF24` / `#FBBF241F` | Watching; solid / subtle |
| `tones.pink` | `#FDA4AF` / `#FDA4AF1F` | New episode; solid / subtle |
| `tones.green` | `#4ADE80` / `#4ADE801F` | Completed; solid / subtle |
| `gradients.brand` | `#9F1239 → #8C3D16` | Crimson to burnt orange |
| `gradients.sunset` | `#9B234C → #805500` | Pink to amber |
| `gradients.ocean` | `#16449A → #076477` | Blue to cyan |
| `gradients.aurora` | `#7F1D35 → #744314` | Wine to warm amber |
| `gradients.heroScrim` | `#0B0D1200 → #0B0D12` | Artwork fade; place text only over the opaque end |
| `genreGradients` | Action `#922C4D → #6F251C`; Romance `#8D285C → #682B35`; Comedy `#785300 → #764128`; Fantasy `#7F3040 → #214B71`; Sci-Fi `#2447A0 → #076477`; Horror `#582B39 → #24202A`; Slice of Life `#24634E → #33515E`; Sports `#744314 → #853B39` | Distinct genre tiles with dark endpoints for readable labels |

- Floating navbar: 60 dp icon-only pill, 16 dp horizontal margins, 12 dp above the bottom safe area. Each tab retains an accessible name and a 48 dp target. Filled active icons and a soft red indicator distinguish selection from muted outline icons. Glass is limited to navigation so artwork remains dominant. A 230 ms ease-out indicator tracks selection, with no transition under Reduce Motion. Scroll containers use `useTabBarInset()` to keep final items reachable.
- Material uses guarded iOS Liquid Glass, otherwise BlurView. Android scenes supply a BlurTargetView; `dimezisBlurViewSdk31Plus` avoids expensive older Android blur and retains the dark fill fallback.
- Contrast: the glass tint over white gives muted labels **5.18:1** and primary labels **13.02:1** before dark blur tint. Primary text on `overlay` is **11.79:1**. Subtle chips use primary labels and solid chips use `bg` labels. All gradient labels use `text`; see the contrast audit in the PR for endpoint and chip measurements. Tonal-ramp labels sit on `bg`, never directly on the ramp.
- Dark shadcn CSS variables in `mobile/global.css` mirror the JS palette. Primary/destructive fills use crimson with white labels; foreground, card, popover, secondary, muted, accent, border, input and ring tokens drive the reusables primitives. The glass indicator identifies navigation selection; gradients distinguish artwork from controls, and the icon's layered play mark retains its silhouette in rose and orange.

- Radius: 6 (chips), 10 (cards), 14 (sheets). Spacing on a 4 pt grid: 4, 8, 12, 16, 24, 32.
- Poster ratio is **2:3**, and episode or continue-watching cards are **16:9**. Every image keeps its box size while loading, so the layout never shifts.

### 6.2 Typography
Two professional typefaces, both open-source (OFL) and bundled with `@expo-google-fonts`:

| Role | Typeface | Why |
|---|---|---|
| Display and headings | **Plus Jakarta Sans** (600/700/800) | A modern geometric sans designed in Indonesia. Gives titles and the hero a confident, branded voice |
| UI and body | **Inter** (400/500/600) | Built for screens, very legible at small sizes, tabular numbers for times and episode counts |

Type scale (pt, line-height):

| Style | Font | Size / LH | Use |
|---|---|---|---|
| `display` | Jakarta 800 | 32 / 38 | Hero title |
| `h1` | Jakarta 700 | 24 / 30 | Screen titles |
| `h2` | Jakarta 700 | 18 / 24 | Row headers |
| `title` | Inter 600 | 15 / 20 | Card titles (max 2 lines) |
| `body` | Inter 400 | 15 / 22 | Synopsis, settings |
| `caption` | Inter 500 | 12 / 16 | Meta lines, timestamps |
| `label` | Inter 600 | 11 / 14, +0.4 tracking, uppercase | Badges, chips |

- Respect the system font scale up to 1.3×, so layouts must flex. Titles truncate with an ellipsis and never overflow.
- Use `fontVariant: ['tabular-nums']` for times, progress and counts.

### 6.3 Skeleton loading
- **Every** screen that loads data shows a skeleton of its real layout on first load:
  - hero block
  - row header bar plus 3½ poster boxes, with the half box hinting that the row scrolls
  - grid boxes
  - list rows with thumbnail and two text lines
- Skeletons use `card` with a `card-2` shimmer sweep (1.2 s, linear, Reanimated). With **Reduce Motion** on, they show a static pulse instead.
- Skeleton boxes are exactly the final component's dimensions, so swapping in content causes no layout shift.
- Reusable primitives in `mobile/src/components/skeleton/`: `SkeletonBox`, `SkeletonText` (n lines, last line at 60%), `PosterSkeleton`, `RowSkeleton`, `HeroSkeleton`, `ListItemSkeleton`.
- Spinners appear only for actions the user started (e.g. resolving a mirror), never for loading content.
- If data arrives in under 150 ms, skip the skeleton entirely to avoid a flash.

### 6.4 UX principles (acceptance rules)
1. **Content first.** Artwork carries the screen. Chrome is minimal, translucent over imagery, and solid on scroll.
2. **One primary action per screen.** It's the most prominent button: Play on the hero and on Series detail, Resume in History.
3. **Thumb-reachable.** Primary actions sit in the bottom half or the tab bar. Touch targets are ≥ 48 × 48 dp, with ≥ 8 dp between targets (Fitts's law).
4. **Feedback within 100 ms.** Every press shows a pressed state (opacity or scale 0.97). Key actions get light haptics: add to My List, Play.
5. **Never a dead end.** Every empty, error and offline state explains what happened and offers a next step.
6. **Instant on return.** Show cached data immediately and refresh in the background (stale-while-revalidate). The user never waits twice for the same screen.
7. **Progressive disclosure.** Hide secondary details (long synopsis, full metadata, server list) behind "More" or a sheet.
8. **Consistency.** Cards, chips and buttons come from one component set, and nothing is styled one-off on a single screen.
9. **Accessible.** Text contrast is ≥ 4.5:1 (≥ 3:1 for large text). Every icon button has an `accessibilityLabel`. Screen-reader order follows the visual order. Reduce Motion is respected.
10. **Forgiving.** Destructive actions (clear history, remove from list) need a confirm, or a 5 s "Undo" snackbar.
11. **Motion with purpose.** 200–300 ms ease-out for transitions. Shared-element style poster → detail transition where the platform supports it. No decorative animation that delays content.

## 7. Non-functional requirements

| Area | Target |
|---|---|
| Cold start to the Home skeleton | < 1 s |
| Cold start to Home content | < 2.5 s on a mid-range Android device (cache warm on the server) |
| Tap episode to first frame | < 4 s on HLS mirrors |
| Scrolling | 60 fps on Home rows and on 200+ item grids |
| Layout shift | None when content replaces skeletons |
| Crash-free sessions | ≥ 99% |
| Minimum OS | Android 8 (API 26), iOS 15 |
| Accessibility | WCAG 2.2 AA contrast; 48 dp targets; supports font scale up to 1.3× |

## 8. Data model (local)

Bookmarks and history use the same shape as the web `src/storage.js`, so a later sync feature can merge them.

```ts
type Bookmark = { slug: string; title: string; poster: string; addedAt: number };
type HistoryItem = {
  episodeSlug: string; seriesSlug: string; title: string; episode: string;
  poster: string; genres?: string[]; position: number; duration: number; updatedAt: number;
};
type Settings = {
  autoplayNext: boolean; resume: boolean; serverOrder: string[];
  language: 'id' | 'en' | 'system'; theme: 'dark' | 'amoled'; apiUrl?: string;
  favoriteGenres: string[]; onboarded: boolean;
};
// keys: anistream.bookmarks.v1, anistream.history.v1, anistream.settings.v1, anistream.searches.v1
```

## 9. Milestones

Each milestone is one or more PRs (see AGENTS.md → Git workflow).

| # | Milestone | Done when |
|---|---|---|
| M0 | Docs, CI/CD, release pipeline | ✅ Merged |
| M1 | **Foundation**: theme tokens, fonts, typography components, skeleton primitives, five-tab shell, typed API client + Query, i18n scaffold | App boots to 5 tabs. A screen showing every type style and skeleton renders |
| M2 | **Home**: hero, Continue Watching, rows, skeletons, pull to refresh | Home shows live data; cold start shows the skeleton in under 1 s |
| M3 | **Series detail + local storage**: My List, history writes | Watchlist persists across restarts |
| M4 | **Watch**: expo-video + WebView mirrors, controls, fallback, resume, Up next | HLS and iframe episodes both play; resume works |
| M5 | **Discover, Search, Genre results** + `/api/genres` | You can find any show by genre or name in 3 taps or fewer |
| M6 | **New + History + My Space** (+ schedule spike) | All five tabs complete |
| M7 | **Settings, onboarding, offline/error states, deep links, icon/splash** | v0.x APK released and reviewed on a real phone |
| M8 | **Schedule**: `GET /api/schedule` inferred from samehadaku RSS release history (cached 30 minutes) + the *Jadwal tayang* segment on New (`schedule.png`): Mon–Sun day picker, today selected, series airing that day with time and My List marker | Weekday/time slots match recent RSS history in WIB; tapping a show opens its detail or its released episode |
| M9 | **Downloads** (`downloads*.png`, `DOWNLOADS.md`): download button on detail/episode rows, quality sheet, queue (progress, ETA, pause, resume, retry), Wi-Fi-only on by default, ready-to-watch list in My Space → Unduhan, delete with confirmation, offline playback in the player. HLS episodes are saved as local segments + rewritten playlist (or MP4 where the mirror is a file); iframe-only mirrors can't be downloaded and the button says so | An HLS episode downloads, survives an app restart mid-download, and plays in airplane mode |

## 10. Future (v2+)
- Push notifications for new episodes of shows in My List (server cron + Expo push).
- Accounts and multiple profiles, with sync between web and mobile.
- Chromecast / AirPlay.
- Persistent server deployment: a systemd unit, then a public host with auth or rate limiting.

## 11. Risks and open questions

| Risk / question | Impact | Mitigation |
|---|---|---|
| samehadaku markup or domain changes | Data breaks | All parsing stays in `server/scraper.js`; fix it once on the server |
| Mirrors are flaky or disappear | Playback fails | Server picker + automatic fallback; iframe as a last resort |
| Hero and backdrop artwork is low-resolution (posters are about 400×560) | A blurry hero | Use the poster with a blurred, scaled backdrop and gradient. Check whether the site has larger images (strip the `resize` param) |
| No genre list or schedule endpoint yet | Discover and New are blocked | Build `/api/genres` in M5 and spike `/api/schedule` in M6. Fall back to a hardcoded genre list |
| API is only reachable on the tailnet | App doesn't work off-tailnet | Acceptable for the review phase; deciding on public hosting is open |
| Can `expo-video` play the CDN stream directly with a `Referer` header? | Cuts load on the proxy | Spike during M4; keep the proxy as the default |
| Blogger WebView may show ads or redirects | Poor experience | Block navigation via `onShouldStartLoadWithRequest`; allowlist hosts |
| Content rights | Store rejection, takedown | Sideload only; the app hosts nothing. Revisit before any public release |

### M7 implementation notes

Settings are available from the gear in My Space. Language (system, Indonesian,
English), next-episode autoplay and playback resume persist on the device.
Storage offers confirmed removal of history, recent searches, My List and native
image caches. Expo Image does not expose a portable total cache size, so the UI
reports that size is unavailable. Browser caches remain browser-managed.
Onboarding introduces browsing on the first ordinary launch. Skip and the primary
CTA both persist completion. Genre preference chips are deferred until Home can
consume those preferences; there are no nonfunctional selections.

Deep links use the existing `anistream` scheme and file-based Expo Router paths:

- `anistream://series/<series-slug>` opens series details.
- `anistream://watch/<episode-slug>` opens the player (use an episode slug).
- `anistream://genre/<genre-slug>` opens that genre's catalogue.

Cold deep links bypass onboarding for that launch without setting its completion
flag. The root stack anchors to the tabs, and standalone back buttons fall back
to Home (settings fall back to My Space). Unknown routes use `+not-found` with
search and Home recovery actions. Test scheme dispatch on an installed native
build; Expo web verifies the equivalent `/series`, `/watch` and `/genre` paths.
Offline connectivity pauses requests and shows a banner above cached in-session
results; uncached content screens offer retry and Home. Query data is currently
cached in memory, not persisted across process restarts.

Appearance, server-order and quality preferences, developer tools, genre-based
onboarding and downloads are hidden. Downloads remain M9. The existing native
icon and splash assets and app version are unchanged; the splash background
already matches `#0B0D12`. A real-phone review/release remains a separate step.
