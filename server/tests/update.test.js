import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseToPayload } from '../update.js';
const release = { tag_name: 'v0.4.1', body: 'Fixes', published_at: '2026-11-12T00:00:00Z', assets: [{ name: 'notes.txt', size: 1 }, { name: 'app.apk', size: 42 }, { name: 'other.apk', size: 80 }] };
test('maps release metadata and selects the first APK', () => {
  assert.deepEqual(releaseToPayload(release), { version: '0.4.1', tag: 'v0.4.1', notes: 'Fixes', publishedAt: release.published_at, size: 42, apkUrl: '/api/app/apk' });
});
test('supports unprefixed tags and empty notes', () => {
  assert.equal(releaseToPayload({ ...release, tag_name: '1.0.0', body: null }).version, '1.0.0');
  assert.equal(releaseToPayload({ ...release, body: null }).notes, '');
});
test('rejects missing APK, unsafe names, invalid size and missing tag', () => {
  for (const change of [{ assets: [] }, { assets: [{ name: '../app.apk', size: 42 }] }, { assets: [{ name: 'app.apk', size: 0 }] }, { tag_name: null }]) assert.throws(() => releaseToPayload({ ...release, ...change }));
});
