const API = 'https://api.themoviedb.org/3';
const SUB_API = 'https://api.thesubtitledb.org';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36';
export const TM_VIDEO_HOST = /(^|\.)(rousav\.tech|hakunabolt\.workers\.dev|hakunaymatata\.com|vidbolt\.xyz|vercetti\.org)$/i;
let cached = (_key, _ttl, fn) => fn();
export function configureTmCache(helper) { cached = helper; }
export function parseTmSlug(slug, episode = false) {
  const match = String(slug).match(episode
    ? /^tm~(movie|tv)~([1-9]\d*)~([1-9]\d*)(?:~([1-9]\d*))?$/
    : /^tm~(movie|tv)~([1-9]\d*)$/);
  if (!match || (episode && (match[1] === 'movie' ? match[3] !== '1' || match[4] : !match[4]))) throw new Error('Invalid TMDB slug');
  return { type: match[1], id: match[2], season: Number(match[3]), episode: Number(match[4]), seriesSlug: `tm~${match[1]}~${match[2]}` };
}
async function request(url, headers = {}) {
  const response = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response;
}
function tm(path, params = {}, detail = false) {
  const query = new URLSearchParams({ language: 'id-ID', ...params });
  return cached(`tm:${path}:${query}`, detail ? 6 * 3600_000 : 3600_000, async () => {
    if (!process.env.TMDB_TOKEN) throw new Error('TMDB is not configured');
    return (await request(`${API}/${path}?${query}`, { Authorization: `Bearer ${process.env.TMDB_TOKEN}` })).json();
  });
}
const image = (path, size = 'w500') => path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
const card = (entry, type) => ({ slug: `tm~${type}~${entry.id}`, title: entry.title || entry.name,
  image: image(entry.poster_path), type: type === 'movie' ? 'Film' : 'Series', status: null,
  episode: null, episodeTitle: null, kind: 'series', url: `https://www.themoviedb.org/${type}/${entry.id}` });
