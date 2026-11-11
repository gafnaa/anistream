import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

/**
 * Unified video player.
 *
 * - `type: 'hls'`  -> plays through hls.js using our /api/hls proxy
 * - `type: 'mp4'`  -> plain <video src>
 * - `type: 'iframe'` -> third-party embed we can only frame (blogger, ok.ru…)
 *
 * The stream CDN sends `Access-Control-Allow-Origin: https://play.xtwap.top`,
 * so a direct browser request is blocked. Everything HLS goes through the
 * backend proxy, which is also what lets us serve segments with correct CORS.
 */
export default function Player({ source, poster, onError }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!source) return;

    const video = videoRef.current;
    if (!video) return;

    setStatus('loading');
    setMessage('');

    // Clean up a previous hls instance before attaching a new source.
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (source.type === 'iframe') {
      setStatus('ready');
      return;
    }

    const fail = (msg) => {
      setStatus('error');
      setMessage(msg);
      onError?.(msg);
    };

    if (source.type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
          lowLatencyMode: false,
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 2,
          fragLoadingTimeOut: 30000,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus('ready'));
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            fail('This stream could not be loaded. Try another server.');
          }
        });

        hls.loadSource(source.url);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS: Safari / iOS
        video.src = source.url;
        setStatus('ready');
      } else {
        fail('HLS is not supported in this browser.');
      }
    } else {
      video.src = source.url;
      setStatus('ready');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [source, onError]);

  if (source?.type === 'iframe') {
    return (
      <div className="player-wrap">
        <iframe
          src={source.url}
          title="Video player"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
        />
      </div>
    );
  }

  return (
    <div className="player-wrap">
      <video
        ref={videoRef}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onError={() => {
          setStatus('error');
          setMessage('Playback failed. Try another server.');
        }}
        onCanPlay={() => setStatus((s) => (s === 'loading' ? 'ready' : s))}
      />

      {status === 'loading' && (
        <div className="player-state">
          <div className="spinner" />
          <span>Loading stream…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="player-state">
          <span style={{ fontSize: 26 }}>⚠</span>
          <span>{message || 'Something went wrong.'}</span>
        </div>
      )}
    </div>
  );
}
