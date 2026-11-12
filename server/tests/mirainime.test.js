import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mnUrl, parseMnSearch, parseMnSeries, parseMnOptions, parseMnEpisodes, parseMnEpisode, mapMnSources, MN_VIDEO_HOST } from '../mirainime.js';
import { resolveMirror } from '../scraper.js';
const fixture = name => readFileSync(new URL(`./fixtures/mirainime/${name}`, import.meta.url), 'utf8');

test('Mirainime slugs reject path, query and namespace injection', () => {
  assert.equal(mnUrl('mn~naruto'), 'https://mirainime.com/anime/naruto');
  assert.equal(mnUrl('mn~naruto~2', true), 'https://mirainime.com/anime/naruto/episode/2');
  for (const slug of ['mn~', 'mn~Naruto', 'mn~naruto/../../', 'mn~naruto?x', 'mn~naruto\n', 'od~naruto']) assert.throws(() => mnUrl(slug));
  for (const slug of ['mn~naruto~0', 'mn~naruto~02', 'mn~naruto~2\n', 'mn~naruto~2~3']) assert.throws(() => mnUrl(slug, true));
});
test('search parses actual result cards, type and status', () => {
  const result = parseMnSearch(fixture('search.html'));
  assert.deepEqual(result.items.map(item => item.slug), ['mn~naruto', 'mn~naruto-shippuuden']);
  assert.equal(result.items[0].type, 'TV');
  assert.equal(result.items[0].status, 'Complete');
  assert.ok(result.items[0].image);
  assert.deepEqual(parseMnSearch('<a href="/anime/unrelated">Recommendation</a>').items, []);
});
test('series and full player episode list retain metadata and navigation', () => {
  const html = fixture('episode.html'), options = parseMnOptions(html);
  const series = parseMnSeries(fixture('series.html'), 'mn~naruto-shippuuden', options);
  assert.equal(series.title, 'Naruto: Shippuuden');
  assert.equal(series.status, 'Complete');
  assert.equal(series.type, 'TV');
  assert.equal(series.studio, 'Studio Pierrot');
  assert.ok(series.genres.includes('Action'));
  assert.ok(series.synopsis);
  assert.deepEqual(series.episodes.map(ep => ep.number), ['1', '2']);
  assert.equal(series.episodes[1].slug, 'mn~naruto-shippuuden~2');
  assert.equal(parseMnEpisode(html, 'mn~naruto-shippuuden~2').nextSlug, 'mn~naruto-shippuuden~3');
  const episodes = Array.from({length: 500}, (_, i) => ({episode_number:i+1}));
  assert.equal(parseMnEpisodes({episodes,epTotal:500}, 'mn~naruto').length, 500);
  assert.throws(() => parseMnEpisodes({...options,epTotal:500}, 'mn~naruto'));
});
test('MP4 streams and alternates resolve through the video proxy contract', async () => {
  const sources = mapMnSources(JSON.parse(fixture('streams.json')));
  assert.equal(sources.length, 3);
  assert.ok(sources.every(source => source.kind === 'resolvable' && !source.type));
  assert.equal(sources[0].quality, '720p');
  const resolved = await resolveMirror(sources[0].url);
  assert.equal(resolved.proxied, true);
  assert.equal(resolved.type, 'mp4');
  assert.equal(MN_VIDEO_HOST.test('suguha.my.id.evil.example'), false);
  assert.equal(MN_VIDEO_HOST.test('evilsuguha.my.id'), false);
});

test('episode JSON request preserves session cookies and token', async () => {
  const { getMnEpisode } = await import('../mirainime.js');
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    if (calls.length === 1) return new Response(fixture('episode.html'), {headers: {'Set-Cookie': 'session=test; Path=/; HttpOnly'}});
    assert.equal(init.headers.Cookie, 'session=test');
    assert.equal(init.headers['X-Stream-Token'], '123.fixture');
    assert.equal(init.headers.Accept, 'application/json');
    assert.equal(init.headers.Referer, 'https://mirainime.com/anime/naruto-shippuuden/episode/2');
    return new Response(fixture('streams.json'));
  };
  try {
    assert.equal((await getMnEpisode('mn~naruto-shippuuden~2')).sources.length, 3);
    assert.ok(calls[1].endsWith('/2/json?preflight=1'));
  } finally { globalThis.fetch = original; }
});
