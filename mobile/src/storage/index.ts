import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo, useSyncExternalStore } from 'react';

export type Bookmark = { slug: string; title: string; poster: string; addedAt: number };
export type HistoryItem = {
  episodeSlug: string; seriesSlug: string; title: string; episode: string;
  poster: string; genres?: string[]; position: number; duration: number; updatedAt: number;
};
function createStore<T>(key: string, validate: (value: unknown) => value is T) {
  let items: T[] = [];
  const listeners = new Set<() => void>();
  let pending = Promise.resolve();
  const ready = AsyncStorage.getItem(key).then(raw => {
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (Array.isArray(value)) items = value.filter(validate);
    }
    listeners.forEach(listener => listener());
  }).catch(() => undefined);
  return {
    useItems: () => useSyncExternalStore(listener => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }, () => items, () => items),
    update: (change: (current: T[]) => T[]) => {
      const operation = pending.then(async () => {
        await ready;
        const next = change(items);
        await AsyncStorage.setItem(key, JSON.stringify(next));
        items = next;
        listeners.forEach(listener => listener());
      });
      pending = operation.catch(() => undefined);
      return operation;
    },
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isBookmark(value: unknown): value is Bookmark {
  return isRecord(value) && ['slug', 'title', 'poster'].every(key => typeof value[key] === 'string')
    && typeof value.addedAt === 'number' && Number.isFinite(value.addedAt);
}
function isHistory(value: unknown): value is HistoryItem {
  return isRecord(value) && ['episodeSlug', 'seriesSlug', 'title', 'episode', 'poster'].every(key => typeof value[key] === 'string')
    && ['position', 'duration', 'updatedAt'].every(key => typeof value[key] === 'number' && Number.isFinite(value[key]))
    && (value.genres === undefined || (Array.isArray(value.genres) && value.genres.every(genre => typeof genre === 'string')));
}
const bookmarks = createStore<Bookmark>('anistream.bookmarks.v1', isBookmark);
const history = createStore<HistoryItem>('anistream.history.v1', isHistory);
export const useBookmarks = bookmarks.useItems;
export const useHistory = history.useItems;
export function useIsBookmarked(slug: string) {
  return useBookmarks().some(item => item.slug === slug);
}
export function toggleBookmark(item: Omit<Bookmark, 'addedAt'>) {
  return bookmarks.update(current => current.some(value => value.slug === item.slug)
    ? current.filter(value => value.slug !== item.slug)
    : [{ ...item, addedAt: Date.now() }, ...current].slice(0, 100));
}
export function removeHistory(slug: string) {
  return history.update(current => current.filter(item => item.episodeSlug !== slug));
}
export function addHistory(item: HistoryItem) {
  return history.update(current => [item, ...current.filter(value => value.episodeSlug !== item.episodeSlug)].slice(0, 60));
}

export function useSeriesProgress(seriesSlug: string) {
  const items = useHistory();
  return useMemo(() => {
    const entries = items.filter(item => item.seriesSlug === seriesSlug)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const byEpisode = new Map<string, { entry: HistoryItem; progress: number }>();
    for (const entry of entries) {
      if (byEpisode.has(entry.episodeSlug)) continue;
      const progress = entry.duration > 0 ? Math.min(1, Math.max(0, entry.position / entry.duration)) : 0;
      byEpisode.set(entry.episodeSlug, { entry, progress });
    }
    return { lastWatched: entries[0], byEpisode };
  }, [items, seriesSlug]);
}
