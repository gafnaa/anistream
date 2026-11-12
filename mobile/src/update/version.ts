/** Numeric release components, with SemVer prereleases sorting before stable releases. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) => value.trim().replace(/^v/, '').split('+')[0].split('-');
  const [left, ...leftPre] = parse(a);
  const [right, ...rightPre] = parse(b);
  const x = left.split('.').map(Number), y = right.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const difference = (x[i] || 0) - (y[i] || 0);
    if (difference) return Math.sign(difference);
  }
  const ap = leftPre.join('-'), bp = rightPre.join('-');
  if (!ap || !bp) return ap === bp ? 0 : ap ? -1 : 1;
  const ax = ap.split('.'), bx = bp.split('.');
  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    if (ax[i] === bx[i]) continue;
    if (ax[i] === undefined) return -1;
    if (bx[i] === undefined) return 1;
    const an = /^\d+$/.test(ax[i]), bn = /^\d+$/.test(bx[i]);
    if (an && bn) return Math.sign(Number(ax[i]) - Number(bx[i]));
    if (an !== bn) return an ? -1 : 1;
    return ax[i] < bx[i] ? -1 : 1;
  }
  return 0;
}
