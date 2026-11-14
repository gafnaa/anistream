import { configureTmCache, listTm, genresTm, searchTm, getTmSeries, getTmEpisode, resolveTm, getTmSubtitle, injectTmSubtitle, TM_VIDEO_HOST } from './tmdb.js';
import { parseUpdateSlugs, seriesUpdates, validSeriesSlug } from './updates.js';
import { MN_VIDEO_HOST } from './mirainime.js';
import { validAccessKey } from './access.js';
import { isCoverUrl, coverFile, coverResponse } from './artwork.js';
import express from 'express';
import { getSkipTimes } from './skip.js';
import { enrichCovers } from './covers.js';
import { getThumb, warmThumbs } from './thumbs.js';
import { latestRelease, latestApk } from './update.js';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import {
  getHome,
  getLatest,
  getSchedule,
  browse,
  genres,
  search,
  getSeries,
  getEpisode,
  resolveMirror,
} from './scraper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5178;
// Thumbnail jobs reuse our own episode/resolve/proxy routes over loopback.
const LOCAL_API = `http://127.0.0.1:${PORT}`;

app.use(express.json());

/* ------------------------------------------------------------------ */
/* public (Tailscale Funnel) access: API only, key + rate limit        */
/* ------------------------------------------------------------------ */
// Funnel marks proxied internet traffic with this header; tailnet and
// localhost requests stay open as before.
const API_KEY = process.env.ANISTREAM_KEY || '';
const RATE_LIMIT = 1200; // requests per IP per minute (HLS fetches many segments)
const hits = new Map();

app.use((req, res, next) => {
  if (!req.get('tailscale-funnel-request')) return next();
  if (!req.path.startsWith('/api/')) return res.status(404).end();
  if (!validAccessKey(req.query.k, API_KEY)) return res.status(401).json({ error: 'Unauthorized' });
  const ip = (req.get('x-forwarded-for') || req.ip).split(',')[0].trim();
  const minute = Math.floor(Date.now() / 60_000);
  const hit = hits.get(ip);
  if (!hit || hit.minute !== minute) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { minute, count: 1 });
  } else if (++hit.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

/** Query suffix that carries the caller's key into proxied URLs. */
const keySuffix = (req) => {
  const key = Array.isArray(req.query.k) ? req.query.k[0] : req.query.k;
  return typeof key === 'string' ? `&k=${encodeURIComponent(key)}` : '';
};

app.use('/api', (req, res, next) => {
  const json = res.json.bind(res);
  const protocol = req.get('x-forwarded-proto')?.split(',')[0].trim() || (req.get('tailscale-funnel-request') ? 'https' : req.protocol);
  const origin = `${protocol}://${req.get('host')}`;
  res.json = value => json(coverResponse(value, origin, keySuffix(req)));
  next();
});

/* ------------------------------------------------------------------ */
/* tiny in-memory cache so we don't hammer the upstream on every nav   */
/* ------------------------------------------------------------------ */
const cache = new Map();
const TTL = {
  home: 60_000,
  list: 60_000,
  series: 600_000,
  episode: 120_000,
  stream: 300_000,
  genres: 86_400_000,
};

/** Upgrade `items[].image` to AniList covers where possible. */
async function withCovers(promise) {
  const page = await promise;
  await enrichCovers(page.items);
  return page;
}

function cached(key, ttl, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  return fn().then((value) => {
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 500) {
      for (const [k, v] of cache) {
        if (k !== 'genres' && Date.now() - v.at > 600_000) cache.delete(k);
      }
    }
    return value;
  });
}

configureTmCache(cached);

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[api]', req.path, err.message);
    res.status(502).json({ error: err.message || 'Upstream request failed' });
  });
};

/* ------------------------------------------------------------------ */
/* API routes                                                          */
/* ------------------------------------------------------------------ */
app.get('/api/cover', wrap(async (req, res) => {
  const url = String(req.query.url || '');
  if (!isCoverUrl(url)) return res.status(400).json({ error: 'Invalid cover URL' });
  const file = await coverFile(url);
  res.set('Cache-Control', 'private, max-age=86400');
  res.sendFile(fileURLToPath(file), { dotfiles: 'allow' });
}));

app.get('/api/skip', async (req, res) => {
  res.json(await getSkipTimes(req.query.title, req.query.episode, req.query.duration));
});

