type Interval = { type: 'op' | 'ed' | 'recap'; start: number; end: number };

export function autoSkipInterval(intervals: Interval[], position: number, skipped: Set<string>, episode: string) {
  const interval = intervals.find(item => Number.isFinite(item.start) && Number.isFinite(item.end)
    && item.end > item.start && position >= item.start && position < item.end);
  if (!interval) return null;
  const key = `${episode}:${interval.type}:${interval.start}:${interval.end}`;
  if (skipped.has(key)) return null;
  skipped.add(key);
  return interval;
}
