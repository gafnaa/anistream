export type SeriesUpdate = { slug: string; title: string; image: string | null; latest: { number: number; slug: string | null } | null };
export type SavedLatest = Record<string, { addedAt: number; number: number }>;
export function diffUpdates(bookmarks: { slug: string; addedAt: number }[], updates: SeriesUpdate[], previous: SavedLatest) {
  const next: SavedLatest = {};
  const fresh: SeriesUpdate[] = [];
  for (const bookmark of bookmarks) {
    const old = previous[bookmark.slug];
    const sameBookmark = old?.addedAt === bookmark.addedAt;
    const update = updates.find(item => item.slug === bookmark.slug);
    if (sameBookmark) next[bookmark.slug] = old;
    if (!update?.latest || !Number.isFinite(update.latest.number)) continue;
    if (sameBookmark && update.latest.number > old.number) fresh.push(update);
    next[bookmark.slug] = { addedAt: bookmark.addedAt, number: Math.max(sameBookmark ? old.number : 0, update.latest.number) };
  }
  return { next, fresh, summary: fresh.length > 3 };
}