app.get('/api/app/latest', wrap(async (req, res) => {
  res.json((await latestRelease()).payload);
}));

app.get('/api/app/apk', wrap(async (req, res) => {
  const apk = await latestApk();
  res.type('application/vnd.android.package-archive');
  res.attachment(apk.name);
  res.sendFile(apk.file, { dotfiles: 'allow' }, err => {
    if (err && !res.headersSent) res.status(err.status || 502).json({ error: 'APK could not be served' });
  });
}));

app.get('/api/home', wrap(async (req, res) => {
  res.json(await cached('home', TTL.home, async () => {
    const home = await getHome();
    await enrichCovers([...home.latest, ...home.ongoing, ...home.trending]);
    warmThumbs(home.latest.filter(item => item.kind === 'episode').map(item => item.slug), LOCAL_API);
    const rows = await Promise.allSettled([
      listTm({ type: 'movie' }), listTm({ type: 'tv' }), listTm({ list: 'popular' }),
    ]);
    return { ...home, movieRows: rows.map((row, index) => ({
      title: ['Film Trending', 'Series Trending', 'Film Populer'][index],
      items: row.status === 'fulfilled' ? row.value.items : [],
    })) };
  }));
}));

app.get('/api/movies', wrap(async (req, res) => {
  const { type = 'movie', list = 'trending', genre = '' } = req.query;
  const page = Math.max(1, Math.min(500, Math.floor(Number(req.query.page) || 1)));
  res.json(await listTm({ type, list, genre, page }));
}));
app.get('/api/movies/genres', wrap(async (req, res) => {
  res.json(await genresTm(req.query.type || 'movie'));
}));

app.get('/api/latest', wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json(await cached(`latest:${page}`, TTL.list, () => withCovers(getLatest(page))));
}));

app.get('/api/schedule', wrap(async (req, res) => {
  const week = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  res.json(await cached(`schedule:${week}`, 1800_000, async () => {
    const schedule = await getSchedule();
    await enrichCovers(schedule.days.flatMap(day => day.items));
    return schedule;
  }));
}));

app.get('/api/genres', wrap(async (req, res) => {
  res.json(await cached('genres', TTL.genres, genres));
}));

app.get('/api/browse', wrap(async (req, res) => {
  const { status = '', type = '', order = 'update', genre = '' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json(
    await cached(`browse:${status}:${type}:${order}:${genre}:${page}`, TTL.list, () =>
      withCovers(browse({ status, type, order, genre, page })),
    ),
  );
}));

app.get('/api/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json(await cached(`search:${q}:${page}`, TTL.list, async () => {
    const results = await Promise.allSettled([withCovers(search(q, page)), searchTm(q, page)]);
    if (results.every(result => result.status === 'rejected')) throw new Error('Search unavailable');
    const pages = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    return { query: q, page, items: pages.flatMap(result => result.items), hasNext: pages.some(result => result.hasNext) };
  }));
}));

/**
 * A frame from the episode itself, for episode cards and rows. 404 (not
 * cached) until the frame exists, so the app shows the series cover meanwhile.
 */
app.get('/api/thumb/:slug', wrap(async (req, res) => {
  const slug = req.params.slug;
  if (!/^[\w~.-]{1,200}$/.test(slug)) return res.status(400).json({ error: 'Invalid slug' });
  let timer;
  try {
    const file = await Promise.race([
      getThumb(slug, LOCAL_API),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Thumbnail pending')), 20_000); }),
    ]);
    res.set('Cache-Control', 'public, max-age=2592000, immutable');
    res.sendFile(file, { dotfiles: 'allow' });
  } catch {
    res.set('Cache-Control', 'no-store');
    res.status(404).json({ error: 'Thumbnail unavailable' });
  } finally {
    clearTimeout(timer);
  }
}));

function cachedSeries(slug) {
  if (slug.startsWith('tm~')) return getTmSeries(slug);
  return cached(`series:${slug}`, TTL.series, async () => {
    const series = await getSeries(slug);
    await enrichCovers([series]);
    return series;
  });
}

