import * as cheerio from 'cheerio';

export const BASE = 'https://samehadaku.li';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const TIMEOUT_MS = 20000;

/**
 * Fetch a page from samehadaku with a browser-ish header set.
 * The site sits behind LiteSpeed + a WAF, so a plain fetch gets 403/406.
 */
export async function fetchPage(url, { referer = BASE + '/' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        Referer: referer,
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Trim + collapse whitespace, used all over the parsers. */
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** Samehadaku proxies images through i0/i1/i2.wp.com with a resize query. */
function normalizeImage(src, width = 247, height = 350) {
  if (!src) return null;
  let url = src.trim();
  if (url.startsWith('//')) url = 'https:' + url;
  if (url.startsWith('data:')) return null;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('wp.com')) {
      u.searchParams.set('resize', `${width},${height}`);
      return u.toString();
    }
  } catch {
    return null;
  }
  return url;
}

/** Turn "/anime/foo/" or a full URL into a slug we can route on. */
export function slugFromUrl(href) {
  if (!href) return null;
  try {
    const path = href.startsWith('http') ? new URL(href).pathname : href;
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

function parseCards($, root) {
  const items = [];
  root.find('article.bs').each((_, el) => {
    const a = $(el).find('a[itemprop="url"]').first();
    const href = a.attr('href');
    if (!href) return;

    const headline = clean($(el).find('h2[itemprop="headline"]').text());
    const ttText = clean($(el).find('.tt').clone().children().remove().end().text());
    const title = ttText || headline.replace(/\s*Episode\s+\d+.*$/i, '').trim();

    const img = $(el).find('img').first();
    const image = normalizeImage(img.attr('data-src') || img.attr('src'));

    const epText = clean($(el).find('.bt .epx').text());
    const epMatch = epText.match(/(\d+(?:\.\d+)?)/);
    const type = clean($(el).find('.typez').first().text());
    const status = clean($(el).find('.status').first().text());
    const isEpisode = /episode/i.test(href);

    items.push({
      slug: slugFromUrl(href),
      title: title || headline,
      episodeTitle: headline || null,
      image,
      type: type || null,
      status: status || null,
      episode: epMatch ? Number(epMatch[1]) : null,
      kind: isEpisode ? 'episode' : 'series',
      url: href,
    });
  });
  return items;
}

/** Home page: trending banner, ongoing rail, and latest episode releases. */
export async function getHome() {
  const [html, ongoingRes] = await Promise.all([
    fetchPage(BASE + '/'),
    // The homepage has no "ongoing" block, so pull it from the catalogue.
    browse({ status: 'ongoing', order: 'update', page: 1 }).catch(() => ({ items: [] })),
  ]);
  const $ = cheerio.load(html);

  const latest = parseCards($, $('.listupd').first());
  const ongoing = (ongoingRes.items || []).slice(0, 14).map((i) => ({ ...i, kind: 'series' }));

  const trending = [];
  $('.trending .tdb a').each((_, el) => {
    const a = $(el);
    const bg = $('.imgxb', el).attr('style') || '';
    const m = bg.match(/url\(['"]?(.*?)['"]?\)/);
    trending.push({
      slug: slugFromUrl(a.attr('href')),
      title: clean($('.numb b', el).text()) || clean($('.numb', el).text()),
      image: m ? normalizeImage(m[1], 500, 750) : null,
      kind: 'series',
    });
  });

  return { latest, ongoing, trending };
}

/** Latest episode releases, paginated. */
export async function getLatest(page = 1) {
  const url = page > 1 ? `${BASE}/page/${page}/` : BASE + '/';
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const items = parseCards($, $('.listupd').first());
  const hasNext = $('.hpage a.r').length > 0;
  await addReleaseTimes(items, page).catch(() => {});
  return { items, page, hasNext };
}

/*
 * The listing has no dates, but the RSS feed (10 posts per page) has
 * <pubDate>. Scan feed pages until every item has a time, up to a cap that
 * grows with the listing page. Items that aren't found get no releasedAt.
 */
const feedPages = new Map();
const FEED_TTL = 600_000;

async function feedPage(n) {
  const hit = feedPages.get(n);
  if (hit && Date.now() - hit.at < FEED_TTL) return hit.posts;
  const xml = await fetchPage(`${BASE}/feed/${n > 1 ? `?paged=${n}` : ''}`);
  const posts = [...xml.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<pubDate>([^<]+)<\/pubDate>/g)]
    .map(([, link, date]) => ({ slug: slugFromUrl(link.trim()), at: new Date(date.trim()).toISOString() }));
  feedPages.set(n, { at: Date.now(), posts });
  return posts;
}

async function addReleaseTimes(items, page) {
  const pending = new Set(items.filter(item => item.kind === 'episode'));
  const limit = Math.min(4 * page + 2, 30);
  for (let n = 1; n <= limit && pending.size; n += 3) {
    const batches = await Promise.all([n, n + 1, n + 2].filter(k => k <= limit).map(k => feedPage(k).catch(() => [])));
    for (const post of batches.flat()) {
      for (const item of pending) {
        // Listing slugs can be truncated; the feed has the full slug.
        if (post.slug && (post.slug === item.slug || post.slug.startsWith(item.slug))) {
          item.releasedAt = post.at;
          pending.delete(item);
        }
      }
    }
  }
}

const ORDER_MAP = {
  update: 'update',
  latest: 'latest',
  popular: 'popular',
  rating: 'rating',
  title: 'title',
};

export async function genres() {
  const $ = cheerio.load(await fetchPage(`${BASE}/anime/`));
  const items = new Map();
  $('input[name="genre[]"]').each((_, el) => {
    const slug = clean($(el).attr('value'));
    const name = clean($(el).parent().find('label').text());
    if (slug && name) items.set(slug, { slug, name });
  });
  if (!items.size) throw new Error('Genre filter not found');
  return [...items.values()];
}

/** Browse the anime catalogue with status/type/order filters. */
export async function browse({ status = '', type = '', order = 'update', page = 1, genre = '' } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  if (ORDER_MAP[order]) params.set('order', ORDER_MAP[order]);
  if (genre) params.append('genre[]', genre);
  if (page > 1) params.set('page', String(page));

  const html = await fetchPage(`${BASE}/anime/?${params.toString()}`);
  const $ = cheerio.load(html);
  const items = parseCards($, $('.listupd').first()).map((i) => ({ ...i, kind: 'series' }));

  // Pagination links are query based: /anime/?page=2&status=ongoing&order=update
  let hasNext = false;
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(/[?&]page=(\d+)/);
    if (m && Number(m[1]) === page + 1) hasNext = true;
  });

  return { items, page, hasNext };
}

/** Search series by keyword. */
export async function search(query, page = 1) {
  const q = String(query || '').trim();
  if (!q) return { items: [], query: q, page: 1, hasNext: false };

  const url = `${BASE}/?s=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const items = parseCards($, $('.listupd').first());
  return { items, query: q, page, hasNext: $('.hpage a.r').length > 0 };
}

/** Full series detail: metadata, synopsis, genres, and the episode list. */
export async function getSeries(slug) {
  const html = await fetchPage(`${BASE}/anime/${slug}/`);
  const $ = cheerio.load(html);

  // Series pages use `.bigcontent`; episode pages use `.single-info`.
  const info = $('.bigcontent').length ? $('.bigcontent').first() : $('.single-info').first();
  const title = clean(info.find('h1.entry-title').text()) || clean($('h1.entry-title').first().text());
  if (!title) throw new Error('Series not found');

  const img = info.find('.thumb img').first().length ? info.find('.thumb img').first() : info.find('img').first();
  const image = normalizeImage(img.attr('data-src') || img.attr('src'), 400, 560);

  const synopsis = clean($('.bixbox.synp .entry-content').first().text()) || null;

  const fields = {};
  info.find('.spe > span').each((_, el) => {
    const label = clean($(el).find('b').text()).replace(/:$/, '').toLowerCase();
    const value = clean($(el).find('a').length ? $(el).find('a').map((i, a) => clean($(a).text())).get().join(', ') : $(el).clone().find('b').remove().end().text());
    if (label) fields[label] = value;
  });

  const genres = info
    .find('.genxed a')
    .map((_, el) => clean($(el).text()))
    .get()
    .filter(Boolean);

  const episodes = [];
  $('.eplister ul li').each((_, el) => {
    const a = $(el).find('a').first();
    const href = a.attr('href');
    if (!href) return;
    episodes.push({
      slug: slugFromUrl(href),
      number: clean($(el).find('.epl-num').text()) || clean($(el).find('.epl-title').text()).match(/Episode\s+(\d+)/i)?.[1] || null,
      title: clean($(el).find('.epl-title').text()),
      date: clean($(el).find('.epl-date').text()),
      url: href,
    });
  });

  const trailerHref = info.find('a.trailerbutton').attr('href') || null;
  const trailerId = trailerHref?.match(/[?&]v=([\w-]{6,})/)?.[1] || null;

  return {
    slug,
    title,
    image,
    banner: image,
    synopsis,
    genres,
    genreLinks: info.find('.genxed a').map((_, el) => ({
      slug: slugFromUrl($(el).attr('href')),
      name: clean($(el).text()),
    })).get().filter(item => item.slug && item.name),
    trailerId,
    status: fields.status || null,
    studio: fields.studio || null,
    released: fields.released || null,
    season: fields.season || null,
    type: fields.type || null,
    rating: clean(info.find('.rating strong').text()).replace(/Rating/i, '').trim() || null,
    episodes,
  };
}

/**
 * Episode detail + playable sources.
 *
 * Each episode page has mirror buttons:
 *   <button class="aspd-server" data-label="HD-1" data-url="..." data-embed="<base64 iframe>">
 * Two kinds of mirrors show up in practice:
 *   1. blogger.com/video.g?token=...  -> Google's player, only embeddable as an iframe
 *   2. play.xtwap.top/cepat2.php?url= -> a JW Player wrapper that we can resolve
 *      into a real HLS manifest (mp4/m3u8) that our own player can stream
 */
const OD_BASE = 'https://otakudesu.blog';
const odMatches = new Map();
const OD_TTL = 86_400_000;

export function normalizeAnimeTitle(title) {
  return clean(title.toLowerCase()
    .replace(/\([^)]*episode[^)]*\)/g, '')
    .replace(/subtitle\s+indonesia|sub\s+indo|\b(?:19|20)\d{2}\b/g, '')
    .replace(/\b(?:season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+season|s(\d+))\b/g, (_, a, b, c) => ` season${a || b || c} `)
    .replace(/\b(iv|iii|ii)\b/g, token => ` season${{ ii: 2, iii: 3, iv: 4 }[token]} `)
    .replace(/[^a-z0-9]+/g, ' '));
}

const seasons = (title) => title.match(/season\d+/g)?.join(' ') ?? '';

/**
 * 1 for the same title, 0.99 for the same words in another order, 0.9 when the
 * otakudesu title (3+ words) is a whole-word prefix of samehadaku's longer
 * light-novel title with the same season. Anything else is 0.
 */
export function titleMatchScore(candidate, normalized) {
  if (candidate === normalized) return 1;
  if (candidate.split(' ').sort().join(' ') === normalized.split(' ').sort().join(' ')) return 0.99;
  if (candidate.split(' ').length >= 3 && normalized.startsWith(candidate + ' ') && seasons(candidate) === seasons(normalized)) return 0.9;
  return 0;
}

async function odFetch(url, signal, data) {
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': UA, Referer: OD_BASE + '/', ...(data ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
    ...(data ? { method: 'POST', body: new URLSearchParams(data) } : {}),
  });
  if (!response.ok) throw new Error(`Otakudesu upstream ${response.status}`);
  return data ? response.json() : response.text();
}

async function matchOtakudesu(title, signal) {
  const normalized = normalizeAnimeTitle(title);
  const hit = odMatches.get(normalized);
  if (hit && Date.now() - hit.at < OD_TTL) return hit.url;
  const words = normalized.replace(/season\d+/g, '').trim().split(' ');
  const queries = [...new Set([title, words.slice(0, 4).join(' '), words.slice(0, 2).join(' ')])];
  for (const query of queries) {
    const $ = cheerio.load(await odFetch(`${OD_BASE}/?${new URLSearchParams({ s: query, post_type: 'anime' })}`, signal));
    const candidates = new Map();
    $('h2 a[href*="/anime/"]').each((_, el) => {
      const candidate = normalizeAnimeTitle($(el).text());
      // Token equality tolerates punctuation and word order, but never a missing season or subtitle.
      const score = titleMatchScore(candidate, normalized);
      const url = $(el).attr('href');
      if (score && new URL(url).origin === OD_BASE) candidates.set(url, score);
    });
    if (candidates.size === 1) {
      const url = [...candidates.keys()][0];
      odMatches.set(normalized, { at: Date.now(), url });
      return url;
    }
    if (candidates.size > 1) break;
  }
  odMatches.set(normalized, { at: Date.now(), url: null });
  if (odMatches.size > 1000) odMatches.delete(odMatches.keys().next().value);
  return null;
}

async function resolveOdEmbed(url, signal, depth = 0) {
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Invalid embed protocol');
  if (/\.(mp4|m3u8)$/i.test(parsed.pathname) && /(^|\.)odcloud\.net$/i.test(parsed.hostname)) {
    return { type: parsed.pathname.endsWith('.mp4') ? 'mp4' : 'hls', url };
  }
  // Only inspect the verified public player. Other hosts may require challenges.
  if (!/(^|\.)desustream\.net$/i.test(parsed.hostname)) throw new Error('Unverified embed host');
  const html = await odFetch(url, signal);
  if (/captcha|cf-chl-|challenge-platform|attestation/i.test(html)) throw new Error('Embed requires challenge');
  const file = html.match(/https?:\/\/[^"'\s<>]+\.(?:mp4|m3u8)(?:\?[^"'\s<>]*)?/i)?.[0];
  if (file) return resolveOdEmbed(file.replace(/&amp;/g, '&'), signal, depth + 1);
  const $ = cheerio.load(html);
  const inner = $('iframe[src]').first().attr('src');
  if (inner && depth < 2) return resolveOdEmbed(new URL(inner, url).href, signal, depth + 1);
  if ($('video, #player, #videoPlayer').length) return { type: 'iframe', url };
  throw new Error('No embeddable player');
}

async function getOtakudesuSources(title, number, signal) {
  const animeUrl = await matchOtakudesu(title, signal);
  if (!animeUrl) return [];
  const $ = cheerio.load(await odFetch(animeUrl, signal));
  const episodes = new Set();
  $('a[href*="/episode/"]').each((_, el) => {
    const href = $(el).attr('href');
    const episode = $(el).text().match(/episode\s*(\d+(?:\.\d+)?)(?!\d)/i);
    if (episode && Number(episode[1]) === number && new URL(href).origin === OD_BASE) episodes.add(href);
  });
  if (episodes.size !== 1) return [];
  const episodeUrl = [...episodes][0];
  const html = await odFetch(episodeUrl, signal);
  const page = cheerio.load(html);
  const mirrors = [];
  page('a[data-content]').each((_, el) => {
    if (!/^(odcdn|odstream)$/i.test(clean(page(el).text()))) return;
    try {
      const data = JSON.parse(Buffer.from(page(el).attr('data-content'), 'base64').toString());
      if (Number.isInteger(data.id) && Number.isInteger(data.i) && /^(360|480|720|1080)p$/.test(data.q)) mirrors.push(data);
    } catch { /* Ignore malformed upstream mirror data. */ }
  });
  const results = [];
  const add = async (url, quality) => {
    const stream = await resolveOdEmbed(url, signal);
    const actualQuality = stream.url.match(/[_-](\d{3,4}p)\./)?.[1] || quality;
    results.push({ label: `OD ${actualQuality || 'default'}`, provider: 'otakudesu', quality: actualQuality || null,
      type: stream.type, kind: stream.type === 'iframe' ? 'iframe' : 'resolvable', url: stream.url, host: new URL(stream.url).hostname });
  };
  const defaultUrl = page('#pembed iframe').attr('src');
  const tasks = [];
  if (defaultUrl) tasks.push(add(defaultUrl, null));
  if (mirrors.length) {
    tasks.push((async () => {
      const scripts = page('script:not([src])').map((_, el) => page(el).html()).get().join('\n');
      const nonceAction = scripts.match(/data:\s*\{\s*action:\s*["']([a-f0-9]{32})["']/)?.[1] || 'aa1208d27f29ca340c92c66d1926f13f';
      const mirrorAction = scripts.match(/nonce:[^,}]+,\s*action:\s*["']([a-f0-9]{32})["']/)?.[1] || '2a3505c93b0035d3f455df82bf976b84';
      const { data: nonce } = await odFetch(`${OD_BASE}/wp-admin/admin-ajax.php`, signal, { action: nonceAction });
      await Promise.allSettled(mirrors.map(async mirror => {
        const { data } = await odFetch(`${OD_BASE}/wp-admin/admin-ajax.php`, signal, { ...mirror, nonce, action: mirrorAction });
        const frame = cheerio.load(Buffer.from(data, 'base64').toString())('iframe').attr('src');
        if (frame) await add(frame, mirror.q);
      }));
    })());
  }
  await Promise.allSettled(tasks);
  return [...new Map(results.map(source => [source.url, source])).values()]
    .sort((a, b) => Number(a.type === 'iframe') - Number(b.type === 'iframe') || parseInt(b.quality || '0') - parseInt(a.quality || '0'));
}

export async function getEpisode(slug) {
  const odController = new AbortController();
  const odTimer = setTimeout(() => odController.abort(), 6000);
  const episodeNumber = slug.match(/episode-(\d+(?:\.\d+)?)/)?.[1];
  const odTitle = slug.replace(/-episode-.*$/, "").replaceAll("-", " ");
  let odSources = episodeNumber
    ? getOtakudesuSources(odTitle, Number(episodeNumber), odController.signal).catch(() => [])
    : Promise.resolve([]);
  const url = `${BASE}/${slug}/`;
  const html = await fetchPage(url).catch(error => { clearTimeout(odTimer); odController.abort(); throw error; });
  const $ = cheerio.load(html);

  const title = clean($('h1.entry-title').first().text());
  if (!title) {
    clearTimeout(odTimer);
    odController.abort();
    throw new Error('Episode not found');
  }
  if (!episodeNumber) {
    const number = title.match(/episode\s+(\d+(?:\.\d+)?)/i)?.[1];
    if (number) odSources = getOtakudesuSources(title.replace(/\s*episode\s+.*$/i, ''), Number(number), odController.signal).catch(() => []);
  }

  const seriesHref = $('.naveps a[href*="/anime/"]').attr('href') || $('.single-info h2[itemprop="partOfSeries"]').closest('a').attr('href');
  const seriesTitle = clean($('.single-info h2[itemprop="partOfSeries"]').text()) || null;

  const prev = $('.naveps a[rel="prev"]').attr('href') || null;
  const next = $('.naveps a[rel="next"]').attr('href') || null;

  // Raw mirror buttons from the page.
  const raw = [];
  $('button.aspd-server').each((_, el) => {
    const label = clean($(el).attr('data-label'));
    const mirrorUrl = $(el).attr('data-url');
    if (!mirrorUrl) return;
    raw.push({ label: label || `Server ${raw.length + 1}`, url: mirrorUrl, embed: $(el).attr('data-embed') || null });
  });

  // Fallback for older layouts: iframe already in the player holder.
  if (!raw.length) {
    const src = $('#pembed iframe').attr('data-litespeed-src') || $('#pembed iframe').attr('src');
    if (src && src !== 'about:blank') raw.push({ label: 'Server 1', url: src, embed: null });
  }

  const sources = raw.map((m) => {
    const host = (() => {
      try {
        return new URL(m.url).hostname;
      } catch {
        return '';
      }
    })();
    return {
      label: m.label,
      url: m.url,
      host,
      kind: host.includes('blogger') ? 'iframe' : 'resolvable',
    };
  });

  return {
    slug,
    title,
    seriesSlug: slugFromUrl(seriesHref),
    seriesTitle,
    prevSlug: slugFromUrl(prev),
    nextSlug: slugFromUrl(next),
    sources: [...await odSources.finally(() => clearTimeout(odTimer)), ...sources.sort((a, b) => Number(a.host.includes("xtwap")) - Number(b.host.includes("xtwap")))],
    raw,
  };
}

/**
 * Resolve a mirror wrapper into a direct HLS/MP4 URL.
 * The xtwap "cepat2" page returns a tiny JW Player config containing
 * sources: [{ file: "https://hls.xtwap.top/.../index.m3u8" }].
 */
export async function resolveMirror(mirrorUrl) {
  let host = '';
  try {
    host = new URL(mirrorUrl).hostname;
  } catch {
    throw new Error('Invalid mirror URL');
  }
  if (/(^|\.)(desustream.net|odcloud.net)$/.test(host)) {
    return resolveOdEmbed(mirrorUrl, AbortSignal.timeout(6000));
  }
  if (host.includes('blogger.com')) {
    return { type: 'iframe', url: mirrorUrl, host };
  }

  const html = await fetchPage(mirrorUrl, { referer: `https://${host}/` });

  const file =
    html.match(/"file"\s*:\s*"([^"]+\.m3u8[^"]*)"/i)?.[1] ||
    html.match(/"file"\s*:\s*"([^"]+\.mp4[^"]*)"/i)?.[1] ||
    html.match(/https?:\\?\/\\?\/[^"'\s]+\.m3u8[^"'\s]*/i)?.[0];

  if (!file) {
    // Some mirrors wrap yet another iframe — surface it so the UI can embed it.
    const inner = html.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
    if (inner) return { type: 'iframe', url: inner, host };
    throw new Error('No stream found in mirror');
  }

  const cleanUrl = file.replace(/\\\//g, '/');
  return {
    type: cleanUrl.includes('.m3u8') ? 'hls' : 'mp4',
    url: cleanUrl,
    host: new URL(cleanUrl).hostname,
  };
}
