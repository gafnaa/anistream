import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav.jsx';
import Home from './pages/Home.jsx';
import Browse from './pages/Browse.jsx';
import Search from './pages/Search.jsx';
import Series from './pages/Series.jsx';
import Watch from './pages/Watch.jsx';
import Library from './pages/Library.jsx';

function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <div className="big">✕</div>
        Page not found.
        <div style={{ marginTop: 16 }}>
          <Link to="/" className="load-more" style={{ display: 'inline-block', padding: '12px 26px' }}>
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [showNav, setShowNav] = useState(true);

  // Hide the bottom nav while watching so the player gets full attention.
  useEffect(() => {
    setShowNav(!location.pathname.startsWith('/watch/'));
  }, [location.pathname]);

  return (
    <div className="app" style={showNav ? undefined : { paddingBottom: 24 }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/search" element={<Search />} />
        <Route path="/series/:slug" element={<Series />} />
        <Route path="/watch/:slug" element={<Watch />} />
        <Route path="/library" element={<Library />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
}
