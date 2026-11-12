import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSkipIntervals } from '../skip.js';

test('maps AniSkip types and preserves fractional boundaries in playback order', () => {
  const result = (skipType, startTime, endTime) => ({ skipType, interval: { startTime, endTime } });
  assert.deepEqual(mapSkipIntervals({ found: true, results: [result('mixed-ed', 1300, 1390), result('op', 153.3, 243.3), result('mixed-op', 10, 90), result('recap', 0, 10), result('ed', 1400, 1470)] }), [
    { type: 'recap', start: 0, end: 10 }, { type: 'op', start: 10, end: 90 },
    { type: 'op', start: 153.3, end: 243.3 }, { type: 'ed', start: 1300, end: 1390 }, { type: 'ed', start: 1400, end: 1470 },
  ]);
});
test('picks the closest submission per type and drops other cuts', () => {
  const result = (skipType, startTime, episodeLength) => ({ skipType, episodeLength, interval: { startTime, endTime: startTime + 90 } });
  const body = { found: true, results: [result('op', 150, 1469.9), result('op', 60, 1442), result('op', 300, 1600), result('ed', 1300, 1700)] };
  assert.deepEqual(mapSkipIntervals(body, 1440), [{ type: 'op', start: 60, end: 150 }]);
  assert.deepEqual(mapSkipIntervals(body, 1468), [{ type: 'op', start: 150, end: 240 }]);
  assert.equal(mapSkipIntervals(body, 0).length, 4);
});
test('missing data and malformed intervals are ignored', () => {
  for (const body of [null, {}, { found: false, results: [] }, { found: true, results: {} }]) assert.deepEqual(mapSkipIntervals(body), []);
  assert.deepEqual(mapSkipIntervals({ found: true, results: [null, { skipType: 'unknown', interval: { startTime: 0, endTime: 10 } }, ...[-1, NaN, Infinity, '1', 20].map(startTime => ({ skipType: 'op', interval: { startTime, endTime: 10 } }))] }), []);
});

test('lookup uses variables, normalizes cache keys and rounds duration', async () => {
  const { getSkipTimes } = await import('../skip.js');
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => String(url).includes('anilist')
      ? { data: { Media: { idMal: 123 } } }
      : { found: true, results: [{ skipType: 'op', interval: { startTime: 10, endTime: 95 } }] } };
  };
  try {
    const result = await getSkipTimes('  Test "Title"  ', 5, 1470.2);
    assert.deepEqual(result, { malId: 123, intervals: [{ type: 'op', start: 10, end: 95 }] });
    assert.deepEqual(await getSkipTimes('test "title"', 5, 1470.4), result);
    assert.equal(calls.length, 2);
    assert.equal(JSON.parse(calls[0].options.body).variables.title, 'Test "Title"');
    assert.equal(new URL(calls[1].url).searchParams.get('episodeLength'), '0');
    assert.ok(calls.every(call => call.options.signal && call.options.headers['User-Agent']));
  } finally { globalThis.fetch = original; }
});

test('upstream failures and missing titles never fail playback', async () => {
  const { getSkipTimes } = await import('../skip.js');
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Unavailable'); };
  try {
    assert.deepEqual(await getSkipTimes('Unavailable title', 1, 0), { malId: null, intervals: [] });
    assert.deepEqual(await getSkipTimes('', 1, 0), { malId: null, intervals: [] });
  } finally { globalThis.fetch = original; }
});
