import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferSchedule } from '../scraper.js';

const metadata = new Map(['alpha', 'beta', 'gamma'].map(slug => [slug, { slug: `canonical-${slug}`, title: slug, image: null }]));
const post = (series, number, at) => ({ slug: `${series}-episode-${number}-subtitle-indonesia`, at });
test('schedule uses WIB weekdays, current-week releases, latest episode, and sorted inferred slots', () => {
  const now = Date.parse('2026-11-12T03:00:00Z');
  const result = inferSchedule([
    post('alpha', 6, '2026-11-11T18:00:00Z'), // Thursday 01:00 WIB
    post('alpha', 5, '2026-11-11T17:00:00Z'),
    post('beta', 2, '2026-11-06T14:00:00Z'), // Friday last week
    post('gamma', 8, '2026-11-11T17:30:00Z'),
    post('beta', 99, '2026-11-13T14:00:00Z'), // future post
    post('old', 1, '2026-10-01T00:00:00Z'),
  ], metadata, now);
  assert.deepEqual(result.days.map(day => day.weekday), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(result.days[3].items.map(item => [item.seriesSlug, item.time, item.episode, item.released]), [
    ['canonical-gamma', '00:30', 8, true], ['canonical-alpha', '01:00', 6, true],
  ]);
  assert.equal(result.days[4].items[0].episode, 3);
  assert.equal(result.days[4].items[0].released, false);
  assert.equal(result.days[4].items[0].episodeSlug, undefined);
});
test('WIB Monday boundary starts a new week even while UTC is Sunday', () => {
  const result = inferSchedule([post('alpha', 3, '2026-11-08T16:59:00Z')], metadata, Date.parse('2026-11-08T17:01:00Z'));
  assert.equal(result.days[6].items[0].released, false);
  assert.equal(result.days[6].items[0].episode, 4);
});

test('schedule reuses the RSS cache and resolves an aliased canonical series without playback lookups', async () => {
  const { getSchedule } = await import('../scraper.js');
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async url => {
    url = String(url);
    calls.push(url);
    if (url.includes('/feed/')) return new Response(url.endsWith('/feed/')
      ? `<rss><channel><item><link>https://samehadaku.li/alias-episode-4-subtitle-indonesia/</link><pubDate>${new Date().toUTCString()}</pubDate></item></channel></rss>`
      : '<rss><channel></channel></rss>');
    if (url.includes('/anime/?')) return new Response('<div class="listupd"></div>');
    assert.equal(url, 'https://samehadaku.li/alias-episode-4-subtitle-indonesia/');
    return new Response('<div class="single-info"><a href="/anime/canonical/"><h2 itemprop="partOfSeries">Canonical title</h2></a><img src="https://example.com/poster.jpg"></div>');
  };
  try {
    const request = getSchedule();
    assert.equal(getSchedule(), request);
    const first = await request;
    const item = first.days.flatMap(day => day.items)[0];
    assert.equal(item.seriesSlug, 'canonical');
    assert.equal(item.title, 'Canonical title');
    assert.equal(item.image, 'https://example.com/poster.jpg');
    assert.equal(item.episode, 4);
    assert.equal(item.released, true);
    const count = calls.length;
    await getSchedule();
    assert.equal(calls.length, count);
  } finally {
    globalThis.fetch = original;
  }
});
