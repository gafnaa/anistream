/**
 * Local watchlist + "continue watching" history.
 * Stored in localStorage so it survives reloads without any account.
 */
const BOOKMARK_KEY = 'anistream.bookmarks.v1';
const HISTORY_KEY = 'anistream.history.v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — ignore */
  }
}

export function getBookmarks() {
  return read(BOOKMARK_KEY, []);
}

export function isBookmarked(slug) {
  return getBookmarks().some((b) => b.slug === slug);
}

export function toggleBookmark(series) {
  const list = getBookmarks();
  const exists = list.findIndex((b) => b.slug === series.slug);
  if (exists >= 0) {
    list.splice(exists, 1);
  } else {
    list.unshift({
      slug: series.slug,
      title: series.title,
      image: series.image,
      addedAt: Date.now(),
    });
  }
  write(BOOKMARK_KEY, list.slice(0, 100));
  return exists < 0;
}

export function getHistory() {
  return read(HISTORY_KEY, []);
}

export function addHistory(entry) {
  if (!entry?.episodeSlug) return;
  const list = getHistory().filter((h) => h.episodeSlug !== entry.episodeSlug);
  list.unshift({ ...entry, watchedAt: Date.now() });
  write(HISTORY_KEY, list.slice(0, 60));
}

export function clearHistory() {
  write(HISTORY_KEY, []);
}
