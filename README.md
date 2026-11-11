<div align="center">

# AniStream

**Anime streaming app with Indonesian subtitles. A React Native mobile app and a web prototype, backed by a samehadaku scraping API.**

[![CI](https://github.com/gafnaa/anistream/actions/workflows/ci.yml/badge.svg)](https://github.com/gafnaa/anistream/actions/workflows/ci.yml)
[![Release](https://github.com/gafnaa/anistream/actions/workflows/release.yml/badge.svg)](https://github.com/gafnaa/anistream/actions/workflows/release.yml)
![Expo SDK 58](https://img.shields.io/badge/Expo-SDK%2058-000020?logo=expo)
![React Native 0.88](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react)
![License: Proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

---

## Overview

AniStream lets you browse, search, and watch anime from samehadaku without its
ads, pop-ups and desktop-first layout. The repo has three parts:

| Part | Path | Stack | Status |
|---|---|---|---|
| **Mobile app** | [`mobile/`](mobile) | Expo SDK 58, React Native, Expo Router, TypeScript | 🚧 In development (see [PRD](docs/PRD.md)) |
| **API** | [`server/`](server) | Node.js, Express, cheerio | ✅ Live on `waf-server` |
| **Web prototype** | [`src/`](src) | React, Vite, hls.js (PWA) | ✅ Live, used as the reference UI |

### Features

- Home feed with trending titles, ongoing series, and the latest episodes, loaded as you scroll
- Browse by status, type and order, plus live search
- Series pages: poster, synopsis, genres, full episode list, watchlist
- Built-in player for HLS streams (480p, 720p and 1080p), with a fallback player for embedded mirrors
- Server switcher that moves to the next mirror on its own when one fails
- Continue watching from where you left off, and a local watchlist, with no account needed

## Architecture

```
┌──────────────────────┐
│ Mobile app (Expo)    │──┐
└──────────────────────┘  │  JSON + HLS   ┌──────────────────────┐  HTML / HLS  ┌──────────────┐
                          ├─────────────▶ │ AniStream API        │ ───────────▶ │ samehadaku   │
┌──────────────────────┐  │               │ scraper · resolver · │              │ + video CDNs │
│ Web prototype (Vite) │──┘               │ HLS proxy            │              └──────────────┘
└──────────────────────┘                  └──────────────────────┘
```

Both clients call the same API. Scraping and stream resolution stay on the
server, because the video CDN only allows its own origin, which blocks direct
browser playback, and samehadaku's markup changes often. Details are in
[`docs/BACKEND.md`](docs/BACKEND.md).

## Getting started

**Requirements:** Node.js 24+, npm. For the mobile app, also an Android device
or emulator. Use Expo Go or a development build.

### API and web prototype

```bash
npm install
npm run dev               # API → http://localhost:5178 · web → http://localhost:5177
```

Production (single port, detached):

```bash
npm run build && ./start.sh   # serves UI + API on :5178
```

### Mobile app

```bash
cd mobile
npm install
npx expo start            # scan the QR code with Expo Go, or press "a" for an Android emulator
```


## Project structure

```
.
├── mobile/                  # React Native app (Expo)
│   ├── src/app/             #   file-based routes (Expo Router)
│   ├── app.json · eas.json  #   app + EAS build config
│   └── AGENTS.md            #   Expo-specific agent rules
├── server/
│   ├── scraper.js           # all samehadaku HTML parsing
│   └── index.js             # Express API, mirror resolver, HLS proxy
├── src/                     # web prototype (React + Vite)
├── docs/
│   ├── PRD.md               # product requirements + milestones
│   └── BACKEND.md           # API reference, playback internals, deployment
├── .github/workflows/       # CI + release pipelines
├── AGENTS.md                # rules for AI agents and contributors
└── .claude/skills/          # project workflow skill
```

## API at a glance

| Endpoint | Returns |
|---|---|
| `GET /api/home` | Latest, ongoing and trending lists |
| `GET /api/latest?page=` | Latest episode releases |
| `GET /api/browse?status=&type=&order=&genre=&page=` | Catalogue |
| `GET /api/genres` | `[{ slug, name, count? }]` from the catalogue filter; cached 24 hours |
| `GET /api/search?q=&page=` | Search results |
| `GET /api/series/:slug` | Series metadata, `genres: string[]`, `genreLinks: [{ slug, name }]`, and episode list |
| `GET /api/episode/:slug` | Episode info and mirrors; OD fallback sources add `provider`, `quality`, `type` |
| `GET /api/resolve?mirror=` | Playable source: `hls`, `mp4` or `iframe` |
| `GET /api/hls?url=` | Proxied HLS manifest or segment |

Episode sources try Otakudesu direct streams by descending quality, then Blogger,
then xtwap. Otakudesu lookup has a six-second deadline and caches conservative
anime matches (including misses) for 24 hours. Failure preserves samehadaku mirrors.
OD MP4s play directly without the proxy.

The full reference is in [`docs/BACKEND.md`](docs/BACKEND.md#api).

## Development workflow

Every change goes on its own branch, then a pull request, then a **squash merge**.
Nobody commits directly to `main`.

```bash
git switch main && git pull --ff-only
git switch -c feat/<short-desc>
# ...change, then verify...
gh pr create && gh pr merge --squash --delete-branch
```

The conventions and verification checklist are in [`AGENTS.md`](AGENTS.md).

## CI/CD and releases

| Workflow | Trigger | What it does |
|---|---|---|
| **CI** | Every PR and every push to `main` | Builds the web app and checks the API files, then typechecks, lints, runs expo-doctor on and bundles the mobile app |
| **Release** | Pushing a `v*` tag | Builds a signed Android APK on [EAS](https://expo.dev/eas) and publishes it as a GitHub Release |

To cut a release:

```bash
# 1. In a PR: bump "version" in mobile/app.json (e.g. 0.2.0), then squash-merge it
# 2. Tag main with the matching version
git switch main && git pull --ff-only
git tag v0.2.0 && git push origin v0.2.0
```

Download the APK from the [Releases](https://github.com/gafnaa/anistream/releases)
page and install it on an Android device.

## Documentation

- [Product requirements (PRD)](docs/PRD.md): scope, screens, milestones
- [Backend](docs/BACKEND.md): API, playback internals, deployment on `waf-server`
- [AGENTS.md](AGENTS.md): contributor and AI agent rules
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Disclaimer

AniStream hosts no content. It reads publicly available pages from a
third-party site at request time. All titles, artwork and video belong to their
respective rights holders. This is a private project and is not for public
distribution.

## License

Proprietary. All rights reserved. See [LICENSE](LICENSE).
