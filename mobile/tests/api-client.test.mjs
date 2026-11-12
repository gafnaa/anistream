import test from 'node:test';
import assert from 'node:assert/strict';

process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test:8443';
process.env.EXPO_PUBLIC_API_KEY = 'test-key';
const { withApiKey } = await import('../src/api/client.ts');

test('playback URLs keep one access key after repeated decoration', () => {
  const input = 'https://api.example.test:8443/api/video?url=https%3A%2F%2Fcdn.example%2Fvideo.mp4';
  const result = new URL(withApiKey(withApiKey(input)));
  assert.deepEqual(result.searchParams.getAll('k'), ['test-key']);
  assert.equal(result.searchParams.get('url'), 'https://cdn.example/video.mp4');
  assert.deepEqual(new URL(withApiKey(`${input}&k=test-key&k=test-key`)).searchParams.getAll('k'), ['test-key']);
});

test('third-party URLs never receive our access key', () => {
  for (const url of ['https://cdn.example/video.mp4', 'https://api.example.test:8443.evil.example/video.mp4']) {
    assert.equal(withApiKey(url), url);
  }
});
