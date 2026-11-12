import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Episode thumbnails: no upstream has per-episode artwork, so grab one frame
 * from the episode itself with ffmpeg and keep the JPEG on disk forever.
 * Frames come through our own /api/episode, /api/resolve and proxy routes on
 * localhost, so host allowlists and upstream headers stay in one place.
 */
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache', 'thumbs');
const FAIL_TTL = 3_600_000;
const CONCURRENCY = 2;
// Past a typical cold open + opening song, early enough to avoid big spoilers.
const SEEK_SECONDS = [330, 90];

const failures = new Map();
const jobs = new Map();
const queue = [];
let running = 0;

export const thumbPath = (slug) => path.join(DIR, `${createHash('sha1').update(slug).digest('hex')}.jpg`);

/** ffmpeg arguments for one small 16:9 JPEG frame taken at `seconds`. */
export function frameArgs(input, seconds, output) {
  return ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(seconds), '-rw_timeout', '15000000', '-i', input,
    '-frames:v', '1', '-vf', 'scale=480:270:force_original_aspect_ratio=increase,crop=480:270', '-q:v', '5', output];
}

function runFfmpeg(args, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve() : reject(new Error(stderr.trim().split('\n').pop() || `ffmpeg exited ${code}`));
    });
  });
}

/** Playable URLs for an episode, in the same order the app tries them. */
export async function playableUrls(slug, base, fetchImpl = fetch) {
  const getJson = async (url) => {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return res.json();
  };
  const episode = await getJson(`${base}/api/episode/${encodeURIComponent(slug)}`);
  const urls = [];
  for (const source of episode.sources || []) {
    if (source.kind !== 'resolvable' || source.type === 'iframe') continue;
    try {
      const stream = await getJson(`${base}/api/resolve?mirror=${encodeURIComponent(source.url)}`);
      const url = stream.playUrl || stream.url;
      if (url) urls.push(new URL(url, base).href);
    } catch {
      // Try the next mirror.
    }
    if (urls.length >= 2) break;
  }
  return urls;
}

async function generate(slug, base) {
  const output = thumbPath(slug);
  const tmp = `${output}.${process.pid}.tmp.jpg`;
  fs.mkdirSync(DIR, { recursive: true });
  for (const url of await playableUrls(slug, base)) {
    for (const seconds of SEEK_SECONDS) {
      try {
        await runFfmpeg(frameArgs(url, seconds, tmp));
        if (fs.statSync(tmp).size > 1000) {
          fs.renameSync(tmp, output);
          return output;
        }
      } catch {
        // Too short for this seek point, or the mirror failed: keep trying.
      }
    }
  }
  fs.rmSync(tmp, { force: true });
  throw new Error('No playable source for a thumbnail');
}

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const { slug, base, resolve, reject } = queue.shift();
    running += 1;
    generate(slug, base).then(resolve, reject).finally(() => {
      running -= 1;
      pump();
    });
  }
}

/**
 * Path to the episode's thumbnail, generating it if needed. Rejects when no
 * source works; that failure is remembered for an hour.
 */
export function getThumb(slug, base) {
  const file = thumbPath(slug);
  if (fs.existsSync(file)) return Promise.resolve(file);
  // Mirainime signs every episode request; browsing rows must not consume its playback quota.
  if (slug.startsWith('mn~')) return Promise.reject(new Error('Thumbnail unavailable'));
  const failedAt = failures.get(slug);
  if (failedAt && Date.now() - failedAt < FAIL_TTL) return Promise.reject(new Error('Thumbnail unavailable'));
  if (!jobs.has(slug)) {
    const job = new Promise((resolve, reject) => {
      queue.push({ slug, base, resolve, reject });
      pump();
    }).catch(err => {
      failures.set(slug, Date.now());
      throw err;
    }).finally(() => jobs.delete(slug));
    jobs.set(slug, job);
  }
  return jobs.get(slug);
}

/** Queue thumbnails in the background (e.g. for the latest episodes). */
export function warmThumbs(slugs, base) {
  for (const slug of slugs) getThumb(slug, base).catch(() => {});
}
