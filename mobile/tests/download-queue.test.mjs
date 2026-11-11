import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DownloadQueue, canDownload } from '../src/downloads/queue.ts';
function fixture() {
  let raw = null;
  const storage = { async getItem() { return raw; }, async setItem(_, value) { raw = value; } };
  return { storage, queue: new DownloadQueue(storage) };
}
const wifi = { connected: true, wifi: true };
const cellular = { connected: true, wifi: false };
const record = slug => ({ slug, seriesSlug: 'series', seriesTitle: 'Title', title: 'Episode', episode: '1', poster: '', url: 'https://cdn.example/episode.mp4', quality: '720p', fileUri: `file:///${slug}.mp4`, status: 'queued', bytes: 0, total: 100 });
test('queue serializes writes and prevents duplicate episodes and concurrent transfers', async () => {
  const { queue } = fixture(); await queue.load();
  await Promise.all([queue.add(record('a')), queue.add(record('a')), queue.add(record('b'))]);
  assert.equal(queue.snapshot().length, 2);
  await Promise.all([queue.start('a', wifi, true), queue.start('b', wifi, true)]);
  assert.deepEqual(queue.snapshot().map(item => item.status), ['downloading', 'queued']);
});
test('pause, resume, failure, retry, completion and removal retain metadata', async () => {
  const { queue } = fixture(); await queue.load(); await queue.add(record('a')); await queue.start('a', wifi, true);
  await queue.patch('a', { status: 'paused', bytes: 40, resumeData: 'opaque-token' }); await queue.resume('a');
  await queue.start('a', wifi, true); assert.equal(queue.snapshot()[0].resumeData, 'opaque-token');
  await queue.patch('a', { status: 'failed' }); await queue.resume('a'); await queue.start('a', wifi, true);
  await queue.patch('a', { status: 'ready', bytes: 100, resumeData: undefined }); await queue.resume('a');
  assert.equal(queue.snapshot()[0].status, 'ready'); assert.equal(queue.snapshot()[0].seriesTitle, 'Title');
  await queue.remove('a'); assert.equal(queue.snapshot().length, 0);
});
test('restart recovers interrupted work as paused and preserves resume tokens, completed and queued items', async () => {
  const { queue, storage } = fixture(); await queue.load();
  await queue.add(record('active')); await queue.add({ ...record('ready'), status: 'ready' }); await queue.add(record('queued'));
  await queue.start('active', wifi, true); await queue.patch('active', { bytes: 40, resumeData: 'checkpoint' });
  const restarted = new DownloadQueue(storage); await restarted.load();
  assert.deepEqual(restarted.snapshot().map(item => item.status), ['paused', 'ready', 'queued']);
  assert.equal(restarted.snapshot()[0].resumeData, 'checkpoint'); await restarted.resume('active');
  await restarted.start('active', wifi, true); assert.equal(restarted.snapshot()[0].bytes, 40);
});
test('Wi-Fi gate blocks cellular by default and blocks offline even when cellular is allowed', async () => {
  const { queue } = fixture(); await queue.load(); await queue.add(record('a'));
  await queue.start('a', cellular, true); assert.equal(queue.snapshot()[0].status, 'queued');
  await queue.start('a', { connected: false, wifi: true }, false); assert.equal(queue.snapshot()[0].status, 'queued');
  await queue.start('a', cellular, false); assert.equal(queue.snapshot()[0].status, 'downloading');
  assert.equal(canDownload(wifi, true), true);
});
test('corrupt storage is surfaced without overwriting it, invalid entries are rejected', async () => {
  const queue = new DownloadQueue({ async getItem() { return '{broken'; }, async setItem() { assert.fail('must not overwrite'); } });
  await queue.load(); assert.equal(queue.error, true); assert.equal(queue.hydrated, true);
  const invalid = new DownloadQueue({ async getItem() { return JSON.stringify([{ slug: 'bad', status: 'ready' }]); }, async setItem() {} });
  await invalid.load(); assert.deepEqual(invalid.snapshot(), []);
});
test('failed persistence does not publish an uncommitted state and can be retried', async () => {
  let fail = false;
  const queue = new DownloadQueue({ async getItem() { return null; }, async setItem() { if (fail) throw Error('disk full'); } });
  await queue.load(); fail = true; await assert.rejects(queue.add(record('a'))); assert.equal(queue.snapshot().length, 0);
  fail = false; await queue.add(record('a')); assert.equal(queue.snapshot().length, 1);
});
test('a mutation requested during hydration waits for recovered records', async () => {
  let finishRead;
  const read = new Promise(resolve => { finishRead = resolve; });
  const queue = new DownloadQueue({ async getItem() { return read; }, async setItem() {} });
  const load = queue.load(); const add = queue.add(record('new'));
  finishRead(JSON.stringify([{ ...record('old'), status: 'downloading' }]));
  await Promise.all([load, add]);
  assert.deepEqual(queue.snapshot().map(item => [item.slug, item.status]), [['old', 'paused'], ['new', 'queued']]);
});
