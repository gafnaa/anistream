import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

const directory = new URL('./.cache/artwork/', import.meta.url);
const inflight = new Map();

export function isCoverUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://s4.anilist.co' && !url.search && !url.hash &&
      /^\/file\/anilistcdn\/media\/anime\/cover\/(extraLarge|large|medium)\/[a-z0-9_-]+\.(jpg|png|webp)$/i.test(url.pathname);
  } catch { return false; }
}

export function coverResponse(value, origin, suffix = '') {
  return JSON.parse(JSON.stringify(value, (field, item) =>
    (field === 'image' || field === 'banner') && isCoverUrl(item)
      ? `${origin}/api/cover?url=${encodeURIComponent(item)}${suffix}` : item));
}

/** Keep artwork on our API origin so phones need no direct connection to AniList. */
export async function coverFile(url) {
  if (!isCoverUrl(url)) throw new Error('Invalid cover URL');
  const file = new URL(`${createHash('sha256').update(url).digest('hex')}.${new URL(url).pathname.split('.').pop()}`, directory);
  try { await fs.access(file); return file; } catch { /* Fetch uncached artwork. */ }
  if (!inflight.has(url)) {
    const job = (async () => {
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error('Cover unavailable');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 10_000_000) throw new Error('Invalid cover size');
      await fs.mkdir(directory, { recursive: true });
      const temporary = new URL(`${file.href}.tmp`);
      await fs.writeFile(temporary, bytes);
      await fs.rename(temporary, file);
      return file;
    })().finally(() => inflight.delete(url));
    inflight.set(url, job);
  }
  return inflight.get(url);
}
