import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, sortEpisodes } from '../api.js';
import TopBar from '../components/TopBar.jsx';
import Player from '../components/Player.jsx';
import { addHistory } from '../storage.js';

export default function Watch() {
  const { slug } = useParams();

  const [episode, setEpisode] = useState(null);
  const [series, setSeries] = useState(null);
  const [epError, setEpError] = useState(null);

  const [serverIndex, setServerIndex] = useState(0);
  const [source, setSource] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  const resolvedCache = useRef(new Map());

  /* ---------------- load the episode ---------------- */
  useEffect(() => {
    let alive = true;
    setEpisode(null);
    setEpError(null);
    setSource(null);
    setResolveError(null);
    setServerIndex(0);
    resolvedCache.current.clear();
    window.scrollTo(0, 0);

    api
      .episode(slug)
      .then((d) => alive && setEpisode(d))
      .catch((e) => alive && setEpError(e.message));

    return () => {
      alive = false;
    };
  }, [slug]);

  /* ---------------- load the parent series (for the episode list) ---------------- */
  useEffect(() => {
    if (!episode?.seriesSlug) return;
    let alive = true;
    api
      .series(episode.seriesSlug)
      .then((d) => alive && setSeries(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [episode?.seriesSlug]);

  /* ---------------- resolve the selected mirror ---------------- */
  const currentMirror = episode?.sources?.[serverIndex] || null;

  useEffect(() => {
    if (!currentMirror) return;
    let alive = true;

    const cached = resolvedCache.current.get(currentMirror.url);
    if (cached) {
      setSource(cached);
      return;
    }

    setResolving(true);
    setResolveError(null);
    setSource(null);

    api
      .resolve(currentMirror.url)
      .then((d) => {
        if (!alive) return;
        const src = {
          type: d.type === 'hls' ? 'hls' : d.type === 'mp4' ? 'mp4' : 'iframe',
          url: d.playUrl || d.url,
        };
        resolvedCache.current.set(currentMirror.url, src);
        setSource(src);
      })
      .catch((e) => alive && setResolveError(e.message))
      .finally(() => alive && setResolving(false));

    return () => {
      alive = false;
    };
  }, [currentMirror]);

  const onPlayerError = useCallback(() => {
    // Auto-hop to the next mirror when one fails.
    setServerIndex((i) => (episode && i + 1 < episode.sources.length ? i + 1 : i));
  }, [episode]);

  const episodes = useMemo(() => {
    if (!series) return [];
    return sortEpisodes(series.episodes, 'asc');
  }, [series]);

  const currentIndex = episodes.findIndex((e) => e.slug === slug);
  const prevEp = episode?.prevSlug ? episodes.find((e) => e.slug === episode.prevSlug) : null;
  const nextEp = episode?.nextSlug ? episodes.find((e) => e.slug === episode.nextSlug) : null;

  const poster = series?.image || null;

  // Record this episode in "continue watching" once we know its number.
  useEffect(() => {
    if (!episode) return;
    const ep = series?.episodes?.find((e) => e.slug === slug);
    addHistory({
      episodeSlug: slug,
      number: ep?.number ?? null,
      title: episode.title,
      seriesTitle: episode.seriesTitle,
      seriesSlug: episode.seriesSlug,
    });
  }, [episode, series, slug]);

  return (
    <>
      <TopBar title={episode?.seriesTitle || 'Watch'} back />

      <div className="page">
        {epError && (
          <div className="empty">
            <div className="big">⚠</div>
            {epError}
          </div>
        )}

        {!episode && !epError && (
          <>
            <div className="skel" style={{ aspectRatio: '16/9', borderRadius: 12, marginBottom: 14 }} />
            <div className="skel" style={{ height: 16, width: '70%', marginBottom: 8 }} />
            <div className="skel" style={{ height: 12, width: '40%' }} />
          </>
        )}

        {episode && (
          <>
            {resolveError ? (
              <div className="player-wrap">
                <div className="player-state">
                  <span style={{ fontSize: 26 }}>⚠</span>
                  <span>{resolveError}</span>
                  {episode.sources.length > 1 && (
                    <button
                      className="server-btn active"
                      onClick={() => setServerIndex((i) => (i + 1) % episode.sources.length)}
                    >
                      Try next server
                    </button>
                  )}
                </div>
              </div>
            ) : resolving || !source ? (
              <div className="player-wrap">
                <div className="player-state">
                  <div className="spinner" />
                  <span>Resolving video source…</span>
                </div>
              </div>
            ) : (
              <Player source={source} poster={poster} onError={onPlayerError} />
            )}

            <div className="ep-head">
              <h2>{episode.title}</h2>
              {episode.seriesSlug && (
                <p>
                  <Link to={`/series/${episode.seriesSlug}`} style={{ color: 'var(--brand)', fontWeight: 700 }}>
                    {episode.seriesTitle}
                  </Link>
                </p>
              )}
            </div>

            {episode.sources.length > 0 && (
              <>
                <div className="section-head">
                  <h3>Servers</h3>
                  <span>{episode.sources.length} available</span>
                </div>
                <div className="server-row">
                  {episode.sources.map((s, i) => (
                    <button
                      key={`${s.label}-${i}`}
                      className={`server-btn ${i === serverIndex ? 'active' : ''}`}
                      onClick={() => setServerIndex(i)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="ep-nav">
              {prevEp ? <Link to={`/watch/${prevEp.slug}`}>‹ Ep {prevEp.number}</Link> : <span>‹ Prev</span>}
              {nextEp ? <Link to={`/watch/${nextEp.slug}`}>Ep {nextEp.number} ›</Link> : <span>Next ›</span>}
            </div>

            {episodes.length > 0 && (
              <>
                <div className="section-head">
                  <h3>All episodes</h3>
                  <span>
                    {currentIndex >= 0 ? `${currentIndex + 1} / ${episodes.length}` : `${episodes.length}`}
                  </span>
                </div>
                <div className="ep-list">
                  {episodes.map((ep) => (
                    <Link
                      to={`/watch/${ep.slug}`}
                      className="ep-row"
                      key={ep.slug}
                      style={
                        ep.slug === slug
                          ? { borderColor: 'var(--brand)', background: 'rgba(124,92,255,0.1)' }
                          : undefined
                      }
                    >
                      <div className="ep-num">{ep.number ?? '•'}</div>
                      <div className="ep-body">
                        <div className="ep-title">{ep.title || `Episode ${ep.number}`}</div>
                        {ep.date && <div className="ep-date">{ep.date}</div>}
                      </div>
                      <span className="ep-play">▶</span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="notice">
              <b>Playback note:</b> if a server shows an error, switch to another one — mirrors go down
              often. Video is proxied through this app because the CDN blocks cross-origin playback.
            </div>
          </>
        )}
      </div>
    </>
  );
}
