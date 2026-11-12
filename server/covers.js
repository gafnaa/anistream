import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeAnimeTitle, titleMatchScore } from './scraper.js';

/**
 * Samehadaku's covers are ~225x317 originals, so they look soft on phones.
 * Swap in AniList's extraLarge cover when the title matches confidently.
 */
const CACHE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache', 'covers.json');
const MISS_TTL = 7 * 86_400_000;
const CHUNK = 20;

let store = null;
const inflight = new Map();
let saveTimer = null;
let persist = true;

function load() {
  if (store) return store;
  try {
    store = new Map(Object.entries(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))));
  } catch {
    store = new Map();
  }
  return store;
}

function save() {
  if (!persist) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFile(CACHE_FILE, JSON.stringify(Object.fromEntries(store)), () => {});
  }, 1000);
  saveTimer.unref?.();
}

/** Pick the first candidate whose romaji, English or synonym title matches ours. */
export function pickCover(candidates, normalized, year = null) {
  for (const media of [candidates].flat()) {
    if (!media?.coverImage) continue;
    // normalizeAnimeTitle drops years, so "Rayearth (2026)" must not take the 1994 cover.
    if (year && media.seasonYear !== year) continue;
    const names = [media.title?.romaji, media.title?.english, ...(media.synonyms || [])].filter(Boolean);
    if (names.some(name => titleMatchScore(normalizeAnimeTitle(name), normalized) >= 0.99)) {
      return media.coverImage.extraLarge || media.coverImage.large || null;
    }
  }
  return null;
}

const titleYear = (title) => Number(title.match(/\((\d{4})\)/)?.[1]) || null;

/** Cache key: the normalized title plus any "(2026)" year, which normalizing drops. */
const coverKey = (title) => {
  const key = normalizeAnimeTitle(title || '');
  const year = titleYear(title || '');
  return key && year ? `${key} ${year}` : key;
};

/** AniList's search misses "2nd Season"/"(2026)" spellings, so search the bare name and match strictly. */
export function searchTerm(title) {
  return title
    .replace(/\(\d{4}\)/g, ' ')
    .replace(/\b(?:season\s*\d+|\d+(?:st|nd|rd|th)\s+season|part\s*\d+|ii|iii|iv)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim() || title;
}

async function queryChunk(titles, fetchImpl) {
  const vars = titles.map((_, i) => `$t${i}: String`).join(', ');
  const fields = titles
    .map((_, i) => `a${i}: Page(perPage: 8) { media(search: $t${i}, type: ANIME) { coverImage { extraLarge large } title { romaji english } synonyms seasonYear } }`)
    .join('\n');
  const res = await fetchImpl('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: `query (${vars}) {\n${fields}\n}`, variables: Object.fromEntries(titles.map((t, i) => [`t${i}`, searchTerm(t)])) }),
    signal: AbortSignal.timeout(10_000),
  });
  // Page() returns an empty list for unknown titles; a bare Media() 404s the whole batch.
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.data) throw new Error(`AniList ${res.status}`);
  return titles.map((_, i) => body.data[`a${i}`]?.media ?? []);
}

/** Resolve covers for many titles; returns Map(coverKey -> url|null). Never throws. */
export async function lookupCovers(titles, { fetchImpl = fetch, now = Date.now() } = {}) {
  const cache = load();
  const result = new Map();
  const todo = new Map();
  for (const title of titles) {
    const key = coverKey(title);
    if (!key || result.has(key) || todo.has(key)) continue;
    const hit = cache.get(key);
    if (hit && (hit.url || now - hit.at < MISS_TTL)) result.set(key, hit.url);
    else if (inflight.has(key)) todo.set(key, inflight.get(key));
    else todo.set(key, title);
  }

  const fresh = [...todo].filter(([, v]) => typeof v === 'string');
  for (let i = 0; i < fresh.length; i += CHUNK) {
    const chunk = fresh.slice(i, i + CHUNK);
    const job = queryChunk(chunk.map(([, title]) => title), fetchImpl).then(medias => {
      chunk.forEach(([key, title], j) => cache.set(key, { url: pickCover(medias[j], normalizeAnimeTitle(title), titleYear(title)), at: now }));
      save();
    });
    for (const [key] of chunk) {
      const p = job.then(() => cache.get(key)?.url ?? null).catch(() => null).finally(() => inflight.delete(key));
      inflight.set(key, p);
      todo.set(key, p);
    }
  }

  await Promise.all([...todo].map(async ([key, p]) => result.set(key, await p)));
  return result;
}

/** Replace `image` (and a matching `banner`) on each item that has a confident AniList cover. */
export async function enrichCovers(items, opts) {
  const list = (items || []).filter(item => item?.title);
  if (!list.length) return items;
  const covers = await lookupCovers(list.map(item => item.title), opts);
  for (const item of list) {
    const url = covers.get(coverKey(item.title));
    if (!url) continue;
    if (item.banner && item.banner === item.image) item.banner = url;
    item.image = url;
  }
  return items;
}

/** Test hook. */
export function resetCoverCache() {
  persist = false;
  store = new Map();
  inflight.clear();
}
