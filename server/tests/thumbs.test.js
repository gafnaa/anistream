import test from 'node:test';
import assert from 'node:assert/strict';
import { frameArgs, playableUrls, thumbPath, getThumb } from '../thumbs.js';

test('frameArgs seeks before the input and outputs one 480x270 frame', () => {
  const args = frameArgs('http://x/v.mp4', 330, '/tmp/o.jpg');
  assert.ok(args.indexOf('-ss') < args.indexOf('-i'));
  assert.equal(args[args.indexOf('-frames:v') + 1], '1');
  assert.match(args.join(' '), /crop=480:270/);
  assert.equal(args.at(-1), '/tmp/o.jpg');
});

test('thumbPath is stable and filesystem-safe', () => {
  assert.equal(thumbPath('od~a-episode-1'), thumbPath('od~a-episode-1'));
  assert.match(thumbPath('../../etc'), /[0-9a-f]{40}\.jpg$/);
});

test('uncached Mirainime thumbnails do not request signed playback streams', async () => {
  await assert.rejects(getThumb('mn~test-thumbnail-quota~1', 'http://127.0.0.1:1'), /Thumbnail unavailable/);
});

test('playableUrls resolves mirrors in order, skips iframes and makes proxy URLs absolute', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (url.includes('/api/episode/')) return { ok: true, json: async () => ({ sources: [
      { kind: 'iframe', url: 'https://blogger.com/a' },
      { kind: 'resolvable', url: 'https://dead.example/m' },
      { kind: 'resolvable', url: 'https://ok.example/m' },
    ] }) };
    if (url.includes('dead.example')) return { ok: false, status: 502 };
    return { ok: true, json: async () => ({ playUrl: '/api/video?url=x' }) };
  };
  assert.deepEqual(await playableUrls('ep-1', 'http://127.0.0.1:5178', fetchImpl), ['http://127.0.0.1:5178/api/video?url=x']);
  assert.ok(!seen.some(url => url.includes('blogger')));
});
