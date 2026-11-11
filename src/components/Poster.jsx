import { Link } from 'react-router-dom';

/**
 * Poster card used in every grid. Episode cards link straight to the player,
 * series cards link to the detail page.
 */
export default function Poster({ item, showEpisode = true }) {
  if (!item?.slug) return null;
  const to =
    item.kind === 'episode'
      ? `/watch/${item.slug}`
      : `/series/${item.slug}`;

  return (
    <Link to={to} className="poster-card" style={{ display: 'block' }}>
      <div className="poster">
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" />
        ) : (
          <div className="skel" style={{ width: '100%', height: '100%' }} />
        )}
        {showEpisode && item.episode != null && <span className="poster-ep">EP {item.episode}</span>}
      </div>
      <p className="poster-title">{item.title}</p>
      {item.kind === 'episode' && item.type && <div className="poster-meta">{item.type}</div>}
      {item.kind === 'series' && item.status && <div className="poster-meta">{item.status}</div>}
    </Link>
  );
}