export async function listTm({ type = 'movie', list = 'trending', genre = '', page = 1 } = {}) {
  if (!['movie', 'tv'].includes(type) || !['trending', 'popular', 'top', 'now', 'genre'].includes(list)) throw new Error('Invalid movie filters');
  if (genre && !/^\d+$/.test(String(genre))) throw new Error('Invalid genre');
  const route = list === 'trending' ? `trending/${type}/week` : list === 'genre' ? `discover/${type}`
    : `${type}/${list === 'top' ? 'top_rated' : list === 'now' ? type === 'movie' ? 'now_playing' : 'on_the_air' : 'popular'}`;
  const data = await tm(route, { page: String(page), ...(genre ? { with_genres: String(genre) } : {}) });
  return { items: data.results.map(entry => card(entry, type)), page, hasNext: page < data.total_pages };
}
export async function genresTm(type = 'movie') {
  if (!['movie', 'tv'].includes(type)) throw new Error('Invalid media type');
  return (await tm(`genre/${type}/list`)).genres.map(genre => ({ slug: String(genre.id), name: genre.name }));
}
export async function searchTm(query, page = 1) {
  if (!query) return { items: [], page, hasNext: false };
  const results = await Promise.all(['movie', 'tv'].map(async type => {
    const data = await tm(`search/${type}`, { query, page: String(page), include_adult: 'false' });
    return { items: data.results.map(entry => card(entry, type)), hasNext: page < data.total_pages };
  }));
  return { items: results.flatMap(result => result.items), page, query, hasNext: results.some(result => result.hasNext) };
}
export function getTmSeries(slug) {
  const { type, id } = parseTmSlug(slug);
  return cached(`tm-series:${slug}`, 6 * 3600_000, async () => {
    const data = await tm(`${type}/${id}`, {}, true);
    const english = !data.overview ? await tm(`${type}/${id}`, { language: 'en-US' }, true) : null;
    let episodes;
    if (type === 'movie') episodes = [{ slug: `${slug}~1`, number: '1', title: data.title, date: data.release_date || '', url: '', thumbnail: image(data.backdrop_path, 'w300') }];
    else {
      const seasons = data.seasons.filter(season => season.season_number > 0 && season.air_date && season.air_date <= new Date().toISOString().slice(0, 10));
      const pages = [];
      // Bound concurrent season requests for long-running shows.
      for (let start = 0; start < seasons.length; start += 4) pages.push(...await Promise.all(seasons.slice(start, start + 4).map(season => tm(`tv/${id}/season/${season.season_number}`, {}, true))));
      episodes = pages.flatMap(season => season.episodes.filter(ep => ep.air_date && ep.air_date <= new Date().toISOString().slice(0, 10)).map(ep => ({
        slug: `${slug}~${season.season_number}~${ep.episode_number}`, number: '', title: `S${season.season_number} E${ep.episode_number} · ${ep.name}`,
        date: ep.air_date, url: '', thumbnail: image(ep.still_path, 'w300'), duration: (ep.runtime || 0) * 60,
      })));
      episodes.forEach((episode, index) => { episode.number = String(index + 1); });
    }
    return { slug, title: data.title || data.name, image: image(data.poster_path), banner: image(data.backdrop_path, 'w1280'),
      synopsis: data.overview || english?.overview || null, genres: data.genres.map(genre => genre.name), genreLinks: [],
      rating: String(data.vote_average), year: (data.release_date || data.first_air_date || '').slice(0, 4),
      released: data.release_date || data.first_air_date || null, status: data.status, type: type === 'movie' ? 'Film' : 'Series',
      studio: null, season: null, trailerId: null, duration: (data.runtime || 0) * 60, episodes };
  });
}
export async function getTmEpisode(slug) {
  const { seriesSlug } = parseTmSlug(slug, true), series = await getTmSeries(seriesSlug);
  const index = series.episodes.findIndex(ep => ep.slug === slug);
  if (index < 0) throw new Error('Episode not aired or unavailable');
  return { slug, title: series.episodes[index].title, seriesSlug, seriesTitle: series.title,
    prevSlug: series.episodes[index - 1]?.slug || null, nextSlug: series.episodes[index + 1]?.slug || null, raw: [],
    sources: [false, true].map(alternate => ({ label: alternate ? 'Vidbolt alternatif' : 'Vidbolt HLS', kind: 'resolvable', type: 'hls', host: 'vidbolt.xyz',
      url: `https://vidbolt.xyz/api/resolve?slug=${slug}${alternate ? '&alternate=1' : ''}` })) };
}
export function resolveTm(slug, alternate = false) {
  const { type, id, season, episode } = parseTmSlug(slug, true);
  return cached(`tm-stream:${slug}:${alternate}`, 20 * 60_000, async () => {
    // Some Vidbolt servers hand out playlists whose segments are 403 for us,
    // so a server only counts once its first segment actually loads.
    const excluded = alternate ? [(await resolveTm(slug)).server] : [];
    let lastError = new Error('No playable Vidbolt source');
    for (let attempt = 0; attempt < 4; attempt++) {
      let data;
      try {
        const params = new URLSearchParams({ type, id, hevc: '0', ...(type === 'tv' ? { season: String(season), episode: String(episode) } : {}), ...(excluded.length ? { exclude: excluded.join(',') } : {}) });
        data = await (await request(`https://vidbolt.xyz/api/resolve?${params}`, { Referer: 'https://vidbolt.xyz/' })).json();
      } catch (error) { lastError = error; continue; }
      const server = data.stream?.server;
      if (!server) break;
      for (const source of data.stream.sources || []) {
        try {
          const url = new URL(source.url);
          if (url.protocol !== 'https:' || !TM_VIDEO_HOST.test(url.hostname)) continue;
          const master = dropDecoyVariants(await (await request(url)).text());
          if (!master.startsWith('#EXTM3U') || !(await firstSegmentLoads(url, master))) continue;
          return { type: 'hls', url: url.href, master, server };
        } catch (error) { lastError = error; }
      }
      excluded.push(server);
    }
    throw lastError;
  });
}
// Child URIs inherit the master's query: some CDNs sign every request with api_key=….
function childUrl(uri, base) {
  const url = new URL(uri, base);
  if (base.search && !url.search && url.host === base.host) url.search = base.search;
  return url;
}
// Orion masters list a top-bandwidth "tiles.m3u8" variant that is a decoy clip, not the film.
export function dropDecoyVariants(master) {
  const lines = master.split('\n');
  return lines.filter((line, index) => {
    const uri = line.startsWith('#EXT-X-STREAM-INF') ? lines[index + 1] : line;
    return !/(^|\/)tiles[^/?]*\.m3u8/i.test(uri?.trim() ?? '');
  }).join('\n');
}
const playlistUris = text => text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
async function firstSegmentLoads(masterUrl, master) {
  let playlistUrl = masterUrl, playlist = master;
  if (master.includes('#EXT-X-STREAM-INF')) {
    const variant = playlistUris(master)[0];
    if (!variant) return false;
    playlistUrl = childUrl(variant, masterUrl);
    playlist = await (await request(playlistUrl)).text();
  }
  const segment = playlistUris(playlist)[0];
  if (!segment) return false;
  const response = await fetch(childUrl(segment, playlistUrl), { headers: { 'User-Agent': UA, Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(15000) });
  await response.body?.cancel().catch(() => {});
  return response.ok;
}
export function srtToVtt(text) {
  const body = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^WEBVTT[^\n]*\n/, '').replace(/^X-TIMESTAMP-MAP=.*\n/m, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  if (!/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->/.test(body)) throw new Error('Invalid subtitle cues');
  return `WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:0,LOCAL:00:00:00.000\n\n${body.trim()}\n`;
}
export function getTmSubtitle(slug) {
  const { type, id, season, episode } = parseTmSlug(slug, true);
  return cached(`tm-sub:${slug}`, 6 * 3600_000, async () => {
    const route = type === 'movie' ? `movie/${id}` : `tv/${id}/season/${season}/episode/${episode}`;
    for (let offset = 0; ; offset += 100) {
      const response = await fetch(`${SUB_API}/v1/by-tmdb/${route}?limit=100&offset=${offset}`, { signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Subtitle upstream ${response.status}`);
      const data = await response.json(), items = data.subtitles?.items || [];
      const candidates = items.filter(item => item.language === 'id' && ['srt', 'vtt'].includes(item.format))
        .sort((a, b) => Number(b.format === 'srt') - Number(a.format === 'srt'));
      for (const item of candidates) {
        try {
          const vtt = srtToVtt(await (await request(`${SUB_API}/get/${encodeURIComponent(item.id)}`)).text());
          const times = [...vtt.matchAll(/-->\s*(\d+):(\d+):(\d+)\.(\d+)/g)];
          const duration = Math.ceil(Math.max(Number(item.duration_s) || 0, ...times.map(m => Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000))) + 1;
          return { vtt, duration };
        } catch { /* Try the next release if this file cannot be converted. */ }
      }
      if (!items.length || offset + items.length >= (data.subtitles?.total || 0)) return null;
    }
  });
}
export function injectTmSubtitle(master, uri) {
  if (!master.includes('#EXT-X-STREAM-INF:')) return master;
  const lines = master.split('\n').map(line => {
    if (line.startsWith('#EXT-X-MEDIA:TYPE=SUBTITLES')) return line.replace(/DEFAULT=YES/g, 'DEFAULT=NO');
    if (!line.startsWith('#EXT-X-STREAM-INF:')) return line;
    return /SUBTITLES="[^"]*"/.test(line) ? line.replace(/SUBTITLES="[^"]*"/, 'SUBTITLES="subs"') : `${line.trim()},SUBTITLES="subs"`;
  });
  // Keep English tracks reachable when an upstream uses a different subtitle group name.
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith('#EXT-X-MEDIA:TYPE=SUBTITLES')) lines[i] = lines[i].replace(/GROUP-ID="[^"]*"/, 'GROUP-ID="subs"');
  lines.splice(1, 0, `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Indonesia",LANGUAGE="id",DEFAULT=YES,AUTOSELECT=YES,URI="${uri}"`);
  return lines.join('\n');
}
