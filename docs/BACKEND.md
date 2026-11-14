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
| `GET /api/schedule` | Inferred weekly release slots in Asia/Jakarta; cached 30 minutes |
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

Search queries run against samehadaku and otakudesu.blog in parallel. Samehadaku
results take precedence over normalized title duplicates, and either source can
fail independently. Otakudesu-only titles use `od~` series and episode slugs;
series metadata and episode navigation then come directly from Otakudesu. The
namespace suffix is restricted to lowercase letters, digits and hyphens.

Samehadaku episode requests also search otakudesu.blog in parallel, with a
six-second deadline. Normalized
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

## Inferred release schedule

`GET /api/schedule` returns:

```js
{ timezone: 'Asia/Jakarta', generatedAt: '2026-11-12T03:00:00.000Z',
  days: [{ weekday: 1, items: [{ seriesSlug: 'example', title: 'Example', image: null,
    time: '18:30', episode: 7, released: true, episodeSlug: 'example-episode-7-subtitle-indonesia' }] }] }
```

All seven weekdays are returned (Monday = 1, Sunday = 7), including empty days.
`image` and `episode` may be null; `episodeSlug` is present only for released slots.
The scraper scans the shared RSS feed cache in parallel batches until it reaches
posts older than eight days (maximum 30 pages). Each series contributes its newest
episode's WIB weekday and HH:MM, sorted by time then title. If that release falls
in the current Monday–Sunday WIB week, the slot is released and shows episode N;
otherwise it is an estimate for episode N+1. Canonical series metadata comes from
ongoing catalogue cards, with episode-page metadata for missing or aliased slugs,
cached for a day. No playback mirrors are resolved for the schedule.

Samehadaku has no schedule page (`/jadwal-rilis/` returns 404). These are inferred
upload times, not official broadcast promises: delays, batch uploads, finales,
and irregular releases can produce inaccurate predictions. Shows with no release
in eight days are absent. Otakudesu is not used. Upstream errors return 502 so an
incomplete schedule is not silently cached. Successful responses are cached for
30 minutes, with a fresh cache key at WIB midnight to avoid crossing a week boundary.

## Mirainime catalogue

Search also queries Mirainime's `/anime-list?q=…&tab=anime` in parallel (the
`/anime?search=…` URL currently ignores its search parameter). Normalized title
duplicates prefer Samehadaku, then Otakudesu, then Mirainime; source failures are
independent. Mirainime uses `mn~<series>` and `mn~<series>~<positive episode>`
slugs. Series detail reads the player's full episode array, including all 500
Shippuuden episodes, and rejects an incomplete list rather than caching it.

Episode requests retain session cookies and send the page's stream token to the
JSON endpoint. MP4 qualities and alternates use the existing resolvable-source
contract: `/api/resolve` returns `proxied: true` and a keyed `/api/video` playUrl,
which works for both playback and downloads. The video proxy allows only
`arianeglenys.my.id`, `suguha.my.id`, `ichinose.my.id` and their subdomains for
these streams, sending `Referer: https://mirainime.com/` and forwarding Range.
Signed URLs are IP-bound and their expiry parameter is encrypted; Mirainime
episode and resolve responses are cached for only 15 seconds. Unsupported HLS
and other hosts are skipped. No mobile changes are required.

Mirainime rows reuse the series cover when no cached episode thumbnail exists;
generating frames would spend signed playback requests while browsing. Download
qualities are loaded only when the download sheet opens. The API accepts repeated
identical access keys for installed clients that append a key to an already-keyed
proxy URL; mixed or missing keys are still rejected. Updated clients set one key.

## Cover delivery

AniList cover URLs in `image` and `banner` are returned through `/api/cover` on the
request's API origin, including the caller's access key. The server caches the
original image bytes on disk, so devices need no direct AniList CDN connection.
Only HTTPS files in AniList's anime cover directory are accepted; redirects and
other hosts are rejected. Cached metadata is copied for each response so one
caller's host or key never enters another caller's cached response.

## Movies and TV

TMDB v3 supplies movie/TV catalogue metadata using the server-only `TMDB_TOKEN`
Bearer token. Lists/search/genres cache for one hour and details/seasons for six
hours. Overviews use `id-ID`, with `en-US` fallback when empty. Series slugs are
`tm~movie~<id>` and `tm~tv~<id>`; episode slugs append `~1` for movies or
`~<season>~<episode>` for TV. TV lists include aired episodes from every season
except specials (season zero). Episode numbers are sequential across seasons so
history ordering and numeric new-episode notifications work across season changes;
titles retain the actual `S1 E3` numbering. Episode `thumbnail` uses TMDB stills.

- `/api/movies?type=movie|tv&list=trending|popular|top|now|genre&genre=<id>&page=<n>`
  returns the existing paginated catalogue shape. `now` selects now playing movies
  or on-the-air TV.
- `/api/movies/genres?type=movie|tv` returns genre IDs and localized names.
- `/api/home` preserves anime arrays and appends `movieRows` (Film Trending,
  Series Trending, Film Populer). `/api/search` appends TMDB movie and TV results
  with `type: Film|Series`; TMDB failures do not discard working anime results.
- Existing `/api/series`, `/api/episode`, `/api/updates` and `/api/resolve` accept
  the new namespace. Resolving the episode's Vidbolt mirror produces a keyed
  `/api/tm/<episode-slug>.m3u8` play URL. Vidbolt requests always use `hevc=0`,
  a browser User-Agent and Vidbolt Referer, retrying once with the prior server
  excluded on missing/failed sources. Resolve results cache for 20 minutes.
- The master and all child media use `/api/hls`. In addition to the original
  observed CDNs, live verification found `proxy.vidbolt.xyz` playlists and
  `vercetti.org` segments; these hosts are explicitly allowed.
- Indonesian subtitles come from TheSubtitleDB's movie or specific TV episode
  endpoint. Lookup paginates and prefers SRT over VTT; unusable releases are
  skipped. SRT converts to WebVTT with `X-TIMESTAMP-MAP`.
  `/api/sub/<episode-slug>.m3u8` serves a single-segment VOD subtitle playlist,
  and `.vtt` serves the cues. The master adds Indonesia to `subs`, retains English
  tracks with `DEFAULT=NO`, and points every variant at the subtitle group. If no
  usable Indonesian file exists, the upstream master keeps its original tracks.
  All generated playback/subtitle URLs carry the caller's access key.

Mobile Discover links to Film & Series, with movie/TV, list and genre controls
using the existing poster grid. Home appends the movie rows after anime rows.
The native player offers subtitle/audio track selection and selects Indonesia
when available. `tm~` episodes hide MP4-only downloads and use TMDB stills rather
than scheduling frame generation. History and My List keep their existing shapes.

If media fails after a successful resolve, the episode also exposes a Vidbolt
alternate mirror. The existing player automatically advances to it; it excludes
that episode's cached first server and keeps a separate twenty-minute cache.
