import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, rename, readdir, rm, stat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const directory = fileURLToPath(new URL('./.cache/apk/', import.meta.url));
const repository = 'gafnaa/anistream';
let releaseCache;
let releasePending;
let downloadPending;

export function releaseToPayload(release) {
  const asset = release?.assets?.find(asset => typeof asset.name === 'string' && asset.name.endsWith('.apk'));
  if (!asset || path.basename(asset.name) !== asset.name || !Number.isFinite(asset.size) || asset.size <= 0) throw new Error('Release has no valid APK asset');
  if (typeof release.tag_name !== 'string' || !release.tag_name) throw new Error('Release has no tag');
  return { version: release.tag_name.replace(/^v/, ''), tag: release.tag_name,
    notes: release.body || '', publishedAt: release.published_at, size: asset.size, apkUrl: '/api/app/apk' };
}

export function latestRelease() {
  if (releaseCache && Date.now() - releaseCache.at < 600_000) return Promise.resolve(releaseCache);
  if (!releasePending) releasePending = (async () => {
    const { stdout } = await exec('gh', ['api', `repos/${repository}/releases/latest`], { timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    const release = JSON.parse(stdout);
    const payload = releaseToPayload(release);
    const asset = release.assets.find(asset => asset.name.endsWith('.apk'));
    releaseCache = { at: Date.now(), payload, asset };
    return releaseCache;
  })().finally(() => { releasePending = undefined; });
  return releasePending;
}

export async function latestApk() {
  // Serialize across releases too, so cleanup cannot race a second download.
  if (downloadPending) return downloadPending;
  downloadPending = (async () => {
    const { payload, asset } = await latestRelease();
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, asset.name);
    const marker = path.join(directory, `${asset.name}.release`);
    const identity = `${payload.tag}:${asset.id}:${asset.updated_at}`;
    const valid = await Promise.all([stat(destination).then(value => value.size === asset.size).catch(() => false),
      readFile(marker, 'utf8').then(value => value === identity).catch(() => false)]);
    if (!valid.every(Boolean)) {
      const temporary = await mkdtemp(path.join(directory, '.download-'));
      try {
        await exec('gh', ['release', 'download', payload.tag, '--repo', repository, '-p', '*.apk', '-D', temporary, '--clobber'], { timeout: 600_000 });
        const source = path.join(temporary, asset.name);
        if ((await stat(source)).size !== asset.size) throw new Error('APK size does not match release');
        await rename(source, destination);
        await writeFile(marker, identity);
      } finally { await rm(temporary, { recursive: true, force: true }); }
    }
    for (const name of await readdir(directory)) {
      if (name !== asset.name && name !== `${asset.name}.release`) await rm(path.join(directory, name), { recursive: true, force: true });
    }
    return { file: destination, name: asset.name };
  })().finally(() => { downloadPending = undefined; });
  return downloadPending;
}
