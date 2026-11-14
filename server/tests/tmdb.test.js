import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTmSlug, srtToVtt, injectTmSubtitle, TM_VIDEO_HOST, configureTmCache, getTmSeries, resolveTm, getTmSubtitle, recommendationsTm } from '../tmdb.js';

test('movie recommendations rank shared genres before rating, exclude source and duplicates, and translate titles', async () => {
  const original = globalThis.fetch, token = process.env.TMDB_TOKEN, cache = new Map();
  process.env.TMDB_TOKEN = 'test';
  configureTmCache(async (key, ttl, fn) => {
    assert.equal(ttl, 6 * 3600_000);
    if (!cache.has(key)) cache.set(key, await fn());
    return cache.get(key);
  });
  const entry = (id, genre_ids, vote_average, extra = {}) => ({ id, genre_ids, vote_average, vote_count: 500, title: `Film ${id}`, original_language: 'en', ...extra });
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/movie/1')) return Response.json({ genres: [{ id: 18 }, { id: 36 }] });
    assert.equal(parsed.searchParams.get('with_genres'), '18|36');
    assert.equal(parsed.searchParams.get('vote_count.gte'), '300');
    assert.equal(parsed.searchParams.get('sort_by'), 'vote_average.desc');
    const translated = parsed.searchParams.get('language') === 'en-US';
    return Response.json({ results: parsed.searchParams.get('page') === '1'
      ? [entry(1, [18, 36], 10), entry(2, [18], 9), entry(3, [18, 36], 8), entry(9, [99], 10), entry(8, [18], 10, { vote_count: 2 })]
      : [entry(3, [18, 36], 8), entry(4, [18, 36], 8.5, { original_language: 'ja', original_title: '原題', title: translated ? 'English title' : '原題' })] });
  };
  try {
    const result = await recommendationsTm('tm~movie~1');
    assert.deepEqual(result.items.map(item => item.slug), ['tm~movie~4', 'tm~movie~3', 'tm~movie~2']);
    assert.equal(result.items[0].title, 'English title');
    await recommendationsTm('tm~movie~1');
    assert.equal(calls, 4);
    assert.throws(() => recommendationsTm('tm~tv~1'));
  } finally {
    globalThis.fetch = original;
    configureTmCache((_key, _ttl, fn) => fn());
    if (token === undefined) delete process.env.TMDB_TOKEN; else process.env.TMDB_TOKEN = token;
  }
});

