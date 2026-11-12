import * as cheerio from 'cheerio';

export const MN_BASE = 'https://mirainime.com';
export const MN_VIDEO_HOST = /(^|\.)(arianeglenys|suguha|ichinose)\.my\.id$/i;
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

export function mnUrl(slug, episode = false) {
  const match = String(slug).match(episode ? /^mn~([a-z0-9-]+)~([1-9]\d*)$/ : /^mn~([a-z0-9-]+)$/);
  if (!match || match[0] !== slug) throw new Error('Invalid Mirainime slug');
  return `${MN_BASE}/anime/${match[1]}${episode ? `/episode/${match[2]}` : ''}`;
}

function slugFromLink(href, episode = false) {
  try {
    const url = new URL(href, MN_BASE);
    const match = url.pathname.match(episode ? /^\/anime\/([a-z0-9-]+)\/episode\/([1-9]\d*)\/?$/ : /^\/anime\/([a-z0-9-]+)\/?$/);
    return url.origin === MN_BASE && match ? `mn~${match[1]}${episode ? `~${match[2]}` : ''}` : null;
  } catch { return null; }
}

export function parseMnSearch(html) {
  const $ = cheerio.load(html), items = [];
  $('.ctx-card[data-ctx-type="anime"]').each((_, el) => {
    const card = $(el), a = card.find('h3 a, h2 a').first(), slug = slugFromLink(a.attr('href'));
    if (!slug || items.some(item => item.slug === slug)) return;
    const metadata = card.find('span').map((_, node) => clean($(node).text())).get();
    items.push({ slug, title: clean(a.text()), image: card.find('img').first().attr('src') || null,
      type: metadata.find(text => /^(TV|Movie|OVA|ONA|Special|Music)$/i.test(text)) || null,
      status: metadata.find(text => /^(Complete|Ongoing|Upcoming)$/i.test(text)) || null,
      episodeTitle: null, episode: null, kind: 'series', url: mnUrl(slug) });
  });
  return { items, hasNext: $('a[rel="next"]').length > 0 };
}

export function parseMnOptions(html) {
  const json = html.match(/window\.b2PlayerOptions\s*=\s*({[^\n]+});/)?.[1];
  if (!json) throw new Error('Mirainime player options missing');
  return JSON.parse(json);
}

export function parseMnEpisodes(options, slug) {
  mnUrl(slug);
  const episodes = new Map();
  for (const entry of options.episodes || []) {
    const number = String(entry.episode_number), episodeSlug = `${slug}~${number}`;
    try { mnUrl(episodeSlug, true); } catch { continue; }
    episodes.set(number, { slug: episodeSlug, number, title: `Episode ${number}${entry.title ? ` - ${clean(entry.title)}` : ''}`,
      date: '', url: mnUrl(episodeSlug, true) });
  }
  if (options.epTotal && episodes.size !== Number(options.epTotal)) throw new Error('Incomplete Mirainime episode list');
  return [...episodes.values()].sort((a, b) => Number(a.number) - Number(b.number));
}

export function parseMnSeries(html, slug, options) {
  mnUrl(slug);
  const $ = cheerio.load(html), heading = $('h2').filter((_, el) => $(el).attr('class')?.includes('text-xl')).first();
  const title = clean(heading.text());
  if (!title) throw new Error('Series not found');
  const info = heading.parent().parent(), badges = heading.parent().next('div').find('span').map((_, el) => clean($(el).text())).get();
  const field = label => clean(info.find('span').filter((_, el) => clean($(el).text()) === label).first().next('p').text()) || null;
  const image = $('#mobile-anime-poster-image').attr('src') || null;
  const genreLinks = $('[itemprop="genre"] a').map((_, el) => ({ name: clean($(el).text()), slug: new URL($(el).attr('href'), MN_BASE).pathname.split('/').pop() })).get();
  return { slug, title, image, banner: image, synopsis: clean($('[itemprop="description"]').first().text()) || null,
    genres: genreLinks.map(item => item.name), genreLinks, trailerId: null, status: badges[0] || null,
    type: badges[1] || null, rating: badges[2]?.replace(/[^\d.]/g, '') || null, studio: field('Studio'),
    season: field('Season'), released: null, episodes: parseMnEpisodes(options, slug) };
}

export function parseMnEpisode(html, slug) {
  mnUrl(slug, true);
  const options = parseMnOptions(html), seriesSlug = slug.slice(0, slug.lastIndexOf('~'));
  return { slug, title: clean(options.title), seriesSlug, seriesTitle: null,
    prevSlug: slugFromLink(options.prevUrl, true), nextSlug: slugFromLink(options.nextUrl, true), raw: [] };
}

export function mapMnSources(data) {
  const sources = [];
  for (const entry of [...(data.gdrive_sources || []), ...(data.stream_urls || [])]) {
    for (const candidate of [entry, ...(entry.alternates || [])]) {
      try {
        const url = new URL(candidate.url);
        if (url.protocol !== 'https:' || !MN_VIDEO_HOST.test(url.hostname) || !/\.mp4$/i.test(url.pathname)) continue;
        if (sources.some(source => source.url === url.href)) continue;
        sources.push({ label: `MN ${entry.resolution || 'MP4'} (${url.hostname})`, quality: entry.resolution || null,
          kind: 'resolvable', url: url.href, host: url.hostname });
      } catch { /* Ignore malformed or unsupported upstream streams. */ }
    }
  }
  return sources;
}

async function request(url, { jar = new Map(), headers = {}, signal = AbortSignal.timeout(12000) } = {}) {
  const response = await fetch(url, { signal, headers: { 'User-Agent': 'Mozilla/5.0', Referer: `${MN_BASE}/`,
    Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '), ...headers } });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], split = pair.indexOf('=');
    if (split > 0) jar.set(pair.slice(0, split), pair.slice(split + 1));
  }
  if (!response.ok) throw new Error(`Mirainime upstream ${response.status}`);
  return response;
}

export async function searchMn(query, page) {
  return parseMnSearch(await (await request(`${MN_BASE}/anime-list?${new URLSearchParams({ q: query, tab: 'anime', page: String(page) })}`)).text());
}

export async function getMnSeries(slug) {
  const url = mnUrl(slug), html = await (await request(url)).text();
  const $ = cheerio.load(html);
  const first = $('a[href*="/episode/"]').map((_, el) => $(el).attr('href')).get()
    .find(href => slugFromLink(href, true)?.startsWith(`${slug}~`));
  if (!first) throw new Error('Mirainime episodes missing');
  const options = parseMnOptions(await (await request(first)).text());
  return parseMnSeries(html, slug, options);
}

export async function getMnEpisode(slug) {
  const url = mnUrl(slug, true), jar = new Map(), signal = AbortSignal.timeout(15000);
  const html = await (await request(url, { jar, signal })).text(), options = parseMnOptions(html);
  const number = slug.split('~')[2], tokens = options.streamTokens;
  if (!tokens?.exp || !tokens.sigs?.[number]) throw new Error('Mirainime stream token missing');
  const data = await (await request(`${url}/json?preflight=1`, { jar, signal, headers: {
    Accept: 'application/json', 'X-Stream-Token': `${tokens.exp}.${tokens.sigs[number]}`, Referer: url,
  } })).json();
  return { ...parseMnEpisode(html, slug), seriesTitle: clean(data.anime_title) || null, sources: mapMnSources(data) };
}