app.get('/api/updates', wrap(async (req, res) => {
  let slugs;
  try { slugs = parseUpdateSlugs(req.query.slugs); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  res.json(await seriesUpdates(slugs, cachedSeries));
}));

app.get('/api/series/:slug', wrap(async (req, res) => {
  if (!validSeriesSlug(req.params.slug)) return res.status(400).json({ error: 'Invalid slug' });
  res.json(await cachedSeries(req.params.slug));
}));

app.get('/api/episode/:slug', wrap(async (req, res) => {
  if (req.params.slug.startsWith('tm~')) return res.json(await getTmEpisode(req.params.slug));
  res.json(await cached(`episode:${req.params.slug}`, req.params.slug.startsWith('mn~') ? 15_000 : TTL.episode, () => getEpisode(req.params.slug)));
}));

/**
 * Resolve a mirror page to a direct stream URL.
 * `mirror` is passed as an absolute URL, so we validate the host first.
 */
app.get('/api/resolve', wrap(async (req, res) => {
  const mirror = String(req.query.mirror || '');
  const tmMirror = (() => { try { return new URL(mirror); } catch { return null; } })();
  if (tmMirror?.origin === 'https://vidbolt.xyz' && tmMirror.pathname === '/api/resolve') {
    const slug = tmMirror.searchParams.get('slug');
    const alternate = tmMirror.searchParams.get('alternate') === '1';
    const stream = await resolveTm(slug, alternate);
    return res.json({ type: 'hls', url: stream.url, playUrl: `/api/tm/${encodeURIComponent(slug)}.m3u8?alternate=${alternate ? '1' : '0'}${keySuffix(req)}` });
  }
  let host;
  try {
    host = new URL(mirror).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid mirror URL' });
  }

  const allowed = /(^|\.)(xtwap\.top|blogger\.com|samehadaku\.li|ok\.ru|dailymotion\.com|youtube\.com|youtu\.be|drive\.google\.com|desustream\.(net|com)$|odcloud\.net$|archive\.org$|filemoon|acefile|bilibili)/i;
  if (!allowed.test(host) && !MN_VIDEO_HOST.test(host)) {
    return res.status(400).json({ error: `Mirror host not allowed: ${host}` });
  }

  const stream = await cached(`stream:${mirror}`, MN_VIDEO_HOST.test(host) ? 15_000 : TTL.stream, () => resolveMirror(mirror));

  // Rewrite the manifest through our proxy: the CDN sends
  // Access-Control-Allow-Origin: https://play.xtwap.top only, so the
  // browser can never load these segments on its own.
  if (stream.type === 'hls') {
    stream.playUrl = `/api/hls?url=${encodeURIComponent(stream.url)}${keySuffix(req)}`;
  } else if (stream.proxied) {
    stream.playUrl = `/api/video?url=${encodeURIComponent(stream.url)}${keySuffix(req)}`;
  } else {
    stream.playUrl = stream.url;
  }
  res.json(stream);
}));

/* ------------------------------------------------------------------ */
/* HLS proxy                                                           */
/* ------------------------------------------------------------------ */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const HOST_RE = /(^|\.)(xtwap\.top|blogger\.com|googlevideo\.com|googleusercontent\.com|akamaized\.net|cloudfront\.net|samehadaku\.li|wp\.com|odcloud\.net)$/i;

function assertAllowed(target) {
  const u = new URL(target);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Bad protocol');
  if (!HOST_RE.test(u.hostname) && !TM_VIDEO_HOST.test(u.hostname)) throw new Error(`Host not allowed: ${u.hostname}`);
  return u;
}

/** Rewrite a manifest so every child URI points back through this proxy. */
function rewriteManifest(body, baseUrl, suffix = '') {
  const base = new URL(baseUrl);
  const proxy = (abs) => `/api/hls?url=${encodeURIComponent(abs)}${suffix}`;
  const abs = (uri) => {
    const url = new URL(uri, base);
    // Movie/TV CDNs authorise every child playlist and segment with the master's query (api_key=…).
    if (TM_VIDEO_HOST.test(base.hostname) && base.search && !url.search && url.host === base.host) url.search = base.search;
    return url.toString();
  };

  return body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      // Tag lines carrying URIs: EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA, EXT-X-I-FRAME-STREAM-INF
      if (trimmed.startsWith('#') && /URI="([^"]+)"/i.test(trimmed)) {
        return trimmed.replace(/URI="([^"]+)"/gi, (_, uri) => `URI="${proxy(abs(uri))}"`);
      }
      if (trimmed.startsWith('#')) return trimmed;

      // Blank line or a bare segment / variant playlist URI
      if (!trimmed) return trimmed;
      return proxy(abs(trimmed));
    })
    .join('\n');
}

