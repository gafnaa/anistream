import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from '../src/update/version.ts';
test('compares release components numerically and pads missing components', () => {
  for (const [a, b, expected] of [['0.4.0', '0.4.0', 0], ['0.10.0', '0.9.9', 1], ['1.0', '1.0.0', 0], ['v2.0.0', '1.99.0', 1], ['0.3.9', '0.4.0', -1], ['1.0.0+build', '1.0.0', 0]]) assert.equal(compareVersions(a, b), expected);
});
test('stable versions follow prereleases and prerelease identifiers follow SemVer order', () => {
  const ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.2', '1.0.0-alpha.10', '1.0.0-beta', '1.0.0-rc.1', '1.0.0'];
  for (let i = 1; i < ordered.length; i++) {
    assert.equal(compareVersions(ordered[i], ordered[i - 1]), 1);
    assert.equal(compareVersions(ordered[i - 1], ordered[i]), -1);
  }
});
