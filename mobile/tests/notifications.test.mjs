import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffUpdates } from '../src/notifications/diff.ts';
const bookmark = { slug: 'a', addedAt: 1 };
const update = { slug: 'a', title: 'A', image: null, latest: { number: 7, slug: 'ep7' } };
test('first run baselines and next release notifies once', () => {
  const baseline = diffUpdates([bookmark], [update], {});
  assert.equal(baseline.fresh.length, 0);
  assert.equal(baseline.next.a.number, 7);
  assert.equal(diffUpdates([bookmark], [update], baseline.next).fresh.length, 0);
  assert.equal(diffUpdates([bookmark], [{ ...update, latest: { number: 8, slug: 'ep8' } }], baseline.next).fresh.length, 1);
});
test('re-added bookmarks baseline, failures retain state, removals prune, older episodes never regress', () => {
  const previous = { a: { addedAt: 1, number: 8 } };
  const readded = diffUpdates([{ ...bookmark, addedAt: 2 }], [{ ...update, latest: { number: 9, slug: 'ep9' } }], previous);
  assert.equal(readded.fresh.length, 0);
  assert.equal(readded.next.a.number, 9);
  assert.deepEqual(diffUpdates([bookmark], [{ ...update, latest: null }], previous).next, previous);
  assert.deepEqual(diffUpdates([], [update], previous).next, {});
  assert.equal(diffUpdates([bookmark], [update], previous).next.a.number, 8);
});
test('summary only above three series', () => {
  for (const count of [3, 4]) {
    const bookmarks = Array.from({ length: count }, (_, i) => ({ slug: String(i), addedAt: 1 }));
    const updates = bookmarks.map(item => ({ ...update, slug: item.slug }));
    const previous = Object.fromEntries(bookmarks.map(item => [item.slug, { addedAt: 1, number: 6 }]));
    assert.equal(diffUpdates(bookmarks, updates, previous).summary, count > 3);
  }
});
