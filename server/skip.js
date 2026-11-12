const DAY = 86_400_000;
const titles = new Map();
const skips = new Map();
const empty = () => ({ malId: null, intervals: [] });

export function mapSkipIntervals(body) {
  if (!body?.found || !Array.isArray(body.results)) return [];
  const types = { op: 'op', ed: 'ed', 'mixed-op': 'op', 'mixed-ed': 'ed', recap: 'recap' };
  return body.results.flatMap(result => {
    const type = types[result?.skipType];
    const start = result?.interval?.startTime;
    const end = result?.interval?.endTime;
    return type && Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start
      ? [{ type, start, end }] : [];
  }).sort((a, b) => a.start - b.start);
}

async function json(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'AniStream/1.0', ...options.headers } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Skip upstream ${response.status}`);
  return response.json();
}
function read(cache, key) {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  cache.delete(key);
}
function write(cache, key, value, ttl) {
  if (cache.size >= 5000) {
    for (const [key, hit] of cache) if (hit.until <= Date.now()) cache.delete(key);
    if (cache.size >= 5000) cache.delete(cache.keys().next().value);
  }
  cache.set(key, { value, until: Date.now() + ttl });
  return value;
}
export async function getSkipTimes(title, episode, duration = 0) {
  const normalized = typeof title === 'string' ? title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
  episode = Number(episode);
  duration = Math.max(0, Math.round(Number(duration) || 0));
  if (!normalized || !Number.isFinite(episode) || episode <= 0 || !Number.isFinite(duration)) return empty();
  try {
    let malId = read(titles, normalized);
    if (malId === undefined) {
      const body = await json('https://graphql.anilist.co', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'query ($title: String!) { Media(search: $title, type: ANIME) { idMal } }', variables: { title: title.trim() } }) });
      if (body?.errors) throw new Error('AniList query failed');
      malId = body?.data?.Media?.idMal ?? null;
      write(titles, normalized, malId, malId ? 7 * DAY : DAY);
    }
    if (!malId) return empty();
    const key = `${malId}:${episode}:${duration}`;
    let result = read(skips, key);
    if (result === undefined) {
      const params = new URLSearchParams({ episodeLength: String(duration) });
      for (const type of ['op', 'ed', 'mixed-op', 'mixed-ed', 'recap']) params.append('types', type);
      const body = await json(`https://api.aniskip.com/v2/skip-times/${malId}/${episode}?${params}`);
      const intervals = mapSkipIntervals(body);
      result = write(skips, key, intervals.length ? { malId, intervals } : empty(), DAY);
    }
    return result;
  } catch {
    return empty();
  }
}
