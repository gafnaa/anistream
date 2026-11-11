const BASE = '/api';

async function get(path) {
  const res = await fetch(BASE + path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  home: () => get('/home'),
  latest: (page = 1) => get(`/latest?page=${page}`),
  browse: ({ status = '', type = '', order = 'update', genre = '', page = 1 } = {}) => {
    const p = new URLSearchParams({ status, type, order, genre, page: String(page) });
    return get(`/browse?${p}`);
  },
  search: (q, page = 1) => get(`/search?q=${encodeURIComponent(q)}&page=${page}`),
  series: (slug) => get(`/series/${encodeURIComponent(slug)}`),
  episode: (slug) => get(`/episode/${encodeURIComponent(slug)}`),
  resolve: (mirror) => get(`/resolve?mirror=${encodeURIComponent(mirror)}`),
};

/** Episodes often come back newest-first; the player wants oldest-first. */
export function sortEpisodes(episodes = [], dir = 'asc') {
  const num = (e) => {
    const n = parseFloat(e.number);
    return Number.isFinite(n) ? n : -1;
  };
  return [...episodes].sort((a, b) => (dir === 'asc' ? num(a) - num(b) : num(b) - num(a)));
}
