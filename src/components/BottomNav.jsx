import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Home', ico: '⌂', end: true },
  { to: '/browse', label: 'Browse', ico: '▤' },
  { to: '/search', label: 'Search', ico: '⌕' },
  { to: '/library', label: 'Library', ico: '♡' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="nav-ico" aria-hidden="true">
            {i.ico}
          </span>
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