/**
 * Range-aware MP4 proxy for Googlevideo and Mirainime files, whose URLs only work from
 * the IP that resolved them (this server).
 */
app.get('/api/video', wrap(async (req, res) => {
  let url;
  try {
    url = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).json({ error: 'Invalid video URL' });
  }
  if (url.protocol !== 'https:' || (!/(^|\.)googlevideo\.com$/i.test(url.hostname) && !MN_VIDEO_HOST.test(url.hostname))) {
    return res.status(400).json({ error: `Host not allowed: ${url.hostname}` });
  }
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  const upstream = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': UA, ...(MN_VIDEO_HOST.test(url.hostname) ? { Referer: 'https://mirainime.com/' } : {}), ...(req.headers.range ? { Range: req.headers.range } : {}) },
  });
  res.status(upstream.status);
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  // HEAD (size probes from the download sheet) must not pull the whole file.
  if (req.method === 'HEAD' || !upstream.body) {
    controller.abort();
    return res.end();
  }
  try {
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    // The player closed the connection (seek or stop); nothing to report.
  }
}));

app.get('/api/tm/:slug.m3u8', wrap(async (req, res) => {
  const slug = req.params.slug;
  const stream = await resolveTm(slug, req.query.alternate === '1');
  const subtitle = await getTmSubtitle(slug).catch(() => null);
  // A media playlist has nowhere to declare subtitles, so wrap it in a one-variant master.
  const source = !subtitle || stream.master.includes('#EXT-X-STREAM-INF') ? stream.master
    : `#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=3000000\n${stream.url}\n`;
  let master = rewriteManifest(source, stream.url, keySuffix(req));
  if (subtitle) master = injectTmSubtitle(master, `/api/sub/${encodeURIComponent(slug)}.m3u8?${keySuffix(req).slice(1)}`);
  res.type('application/vnd.apple.mpegurl').send(master);
}));
app.get('/api/sub/:slug.m3u8', wrap(async (req, res) => {
  const sub = await getTmSubtitle(req.params.slug);
  if (!sub) return res.status(404).end();
  const series = await getTmSeries(req.params.slug.split('~').slice(0, 3).join('~'));
  const episode = series.episodes.find(ep => ep.slug === req.params.slug);
  const duration = Math.max(sub.duration, episode?.duration || series.duration || 0);
  res.type('application/vnd.apple.mpegurl').send(`#EXTM3U\n#EXT-X-TARGETDURATION:${duration}\n#EXT-X-VERSION:3\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:${duration},\n/api/sub/${encodeURIComponent(req.params.slug)}.vtt?${keySuffix(req).slice(1)}\n#EXT-X-ENDLIST\n`);
}));
app.get('/api/sub/:slug.vtt', wrap(async (req, res) => {
  const sub = await getTmSubtitle(req.params.slug);
  if (!sub) return res.status(404).end();
  res.type('text/vtt').send(sub.vtt);
}));

app.get('/api/hls', wrap(async (req, res) => {
  const target = String(req.query.url || '');
  let url;
  try {
    url = assertAllowed(target);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let upstream;
  try {
    upstream = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Referer: `https://${url.hostname}/`,
        Origin: `https://${url.hostname}`,
        Accept: '*/*',
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
  }

  const contentType = upstream.headers.get('content-type') || '';
  const isManifest =
    /mpegurl/i.test(contentType) || /\.m3u8($|\?)/i.test(url.pathname + url.search);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');

  if (isManifest) {
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    return res.send(rewriteManifest(text, url.toString(), keySuffix(req)));
  }

  // Binary segment / key / init segment: stream it straight through.
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  const len = upstream.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);

  const reader = upstream.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(Buffer.from(value))) {
        await new Promise((r) => res.once('drain', r));
      }
    }
  } finally {
    res.end();
  }
}));

/* ------------------------------------------------------------------ */
/* static build (production)                                           */
/* ------------------------------------------------------------------ */
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist));
  // SPA fallback so client-side routes survive a refresh.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile('index.html', { root: dist }, (err) => {
      if (err) next(err);
    });
  });
}

app.listen(PORT, () => {
  console.log(`\n  ▶ AniStream API on http://localhost:${PORT}\n`);
});