test('TMDB namespace accepts only complete movie and TV identifiers', () => {
  assert.equal(parseTmSlug('tm~movie~1218925~1', true).seriesSlug, 'tm~movie~1218925');
  assert.equal(parseTmSlug('tm~tv~1396~5~16', true).episode, 16);
  for (const slug of ['tm~movie~1~2', 'tm~movie~1~1~1', 'tm~tv~1~1', 'tm~tv~1~0~1', 'tm~movie~1~1\n', 'tm~tv~1/../../']) assert.throws(() => parseTmSlug(slug, true));
  assert.equal(TM_VIDEO_HOST.test('proxy.vidbolt.xyz.evil.example'), false);
});
test('SRT conversion preserves cues and adds the native HLS timestamp map', () => {
  const vtt = srtToVtt('\uFEFF1\r\n00:00:01,250 --> 00:00:03,500\r\nHalo\r\n');
  assert.ok(vtt.startsWith('WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:0,LOCAL:00:00:00.000\n\n'));
  assert.ok(vtt.includes('00:00:01.250 --> 00:00:03.500\nHalo'));
  assert.throws(() => srtToVtt('<html>Blocked</html>'));
});
test('Indonesian HLS subtitles preserve English, audio, variants and keyed URIs', () => {
  const master = '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",URI="/audio?k=key"\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="english",NAME="English",DEFAULT=YES,URI="/english?k=key"\n#EXT-X-STREAM-INF:BANDWIDTH=123,AUDIO="audio",SUBTITLES="english"\n/video?k=key\n#EXT-X-STREAM-INF:BANDWIDTH=456\n/video2?k=key';
  const result = injectTmSubtitle(master, '/api/sub/tm~movie~1~1.m3u8?k=key');
  assert.equal((result.match(/SUBTITLES="subs"/g) || []).length, 2);
  assert.ok(result.includes('NAME="English",DEFAULT=NO'));
  assert.ok(result.includes('LANGUAGE="id",DEFAULT=YES'));
  assert.ok(result.includes('URI="/api/sub/tm~movie~1~1.m3u8?k=key"'));
  assert.ok(result.includes('AUDIO="audio"'));
  assert.ok(result.includes('/english?k=key'));
});
test('TV details skip specials and future episodes, retain sequential notification numbers and English fallback', async () => {
  const original = globalThis.fetch, token = process.env.TMDB_TOKEN;
  process.env.TMDB_TOKEN = 'test';
  configureTmCache((_key, _ttl, fn) => fn());
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    const data = parsed.pathname.endsWith('/season/1') ? { season_number: 1, episodes: [
      { episode_number: 1, name: 'Pilot', air_date: '2020-01-01', still_path: '/pilot.jpg' },
      { episode_number: 2, name: 'Future', air_date: '2999-01-01' },
    ] } : { name: 'Test', overview: parsed.searchParams.get('language') === 'en-US' ? 'English overview' : '', genres: [],
      seasons: [{season_number: 0, air_date: '2020-01-01'}, {season_number: 1, air_date: '2020-01-01'}] };
    return Response.json(data);
  };
  try {
    const series = await getTmSeries('tm~tv~1');
    assert.equal(series.synopsis, 'English overview');
    assert.deepEqual(series.episodes.map(ep => [ep.slug, ep.number, ep.title]), [['tm~tv~1~1~1', '1', 'S1 E1 · Pilot']]);
    assert.ok(series.episodes[0].thumbnail.endsWith('/pilot.jpg'));
  } finally { globalThis.fetch = original; if (token === undefined) delete process.env.TMDB_TOKEN; else process.env.TMDB_TOKEN = token; }
});
test('stream resolve retries once excluding failed server and always requests h264', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, init) => {
    const parsed = new URL(url);
    calls.push(parsed);
    if (parsed.hostname === 'vidbolt.xyz') {
      assert.equal(parsed.searchParams.get('hevc'), '0');
      assert.equal(init.headers.Referer, 'https://vidbolt.xyz/');
      if (!parsed.searchParams.has('exclude')) return Response.json({stream:{server:'first',sources:[]}});
      assert.equal(parsed.searchParams.get('exclude'), 'first');
      return Response.json({stream:{server:'second',sources:[{url:'https://proxy.vidbolt.xyz/master.m3u8'}]}});
    }
    return new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nvideo.m3u8');
  };
  try { assert.equal((await resolveTm('tm~movie~1~1')).type, 'hls'); assert.equal(calls.length, 5); }
  finally { globalThis.fetch = original; }
});
test('stream resolve skips servers whose segments are forbidden', async () => {
  const original = globalThis.fetch, excludes = [];
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    if (parsed.hostname === 'vidbolt.xyz') {
      excludes.push(parsed.searchParams.get('exclude'));
      const server = parsed.searchParams.has('exclude') ? 'vega' : 'quantum';
      return Response.json({stream:{server,sources:[{url:`https://proxy.vidbolt.xyz/${server}/master.m3u8`}]}});
    }
    if (parsed.pathname.endsWith('master.m3u8')) return new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nvideo.m3u8');
    if (parsed.pathname.endsWith('video.m3u8')) return new Response('#EXTM3U\n#EXTINF:5,\nhttps://vercetti.org/seg/1');
    return new Response('x', { status: parsed.pathname.includes('quantum') || parsed.hostname === 'vercetti.org' && excludes.length === 1 ? 403 : 200 });
  };
  try {
    const stream = await resolveTm('tm~movie~7~1');
    assert.equal(stream.server, 'vega');
    assert.deepEqual(excludes, [null, 'quantum']);
  } finally { globalThis.fetch = original; }
});
test('TV subtitle lookup is episode scoped and paginates to Indonesian SRT', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async url => {
    const parsed = new URL(url); calls.push(parsed);
    if (parsed.pathname.startsWith('/get/')) return new Response('1\n00:00:01,000 --> 00:00:02,000\nHalo');
    assert.equal(parsed.pathname, '/v1/by-tmdb/tv/1396/season/1/episode/2');
    const second = parsed.searchParams.get('offset') === '100';
    return Response.json({subtitles:{total:101,items:second ? [{id:1,language:'id',format:'srt',duration_s:3}] : Array.from({length:100},()=>({language:'en'}))}});
  };
  try { const sub = await getTmSubtitle('tm~tv~1396~1~2'); assert.ok(sub.vtt.includes('Halo')); assert.equal(calls.length,3); }
  finally { globalThis.fetch = original; }
});
test('playback fallback excludes the cached first server and caches resolves for twenty minutes', async () => {
  const original = globalThis.fetch, calls = [], values = new Map();
  configureTmCache(async (key, ttl, fn) => {
    assert.equal(ttl, 20 * 60_000);
    if (!values.has(key)) values.set(key, await fn());
    return values.get(key);
  });
  globalThis.fetch = async url => {
    const parsed = new URL(url);
    if (parsed.hostname !== 'vidbolt.xyz') return new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nvideo.m3u8');
    calls.push(parsed);
    return Response.json({stream:{server:parsed.searchParams.has('exclude') ? 'second' : 'first',sources:[{url:'https://proxy.vidbolt.xyz/master.m3u8'}]}});
  };
  try {
    assert.equal((await resolveTm('tm~movie~1~1')).server, 'first');
    assert.equal((await resolveTm('tm~movie~1~1', true)).server, 'second');
    assert.equal(calls.length, 2);
    assert.equal(calls[1].searchParams.get('exclude'), 'first');
  } finally { globalThis.fetch = original; configureTmCache((_key, _ttl, fn) => fn()); }
});
test('decoy tiles variant is removed from orion masters', async () => {
  const { dropDecoyVariants } = await import('../tmdb.js');
  const master = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\ntiles.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720\nvideo_720p.m3u8';
  assert.equal(dropDecoyVariants(master), '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720\nvideo_720p.m3u8');
});
test('untranslated Japanese titles fall back to English in lists', async () => {
  const original = globalThis.fetch, token = process.env.TMDB_TOKEN;
  process.env.TMDB_TOKEN = 't';
  globalThis.fetch = async url => {
    const english = new URL(url).searchParams.get('language') === 'en-US';
    return Response.json({ total_pages: 1, results: [
      { id: 1, title: english ? 'Chainsaw Man – The Movie: Reze Arc' : '劇場版 チェンソーマン レゼ篇', original_title: '劇場版 チェンソーマン レゼ篇', original_language: 'ja' },
      { id: 2, title: english ? 'The Rings of Power' : 'Cincin Kekuasaan', original_title: 'The Rings of Power', original_language: 'en' },
    ] });
  };
  try {
    const { listTm } = await import('../tmdb.js');
    const { items } = await listTm({ type: 'movie', list: 'popular', page: 77 });
    assert.deepEqual(items.map(item => item.title), ['Chainsaw Man – The Movie: Reze Arc', 'Cincin Kekuasaan']);
  } finally { globalThis.fetch = original; if (token === undefined) delete process.env.TMDB_TOKEN; else process.env.TMDB_TOKEN = token; }
});
