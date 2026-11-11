# Backend: API, playback and deployment

The Express server in `server/` is shared by the web prototype and the mobile app.
It scrapes samehadaku, resolves video mirrors, and proxies HLS streams.

---

## Deployment on waf-server (Tailscale)

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
| `GET /api/genres` | `[{ slug, name, count? }]` from the catalogue filter; cached 24 hours |
| `GET /api/search?q=&page=` | Search results |
| `GET /api/series/:slug` | Metadata, synopsis, `genres: string[]`, `genreLinks: [{ slug, name }]`, episodes |
| `GET /api/episode/:slug` | Episode info + mirror list; optional `provider`, `quality`, `type` on sources |
| `GET /api/resolve?mirror=` | `{ type: hls\|mp4\|iframe, url, playUrl }` |
| `GET /api/hls?url=` | Proxied manifest / segment |

Responses are cached in memory (60–300s; genres for 24 hours) so navigating back and forth doesn't
re-scrape the upstream site every time.

---

## Otakudesu fallback

The catalogue and episode metadata still come from samehadaku. Episode requests
also search otakudesu.blog in parallel, with a six-second deadline. Normalized
titles must match all words and the season, and the episode number must match
exactly. Confirmed anime matches and search misses are cached for 24 hours;
timeouts and upstream errors are retried on later requests.

Sources retain `{ label, url, host, kind }`. Otakudesu adds
`provider: "otakudesu"`, `quality: "720p"` (or null when unknown), and
`type: "mp4" | "hls" | "iframe"`. Labels such as `OD 720p` appear in the
mobile server sheet. Direct Otakudesu streams come first, descending by quality,
then Blogger mirrors, with xtwap last. Mobile stably moves iframe sources after
native streams while preserving the API order within each group.

Only verified public desustream players are inspected; unknown hosts and
captcha/attestation/challenge pages are skipped. The site's public WordPress
AJAX resolves odcdn/odstream mirrors, reading action hashes from inline scripts
with fallback constants. Other mirror hosts are currently omitted rather than
assuming they embed successfully. If the lookup fails, samehadaku sources remain.

`/api/resolve` accepts desustream.net and odcloud.net. Direct odcloud MP4s
return their original URL as `playUrl`: they support byte ranges without a
Referer and do not need the HLS proxy. HLS on odcloud uses the existing proxy.
The six-second budget includes search, episode discovery, and mirror resolution.

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
- The mobile app (`mobile/`) reuses this API rather than porting the scraper: the HLS proxy has to stay server-side.
