# AniStream

A mobile-first anime streaming web app (PWA) that pulls its catalogue and video
sources from **samehadaku.li**. Built as a reviewable prototype for a future
mobile app — the UI is designed at phone dimensions first.

This project lives at **`/var/anistream`** on `waf-server`.

---

## Quick start

```bash
npm install
npm run dev
```

- Web UI → http://localhost:5177 (Vite, hot reload)
- API     → http://localhost:5178

For a single-port production build:

```bash
npm run build
npm start        # serves UI + API on http://localhost:5178
```

Or use the helper, which rebuilds if needed and runs detached:

```bash
./start.sh
```

To view it on your phone, both servers bind to `0.0.0.0` — open
`http://<your-lan-ip>:5177` on the device.

---

## Accessing it over Tailscale

This machine is `waf-server` on the tailnet, so the app is reachable from any
of your devices without exposing anything publicly:

| URL | Notes |
|---|---|
| `https://waf-server.tail1ec650.ts.net:5175` | **Use this one.** HTTPS, served through `tailscale serve` |
| `http://100.111.3.45:5178` | Direct tailnet IP, plain HTTP |

The HTTPS entry is a `tailscale serve` proxy that was already configured to
forward port 5175 → `127.0.0.1:5178`, so it picks up this app automatically:

```bash
tailscale serve status          # view current mappings
tailscale serve --https=443 off # (do not run — nginx owns 443 on this host)
```

Port 443 is taken by nginx on IPv4, so don't try to serve this app on 443 —
use the 5175 entry above.


---

## Screens

| Route | What it does |
|---|---|
| `/` | Trending banner, ongoing rail, latest episode grid with infinite "load more" |
| `/browse` | Catalogue with status / order / type filters |
| `/search` | Debounced live search |
| `/series/:slug` | Poster, metadata, genres, synopsis, episode list, watchlist toggle |
| `/watch/:slug` | Player, server switcher, prev/next, full episode list, resume history |
| `/library` | Continue-watching history + saved watchlist (localStorage) |

The bottom tab bar hides on the watch screen so the player gets full width.

---

## How the video actually plays

This is the part that needed real investigation, so it's worth explaining.

Each episode page on samehadaku exposes mirrors as buttons:

```html
<button class="aspd-server" data-label="HD-1" data-url="..." data-embed="<base64 iframe>">
```

Two different kinds of mirror show up in practice:

**1. `play.xtwap.top/cepat2.php?url=…`** — a JW Player wrapper. Fetching it
returns a tiny config with the real stream:

```js
sources: [{ file: "https://hls.xtwap.top/.../index.m3u8", type: "application/vnd.apple.mpegurl" }]
```

That manifest is a proper adaptive ladder (480p / 720p / 1080p), fMP4 segments.

**The catch:** the CDN responds with

```
access-control-allow-origin: https://play.xtwap.top
```

So a browser can *never* fetch these segments directly from our origin — CORS
blocks it, and no amount of client-side code fixes that. The backend therefore
proxies the stream:

- `GET /api/resolve?mirror=…` resolves the wrapper to a direct URL
- `GET /api/hls?url=…` fetches the manifest, **rewrites every child URI**
  (variant playlists, `EXT-X-MAP` init segments, segments, keys) back through
  itself, and streams the binary segments through

That's why playback works in Chrome/Firefox/Safari rather than only Safari.

**2. `blogger.com/video.g?token=…`** — Google's player. There's no downloadable
manifest; it's designed to be framed. These are rendered as a sandboxed
`<iframe>` instead. Many episodes only have this mirror, which is why the
player supports both modes and the server buttons matter.

If a stream fails, the player automatically hops to the next mirror.

---

## API

| Endpoint | Returns |
|---|---|
| `GET /api/home` | `{ latest[], ongoing[], trending[] }` |
| `GET /api/latest?page=` | Latest episode releases |
| `GET /api/browse?status=&type=&order=&genre=&page=` | Catalogue |
| `GET /api/search?q=&page=` | Search results |
| `GET /api/series/:slug` | Metadata, synopsis, genres, episodes |
| `GET /api/episode/:slug` | Episode info + mirror list |
| `GET /api/resolve?mirror=` | `{ type: hls\|mp4\|iframe, url, playUrl }` |
| `GET /api/hls?url=` | Proxied manifest / segment |

Responses are cached in memory (60–300s) so navigating back and forth doesn't
re-scrape the upstream site every time.

---

## Project layout

```
server/
  scraper.js    # all samehadaku HTML parsing (cheerio)
  index.js      # express API, HLS proxy, static serving
src/
  pages/        # Home, Browse, Search, Series, Watch, Library
  components/   # Player (hls.js + iframe), Poster, TopBar, BottomNav
  api.js        # typed-ish fetch helpers
  storage.js    # bookmarks + history
```

Scraping is deliberately isolated in `scraper.js` — samehadaku changes its
markup occasionally, and that's the only file that should need edits when it
does.

---

## Notes and limits

- **This is a prototype, not a product.** It scrapes a third-party site at
  request time. Metadata, posters, and video belong to their original rights
  holders; the app hosts nothing.
- The site sits behind LiteSpeed + a WAF, so requests need a browser-like
  `User-Agent` and `Referer` — a bare `fetch()` gets 403/406.
- No auth, no database. Watchlist and history live in `localStorage`, so they're
  per-device and per-browser.
- Mirrors are flaky by nature — that's the site's infrastructure, not this app.
  The server switcher and auto-fallback exist for exactly this reason.
- If you take this to a real mobile app, the natural next step is wrapping this
  same API in a native shell (Capacitor / React Native) rather than porting the
  scraper — the HLS proxy has to stay server-side.
