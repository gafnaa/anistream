import test from 'node:test';
import assert from 'node:assert/strict';
import { isCoverUrl, coverResponse } from '../artwork.js';

test('only AniList cover files can be fetched through the artwork endpoint', () => {
  assert.equal(isCoverUrl('https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx182255-butzrqd4I0aC.jpg'), true);
  for (const url of [null, 'http://s4.anilist.co/file/anilistcdn/media/anime/cover/large/test.jpg',
    'https://s4.anilist.co.evil.example/file/anilistcdn/media/anime/cover/large/test.jpg',
    'https://s4.anilist.co/private/test.jpg', 'https://127.0.0.1/test.jpg',
    'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/test.jpg?redirect=x']) {
    assert.equal(isCoverUrl(url), false);
  }
});

test('cover URLs carry each caller origin and key without changing cached metadata', () => {
  const image = 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx182255-butzrqd4I0aC.jpg';
  const cached = { items: [{ image, banner: image, url: image }, { image: 'https://other.example/cover.jpg' }] };
  const first = coverResponse(cached, 'https://one.example', '&k=first');
  const second = coverResponse(cached, 'https://two.example', '&k=second');
  assert.equal(new URL(first.items[0].image).searchParams.get('k'), 'first');
  assert.equal(new URL(second.items[0].banner).origin, 'https://two.example');
  assert.equal(new URL(second.items[0].banner).searchParams.get('k'), 'second');
  assert.equal(cached.items[0].image, image);
  assert.equal(first.items[0].url, image);
  assert.equal(first.items[1].image, cached.items[1].image);
});
