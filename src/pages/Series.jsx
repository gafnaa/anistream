import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, sortEpisodes } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import { isBookmarked, toggleBookmark } from '../storage.js';

export default function Series() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [asc, setAsc] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    setSaved(isBookmarked(slug));
    window.scrollTo(0, 0);
    api
      .series(slug)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [slug]);

  const episodes = data ? sortEpisodes(data.episodes, asc ? 'asc' : 'desc') : [];
  const first = episodes[0];

  return (
    <>
      <TopBar
        title={data?.title || 'Series'}
        back
        right={
          data ? (
            <button
              className="icon-btn"
              aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
              onClick={() => setSaved(toggleBookmark(data))}
              style={saved ? { color: 'var(--accent)', borderColor: 'rgba(255,77,109,.4)' } : undefined}
            >
              {saved ? '♥' : '♡'}
            </button>
          ) : null
        }
      />

      {error && (
        <div className="page">
          <div className="empty">
            <div className="big">⚠</div>
            {error}
          </div>
        </div>
      )}

      {!data && !error && (
        <div className="page">
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="skel" style={{ width: 118, height: 168, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skel" style={{ height: 18, width: '80%', marginBottom: 10 }} />
              <div className="skel" style={{ height: 12, width: '50%', marginBottom: 8 }} />
              <div className="skel" style={{ height: 12, width: '65%' }} />
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="page">
          <div className="series-hero">
            <div className="series-hero-bg" style={{ backgroundImage: `url(${data.image})` }} />
            <div className="series-top">
              <div className="poster">
                {data.image && <img src={data.image} alt={data.title} />}
              </div>
              <div className="series-meta">
                <h1>{data.title}</h1>
                <div className="meta-row">
                  {data.type && <span className="tag brand">{data.type}</span>}
                  {data.status && <span className="tag">{data.status}</span>}
                  {data.season && <span className="tag">{data.season}</span>}
                  {data.rating && <span className="tag">★ {data.rating}</span>}
                </div>
                <div className="series-facts">
                  {data.studio && (
                    <>
                      <b>Studio</b> {data.studio}
                      <br />
                    </>
                  )}
                  {data.released && (
                    <>
                      <b>Released</b> {data.released}
                      <br />
                    </>
                  )}
                  <b>Episodes</b> {episodes.length || '—'}
                </div>
              </div>
            </div>
          </div>

          {data.genres?.length > 0 && (
            <div className="meta-row" style={{ marginBottom: 16 }}>
              {data.genres.slice(0, 8).map((g) => (
                <span className="tag" key={g}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {first && (
            <Link
              to={`/watch/${first.slug}`}
              className="load-more"
              style={{
                display: 'block',
                textAlign: 'center',
                background: 'linear-gradient(135deg, var(--brand), var(--brand-2))',
                borderColor: 'transparent',
                color: '#fff',
                marginTop: 0,
                marginBottom: 18,
                fontWeight: 800,
              }}
            >
              ▶ Start watching · EP {first.number}
            </Link>
          )}

          {data.synopsis && (
            <>
              <div className="section-head">
                <h3>Synopsis</h3>
              </div>
              <p className={`synopsis ${expanded ? 'open' : ''}`}>{data.synopsis}</p>
              <button className="more-btn" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show less' : 'Read more'}
              </button>
            </>
          )}

          <div className="section-head">
            <h3>Episodes</h3>
            <button
              onClick={() => setAsc((v) => !v)}
              style={{ fontSize: 12.5, color: 'var(--brand)', fontWeight: 700 }}
            >
              {asc ? 'Oldest first ↓' : 'Newest first ↑'}
            </button>
          </div>

          {episodes.length === 0 ? (
            <div className="empty">
              <div className="big">▤</div>
              No episodes uploaded yet.
            </div>
          ) : (
            <div className="ep-list">
              {episodes.map((ep) => (
                <Link to={`/watch/${ep.slug}`} className="ep-row" key={ep.slug}>
                  <div className="ep-num">{ep.number ?? '•'}</div>
                  <div className="ep-body">
                    <div className="ep-title">{ep.title || `Episode ${ep.number}`}</div>
                    {ep.date && <div className="ep-date">{ep.date}</div>}
                  </div>
                  <span className="ep-play">▶</span>
                </Link>
              ))}
            </div>
          )}

          <div className="notice">
            <b>Source:</b> metadata and video links are scraped from samehadaku.li at request time. All
            content belongs to its original rights holders.
          </div>
        </div>
      )}
    </>
  );
}
