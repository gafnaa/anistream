import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEpisode, getSeries, search, normalizeAnimeTitle, resolveMirror, titleMatchScore } from '../scraper.js';

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

test('resolves older otakuwatch mirrors to a proxied googlevideo MP4', async () => {
  const original = globalThis.fetch;
  const video = 'https://rr3---sn-x.googlevideo.com/videoplayback?expire=1&ip=1.2.3.4&mime=video/mp4';
  globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => `<script>sources: [{file: "${video.replace(/&/g, '&amp;')}"}]</script>` });
  try {
    assert.deepEqual(await resolveMirror('https://v4.desustream.com/dstream/otakuwatch2/new/hd/index.php?id=x'), { type: 'mp4', url: video, proxied: true });
  } finally { globalThis.fetch = original; }
});

import { readFileSync } from 'node:fs';
import { odUrl, parseOdSearch, parseOdSeries, parseOdEpisode } from '../otakudesu.js';
const fixture = name => readFileSync(new URL(`./fixtures/od-${name}.html`, import.meta.url), 'utf8');

test('catalogue search strips release noise and namespaces cards', () => {
  const { items, hasNext } = parseOdSearch(fixture('search'));
  assert.equal(items.length, 3);
  assert.equal(hasNext, false);
  assert.equal(items[2].title, 'Oregairu');
  assert.equal(items[2].slug, 'od~ogairu-subtitle-indonesia');
  assert.equal(items[2].kind, 'series');
  assert.equal(items[2].status, 'Completed');
  assert.equal(items[2].episodeTitle, null);
  assert.match(items[2].image, /^https:/);
});

test('series contract includes metadata and only playable episode links', () => {
  const series = parseOdSeries(fixture('series'), 'od~ogairu-subtitle-indonesia');
  assert.equal(series.title, 'Oregairu');
  assert.equal(series.studio, "Brain's Base");
  assert.equal(series.rating, '8.11');
  assert.equal(series.type, 'BD');
  assert.ok(series.synopsis.includes('Hikigaya'));
  assert.ok(series.genres.includes('Romance'));
  assert.equal(series.episodes.length, 14);
  assert.equal(series.episodes[0].number, '1');
  assert.equal(series.episodes[0].slug, 'od~orgr-episode-1-sub-indo');
  assert.equal(series.episodes.at(-1).number, null);
  for (const key of ['banner', 'trailerId', 'season', 'released', 'status', 'genreLinks']) assert.ok(key in series);
});

test('episode navigation retains namespaces and absent previous episode', () => {
  const episode = parseOdEpisode(fixture('episode'), 'od~orgr-episode-1-sub-indo');
  assert.equal(episode.seriesSlug, 'od~ogairu-subtitle-indonesia');
  assert.equal(episode.seriesTitle, 'Oregairu');
  assert.equal(episode.prevSlug, null);
  assert.equal(episode.nextSlug, 'od~orgr-episode-2-sub-indo');
});

test('namespace validation rejects unsafe slugs before any fetch', async () => {
  for (const slug of ['od~../secret', 'od~a?b', 'od~A', 'od~', 'od~a/b', 'od~a%2fb', 'od~a\n']) {
    assert.throws(() => odUrl(slug, 'anime'), /Invalid/);
    await assert.rejects(getEpisode(slug), /Invalid/);
    await assert.rejects(getSeries(slug), /Invalid/);
  }
  assert.equal(encodeURIComponent('od~orgr-episode-1-sub-indo'), 'od~orgr-episode-1-sub-indo');
});

test('parallel search prefers primary duplicates and tolerates either source failing', async () => {
  const original = globalThis.fetch;
  const primary = '<div class="listupd"><article class="bs"><a itemprop="url" href="https://samehadaku.li/anime/oregairu/"></a><h2 itemprop="headline">Oregairu</h2></article></div><div class="hpage"><a class="r"></a></div>';
  try {
    for (const failing of [null, 'samehadaku', 'otakudesu']) {
      const called = [];
      globalThis.fetch = async url => {
        const source = String(url).includes('samehadaku') ? 'samehadaku' : 'otakudesu';
        called.push(source);
        if (source === failing) throw new Error('Unavailable');
        return new Response(source === 'samehadaku' ? primary : fixture('search'));
      };
      const result = await search('oregairu');
      assert.deepEqual(called.sort(), ['otakudesu', 'samehadaku']);
      assert.equal(result.items.length, failing === 'otakudesu' ? 1 : 3);
      assert.equal(result.items.find(item => item.title === 'Oregairu').slug,
        failing === 'samehadaku' ? 'od~ogairu-subtitle-indonesia' : 'oregairu');
      assert.equal(result.hasNext, failing !== 'samehadaku');
    }
  } finally { globalThis.fetch = original; }
});

test('namespaced episode reuses mirror resolution without a title lookup', async () => {
  const original = globalThis.fetch;
  const video = 'https://cdn.odcloud.net/anime/Fixture_480p.mp4';
  globalThis.fetch = async url => {
    if (String(url).includes('/episode/')) return new Response(`${fixture('episode')}<div id="pembed"><iframe src="https://desustream.net/fixture"></iframe></div>`);
    if (String(url).includes('desustream.net')) return new Response(`const file = "${video}"`);
    throw new Error(`Unexpected lookup: ${url}`);
  };
  try {
    const episode = await getEpisode('od~orgr-episode-1-sub-indo');
    assert.equal(episode.sources[0].url, video);
    assert.equal(episode.sources[0].provider, 'otakudesu');
    assert.equal(episode.nextSlug, 'od~orgr-episode-2-sub-indo');
  } finally { globalThis.fetch = original; }
});
