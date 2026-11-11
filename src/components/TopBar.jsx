import { Link } from 'react-router-dom';

export default function TopBar({ title = 'AniStream', back = false, right = null }) {
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" onClick={() => history.back()} aria-label="Back">
          ‹
        </button>
      ) : (
        <div className="logo-dot">A</div>
      )}
      <h1>{title}</h1>
      <div className="spacer" />
      {right}
    </header>
  );
}

export function SectionHead({ title, action, to }) {
  return (
    <div className="section-head">
      <h3>{title}</h3>
      {action && (to ? <Link to={to}>{action}</Link> : <span>{action}</span>)}
    </div>
  );
}
