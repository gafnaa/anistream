import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import Poster from '../components/Poster.jsx';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') || '';
  const [term, setTerm] = useState(initial);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const reqId = useRef(0);

  async function run(q) {
    const query = q.trim();
    if (!query) {
      setResults(null);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const d = await api.search(query);
      if (id === reqId.current) setResults(d.items);
    } catch (e) {
      if (id === reqId.current) setError(e.message);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  // Debounce typing so we don't fire a request per keystroke.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      run(term);
      setParams(term.trim() ? { q: term.trim() } : {}, { replace: true });
    }, 450);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <>
      <TopBar title="Search" />
      <div className="page">
        <div className="searchbar">
          <span style={{ color: 'var(--muted)' }}>⌕</span>
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search anime…"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="search"
          />
          {term && (
            <button onClick={() => setTerm('')} style={{ color: 'var(--muted)', fontSize: 16 }} aria-label="Clear">
              ✕
            </button>
          )}
        </div>

        {loading && (
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <div className="skel skel-poster" />
                <div className="skel" style={{ height: 11, marginTop: 8, width: '80%' }} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="empty">
            <div className="big">⚠</div>
            {error}
          </div>
        )}

        {!loading && results && results.length === 0 && (
          <div className="empty">
            <div className="big">⌕</div>
            No results for “{term.trim()}”.
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <>
            <div className="section-head">
              <h3>Results</h3>
              <span>{results.length}</span>
            </div>
            <div className="grid">
              {results.map((it) => (
                <Poster key={it.slug} item={{ ...it, kind: 'series' }} showEpisode={false} />
              ))}
            </div>
          </>
        )}

        {!loading && !results && !error && (
          <div className="empty">
            <div className="big">⌕</div>
            Search by title, e.g. “One Piece” or “Jujutsu”.
          </div>
        )}
      </div>
    </>
  );
}
