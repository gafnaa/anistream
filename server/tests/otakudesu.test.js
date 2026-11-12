import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEpisode, normalizeAnimeTitle, resolveMirror, titleMatchScore } from '../scraper.js';

test('title normalization retains season and distinguishing subtitles', () => {
  const expected = normalizeAnimeTitle('Tensei shitara Ken deshita II');
  for (const suffix of ['Season 2', '2nd Season', 'S2']) {
    assert.equal(normalizeAnimeTitle(`Tensei shitara Ken deshita ${suffix} (2026) Sub Indo`), expected);
  }
  assert.notEqual(normalizeAnimeTitle('Tensei shitara Ken deshita'), expected);
  assert.notEqual(normalizeAnimeTitle('Example Part 2'), normalizeAnimeTitle('Example'));
});

test('public AJAX, exact episode selection, source ordering, and cached misses', async () => {
  const original = globalThis.fetch;
  const calls = [];
  const mp4 = 'https://cdn.odcloud.net/anime/Test_720p.mp4';
  const payload = Buffer.from(JSON.stringify({ id: 12, i: 0, q: '720p' })).toString('base64');
  globalThis.fetch = async (url, options = {}) => {
    url = String(url);
    calls.push(url);
    if (url.includes('samehadaku')) return new Response(`<h1 class="entry-title">Fixture Episode 7</h1>
      <button class="aspd-server" data-url="https://play.xtwap.top/test" data-label="HD-1"></button>
      <button class="aspd-server" data-url="https://www.blogger.com/video.g?token=test" data-label="HD-2"></button>`);
    if (url.includes('?s=')) return new Response(url.includes('missing') ? '' : '<h2><a href="https://otakudesu.blog/anime/fixture/">Fixture Season 2 Subtitle Indonesia</a></h2>');
    if (url.includes('/anime/')) return new Response('<a href="https://otakudesu.blog/episode/other/">Fixture Episode 17</a><a href="https://otakudesu.blog/episode/fixture/">Fixture Episode 7</a>');
    if (url.includes('/episode/')) return new Response(`<a data-content="${payload}">odcdn</a><script>data:{action:"11111111111111111111111111111111"};data:{nonce:a,action:"22222222222222222222222222222222"}</script>`);
    if (url.includes('admin-ajax')) {
      const data = options.body;
      if (data.get('action') === '11111111111111111111111111111111') return Response.json({ data: 'test-nonce' });
      assert.equal(data.get('action'), '22222222222222222222222222222222');
      assert.equal(data.get('nonce'), 'test-nonce');
      assert.equal(data.get('q'), '720p');
      return Response.json({ data: Buffer.from('<iframe src="https://desustream.net/test"></iframe>').toString('base64') });
    }
    if (url.includes('desustream')) return new Response(`const videoURL = "${mp4}";`);
    throw new Error(`Unexpected URL ${url}`);
  };
  try {
    const episode = await getEpisode('fixture-ii-episode-7-subtitle-indonesia');
    assert.equal(episode.sources[0].url, mp4);
    assert.equal(episode.sources[0].quality, '720p');
    assert.equal(episode.sources[0].provider, 'otakudesu');
    assert.equal(episode.sources[1].kind, 'iframe');
    assert.match(episode.sources[2].url, /xtwap/);
    assert.deepEqual(await resolveMirror(mp4), { type: 'mp4', url: mp4 });
    await getEpisode('missing-episode-7-subtitle-indonesia');
    const before = calls.filter(url => url.includes('?s=')).length;
    await getEpisode('missing-episode-8-subtitle-indonesia');
    assert.equal(calls.filter(url => url.includes('?s=')).length, before);
  } finally {
    globalThis.fetch = original;
  }
});

test('lookup deadline preserves samehadaku mirrors', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('samehadaku')) return new Response('<h1 class="entry-title">Timeout Episode 1</h1><button class="aspd-server" data-label="HD-1" data-url="https://www.blogger.com/video.g?token=test"></button>');
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true }));
  };
  try {
    const start = Date.now();
    const episode = await getEpisode('timeout-episode-1-subtitle-indonesia');
    assert.equal(episode.sources.length, 1);
    assert.match(episode.sources[0].url, /blogger/);
    assert.ok(Date.now() - start < 7000);
  } finally {
    globalThis.fetch = original;
  }
});

test('challenge pages are rejected without attempting a bypass', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<div>captcha</div><video id="player"></video>');
  try {
    await assert.rejects(resolveMirror('https://desustream.net/challenge'), /challenge/);
  } finally {
    globalThis.fetch = original;
  }
});

test('a shorter otakudesu title matches only as a whole-word prefix with the same season', () => {
  const sh = normalizeAnimeTitle('Kyouran Reijou Nia Liston: Byoujaku Reijou ni Tensei shita Kamigoroshi no Bujin no Karei naru Musouroku');
  assert.equal(titleMatchScore(normalizeAnimeTitle('Kyouran Reijou Nia Liston Subtitle Indonesia'), sh), 0.9);
  assert.equal(titleMatchScore(normalizeAnimeTitle('Tensei shitara Ken deshita'), normalizeAnimeTitle('Tensei shitara Ken deshita II')), 0);
  assert.equal(titleMatchScore(normalizeAnimeTitle('Kyouran Reijou Nia'), normalizeAnimeTitle('Kyouran Reijou Niama')), 0);
  assert.equal(titleMatchScore(normalizeAnimeTitle('One Piece'), normalizeAnimeTitle('One Piece Film Red')), 0);
});

test('accepts Otakudesu MP4s hosted on archive.org', async () => {
  const mp4 = 'https://archive.org/download/item/Otakudesu.io_X--01_720p.mp4';
  assert.deepEqual(await resolveMirror(mp4), { type: 'mp4', url: mp4 });
  await assert.rejects(resolveMirror('https://archive.org/details/item'), /embed host/);
});
