import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar, { SectionHead } from '../components/TopBar.jsx';
import Poster from '../components/Poster.jsx';
import { getBookmarks, getHistory, clearHistory } from '../storage.js';

export default function Library() {
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setHistory(getHistory());
  }, []);

  return (
    <>
      <TopBar title="Library" />
      <div className="page">
        <SectionHead title="Continue watching" action={history.length ? 'Clear' : null} />
        {history.length > 0 && (
          <button
            onClick={() => {
              clearHistory();
              setHistory([]);
            }}
            style={{ display: 'none' }}
          />
        )}

        {history.length === 0 ? (
          <div className="empty" style={{ padding: '26px 20px' }}>
            <div className="big">▶</div>
            Nothing watched yet.
          </div>
        ) : (
          <div className="ep-list" style={{ marginBottom: 26 }}>
            {history.map((h) => (
              <Link to={`/watch/${h.episodeSlug}`} className="ep-row" key={h.episodeSlug}>
                <div className="ep-num">{h.number ?? '•'}</div>
                <div className="ep-body">
                  <div className="ep-title">{h.seriesTitle || h.title}</div>
                  <div className="ep-date">
                    Episode {h.number} · {new Date(h.watchedAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="ep-play">▶</span>
              </Link>
            ))}
          </div>
        )}

        {history.length > 0 && (
          <button
            className="load-more"
            style={{ marginTop: -14, marginBottom: 26 }}
            onClick={() => {
              clearHistory();
              setHistory([]);
            }}
          >
            Clear history
          </button>
        )}

        <SectionHead title="My watchlist" action={bookmarks.length ? `${bookmarks.length}` : null} />
        {bookmarks.length === 0 ? (
          <div className="empty">
            <div className="big">♡</div>
            Bookmark a series to find it here.
          </div>
        ) : (
          <div className="grid">
            {bookmarks.map((b) => (
              <Poster key={b.slug} item={{ ...b, kind: 'series' }} showEpisode={false} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
