import test from 'node:test';
import assert from 'node:assert/strict';
import { validAccessKey } from '../access.js';

test('accepts identical duplicate playback keys from installed clients', () => {
  assert.equal(validAccessKey('test-key', 'test-key'), true);
  assert.equal(validAccessKey(['test-key', 'test-key'], 'test-key'), true);
});

test('rejects missing, mixed, structured and unconfigured keys', () => {
  for (const value of [undefined, '', [], ['test-key', 'wrong'], ['wrong', 'test-key'], { k: 'test-key' }]) {
    assert.equal(validAccessKey(value, 'test-key'), false);
  }
  assert.equal(validAccessKey('', ''), false);
});
