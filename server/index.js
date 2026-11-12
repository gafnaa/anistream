import express from 'express';
import { getSkipTimes } from './skip.js';
import { enrichCovers } from './covers.js';
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
  if (!API_KEY || req.query.k !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
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
const keySuffix = (req) => (typeof req.query.k === 'string' ? `&k=${encodeURIComponent(req.query.k)}` : '');

/* ------------------------------------------------------------------ */
/* tiny in-memory cache so we don't hammer the upstream on every nav   */
/* ------------------------------------------------------------------ */
const cache = new Map();
const TTL = {
  home: 60_000,
  list: 60_000,
  series: 120_000,
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

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error('[api]', req.path, err.message);
    res.status(502).json({ error: err.message || 'Upstream request failed' });
  });
};

/* ------------------------------------------------------------------ */
/* API routes                                                          */
/* ------------------------------------------------------------------ */
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
    return home;
  }));
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
  res.json(await cached(`search:${q}:${page}`, TTL.list, () => withCovers(search(q, page))));
}));

app.get('/api/series/:slug', wrap(async (req, res) => {
  res.json(await cached(`series:${req.params.slug}`, TTL.series, async () => {
    const series = await getSeries(req.params.slug);
    await enrichCovers([series]);
    return series;
  }));
}));

app.get('/api/episode/:slug', wrap(async (req, res) => {
  res.json(await cached(`episode:${req.params.slug}`, TTL.episode, () => getEpisode(req.params.slug)));
}));

/**
 * Resolve a mirror page to a direct stream URL.
 * `mirror` is passed as an absolute URL, so we validate the host first.
 */
app.get('/api/resolve', wrap(async (req, res) => {
  const mirror = String(req.query.mirror || '');
  let host;
  try {
    host = new URL(mirror).hostname;
  } catch {
    return res.status(400).json({ error: 'Invalid mirror URL' });
  }

  const allowed = /(^|\.)(xtwap\.top|blogger\.com|samehadaku\.li|ok\.ru|dailymotion\.com|youtube\.com|youtu\.be|drive\.google\.com|desustream\.(net|com)$|odcloud\.net$|archive\.org$|filemoon|acefile|bilibili)/i;
  if (!allowed.test(host)) {
    return res.status(400).json({ error: `Mirror host not allowed: ${host}` });
  }

  const stream = await cached(`stream:${mirror}`, TTL.stream, () => resolveMirror(mirror));

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
  if (!HOST_RE.test(u.hostname)) throw new Error(`Host not allowed: ${u.hostname}`);
  return u;
}

/** Rewrite a manifest so every child URI points back through this proxy. */
function rewriteManifest(body, baseUrl, suffix = '') {
  const base = new URL(baseUrl);
  const proxy = (abs) => `/api/hls?url=${encodeURIComponent(abs)}${suffix}`;
  const abs = (uri) => new URL(uri, base).toString();

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
 * Range-aware MP4 proxy for googlevideo.com files, whose URLs only work from
 * the IP that resolved them (this server).
 */
app.get('/api/video', wrap(async (req, res) => {
  let url;
  try {
    url = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).json({ error: 'Invalid video URL' });
  }
  if (url.protocol !== 'https:' || !/(^|\.)googlevideo\.com$/i.test(url.hostname)) {
    return res.status(400).json({ error: `Host not allowed: ${url.hostname}` });
  }
  const controller = new AbortController();
  res.on('close', () => controller.abort());
  const upstream = await fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': UA, ...(req.headers.range ? { Range: req.headers.range } : {}) },
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
