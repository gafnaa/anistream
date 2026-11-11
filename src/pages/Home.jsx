import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import TopBar, { SectionHead } from '../components/TopBar.jsx';
import Poster from '../components/Poster.jsx';

function GridSkeleton({ count = 9 }) {
  return (
    <div className="grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skel skel-poster" />
          <div className="skel" style={{ height: 11, marginTop: 8, width: '85%' }} />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .home()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setItems(d.latest || []);
        setHasNext(true);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const d = await api.latest(next);
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

  const hero = data?.trending?.[0];

  return (
    <>
      <TopBar
        title="AniStream"
        right={
          <Link to="/search" className="icon-btn" aria-label="Search">
            ⌕
          </Link>
        }
      />
      <div className="page">
        {error && (
          <div className="empty">
            <div className="big">⚠</div>
            {error}
            <div style={{ marginTop: 14 }}>
              <button className="load-more" onClick={() => location.reload()}>
                Retry
              </button>
            </div>
          </div>
        )}

        {!data && !error && (
          <>
            <div className="skel" style={{ aspectRatio: '4/5', maxHeight: 420, borderRadius: 18, marginBottom: 22 }} />
            <GridSkeleton />
          </>
        )}

        {hero && (
          <Link to={`/series/${hero.slug}`} className="hero">
            {hero.image && <img src={hero.image} alt={hero.title} />}
            <div className="hero-info">
              <span className="hero-badge">🔥 Trending now</span>
              <h2>{hero.title}</h2>
              <span className="hero-play">▶ Watch now</span>
            </div>
          </Link>
        )}

        {data?.ongoing?.length > 0 && (
          <>
            <SectionHead title="Ongoing" action="Browse all" to="/browse" />
            <div className="rail">
              {data.ongoing.map((s) => (
                <div className="rail-item" key={s.slug}>
                  <Poster item={{ ...s, kind: 'series' }} showEpisode={false} />
                </div>
              ))}
            </div>
          </>
        )}

        <SectionHead title="Latest episodes" action="Browse all" to="/browse" />
        {!data && !error ? (
          <GridSkeleton />
        ) : (
          <div className="grid">
            {items.map((it) => (
              <Poster key={it.slug} item={it} />
            ))}
          </div>
        )}

        {hasNext && items.length > 0 && (
          <button className="load-more" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </>
  );
}
