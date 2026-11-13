import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUpdateSlugs, seriesUpdates } from '../updates.js';

test('validates all series providers and the batch limit', () => {
  assert.deepEqual(parseUpdateSlugs('one,od~ogairu-subtitle-indonesia,mn~naruto-shippuuden'), ['one', 'od~ogairu-subtitle-indonesia', 'mn~naruto-shippuuden']);
  for (const value of [undefined, ['one'], '../bad', 'bad/slug', 'a,', Array(61).fill('a').join(',')]) assert.throws(() => parseUpdateSlugs(value));
  assert.deepEqual(parseUpdateSlugs(''), []);
});
test('selects numeric maximum, isolates failures, and limits concurrency', async () => {
  let active = 0, maximum = 0;
  const result = await seriesUpdates(['a', 'b', 'c', 'd', 'e', 'bad'], async slug => {
    active++; maximum = Math.max(active, maximum);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    if (slug === 'bad') throw new Error('offline');
    return { title: slug, episodes: [{ number: '9', slug: 'nine' }, { number: '10.5', slug: 'ten' }, { number: null }, { number: 'special' }] };
  });
  assert.equal(maximum, 4);
  assert.deepEqual(result[0].latest, { number: 10.5, slug: 'ten' });
  assert.equal(result[5].latest, null);
});
test('series without numbered episodes return null latest', async () => {
  const result = await seriesUpdates(['empty'], async () => ({ title: 'Empty', episodes: [{ number: null }, { number: 'special' }] }));
  assert.equal(result[0].latest, null);
});
