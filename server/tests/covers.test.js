import test from 'node:test';
import assert from 'node:assert/strict';
import { enrichCovers, lookupCovers, pickCover, resetCoverCache, searchTerm } from '../covers.js';
import { normalizeAnimeTitle } from '../scraper.js';

const media = (romaji, url, synonyms = []) => ({ coverImage: { extraLarge: url, large: null }, title: { romaji, english: null }, synonyms });

test('pickCover accepts matching romaji or synonym titles only', () => {
  const key = normalizeAnimeTitle('Make Heroine ga Oosugiru!');
  assert.equal(pickCover(media('Make Heroine ga Oosugiru!', 'big.jpg'), key), 'big.jpg');
  assert.equal(pickCover(media('Other', 'big.jpg', ['Make Heroine ga Oosugiru']), key), 'big.jpg');
  assert.equal(pickCover(media('Make Heroine ga Oosugiru! Season 2', 'wrong.jpg'), key), null);
  assert.equal(pickCover(null, key), null);
  const rayearth = normalizeAnimeTitle('Magic Knight Rayearth (2026)');
  const old = { ...media('Magic Knight Rayearth', 'old.jpg'), seasonYear: 1994 };
  const remake = { ...media('Magic Knight Rayearth (2026)', 'new.jpg'), seasonYear: 2026 };
  assert.equal(pickCover([old, remake], rayearth, 2026), 'new.jpg');
});

test('searchTerm drops season and year noise', () => {
  assert.equal(searchTerm('Kikansha no Mahou wa Tokubetsu desu 2nd Season'), 'Kikansha no Mahou wa Tokubetsu desu');
  assert.equal(searchTerm('Magic Knight Rayearth (2026)'), 'Magic Knight Rayearth');
  assert.equal(searchTerm('Tensei shitara Ken deshita II'), 'Tensei shitara Ken deshita');
});

test('enrichCovers batches lookups, upgrades matches and caches hits and misses', async () => {
  resetCoverCache();
  let calls = 0;
  const fetchImpl = async (_url, init) => {
    calls += 1;
    const { variables } = JSON.parse(init.body);
    assert.deepEqual(Object.values(variables), ['Bleach', 'Unknown Show']);
    return { ok: true, status: 200, json: async () => ({ data: { a0: { media: [media('Bleach Movie', 'no.jpg'), media('BLEACH', 'bleach-xl.jpg')] }, a1: { media: [] } } }) };
  };
  const items = [
    { title: 'Bleach', image: 'small.jpg', banner: 'small.jpg' },
    { title: 'Unknown Show', image: 'keep.jpg' },
    { title: 'Bleach', image: 'small2.jpg' },
  ];
  await enrichCovers(items, { fetchImpl });
  assert.equal(calls, 1);
  assert.deepEqual(items.map(i => i.image), ['bleach-xl.jpg', 'keep.jpg', 'bleach-xl.jpg']);
  assert.equal(items[0].banner, 'bleach-xl.jpg');

  const again = await lookupCovers(['Bleach', 'Unknown Show'], { fetchImpl });
  assert.equal(calls, 1);
  assert.equal(again.get('bleach'), 'bleach-xl.jpg');
  assert.equal(again.get('unknown show'), null);
});

test('enrichCovers leaves items untouched when AniList fails', async () => {
  resetCoverCache();
  const items = [{ title: 'Bleach', image: 'small.jpg' }];
  await enrichCovers(items, { fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ errors: [] }) }) });
  assert.equal(items[0].image, 'small.jpg');
});
