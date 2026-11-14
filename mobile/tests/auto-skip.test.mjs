import test from 'node:test';
import assert from 'node:assert/strict';
import { autoSkipInterval } from '../src/components/player/autoSkip.ts';

test('auto skip enters each interval once, including after seeking back and changing episodes', () => {
  const skipped = new Set();
  const intervals = [{ type: 'op', start: 10, end: 90 }, { type: 'recap', start: 100, end: 120 }, { type: 'ed', start: 1300, end: 1440 }];
  assert.equal(autoSkipInterval(intervals, 9, skipped, 'episode-1'), null);
  assert.equal(autoSkipInterval(intervals, 10, skipped, 'episode-1'), intervals[0]);
  assert.equal(autoSkipInterval(intervals, 11, skipped, 'episode-1'), null);
  assert.equal(autoSkipInterval(intervals, 90, skipped, 'episode-1'), null);
  assert.equal(autoSkipInterval(intervals, 10, skipped, 'episode-1'), null);
  assert.equal(autoSkipInterval(intervals, 105, skipped, 'episode-1'), intervals[1]);
  assert.equal(autoSkipInterval(intervals, 1300, skipped, 'episode-1'), intervals[2]);
  assert.equal(autoSkipInterval(intervals, 10, skipped, 'episode-2'), intervals[0]);
});

test('invalid intervals cannot cause backward or nonfinite seeks', () => {
  const intervals = [{ type: 'op', start: 20, end: 10 }, { type: 'ed', start: 30, end: Infinity }];
  assert.equal(autoSkipInterval(intervals, 40, new Set(), 'episode-1'), null);
});
