import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import Poster from '../components/Poster.jsx';

const STATUS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: '', label: 'All' },
];

const ORDER = [
  { key: 'update', label: 'Recently updated' },
  { key: 'popular', label: 'Most popular' },
  { key: 'rating', label: 'Top rated' },
  { key: 'latest', label: 'Newest' },
];

const TYPES = [
  { key: '', label: 'Any type' },
  { key: 'tv', label: 'TV Series' },
  { key: 'movie', label: 'Movie' },
  { key: 'ova', label: 'OVA' },
  { key: 'ona', label: 'ONA' },
  { key: 'special', label: 'Special' },
];

export default function Browse() {
  const [status, setStatus] = useState('ongoing');
  const [order, setOrder] = useState('update');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Reset to page 1 whenever a filter changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setPage(1);
    api
      .browse({ status, order, type, page: 1 })
      .then((d) => {
        if (!alive) return;
        setItems(d.items);
        setHasNext(d.hasNext);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [status, order, type]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api.browse({ status, order, type, page: next });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.slug));
        return [...prev, ...d.items.filter((i) => !seen.has(i.slug))];
      });
      setPage(next);
      setHasNext(d.hasNext);
    } catch {
      setHasNext(false);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <TopBar title="Browse" />
      <div className="page">
        <div className="chips">
          {STATUS.map((s) => (
            <button
              key={s.key}
              className={`chip ${status === s.key ? 'active' : ''}`}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="chips" style={{ marginTop: -10 }}>
          {ORDER.map((o) => (
            <button
              key={o.key}
              className={`chip ${order === o.key ? 'active' : ''}`}
              onClick={() => setOrder(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="chips" style={{ marginTop: -10 }}>
          {TYPES.map((t) => (
            <button
              key={t.key}
              className={`chip ${type === t.key ? 'active' : ''}`}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="empty">
            <div className="big">⚠</div>
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="skel skel-poster" />
                <div className="skel" style={{ height: 11, marginTop: 8, width: '85%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty">
            <div className="big">▤</div>
            No series match these filters.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid">
            {items.map((it) => (
              <Poster key={it.slug} item={{ ...it, kind: 'series' }} showEpisode={false} />
            ))}
          </div>
        )}

        {hasNext && !loading && (
          <button className="load-more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </>
  );
}
