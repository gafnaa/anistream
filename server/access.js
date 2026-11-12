/** Older clients append the access key to already-keyed playback URLs. */
export function validAccessKey(value, expected) {
  const keys = Array.isArray(value) ? value : [value];
  return !!expected && keys.length > 0 && keys.every(key => typeof key === 'string' && key === expected);
}
