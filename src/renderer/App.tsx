import { useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { applyAccentTheme, DEFAULT_ACCENT } from '../shared/accentTheme';
import { PlaylistProvider, usePlaylists } from './lib/PlaylistContext';
import { PreviewProvider } from './lib/PreviewContext';
import { api } from './lib/api';
import { PlaylistIcon } from './components/PlaylistIcon';
import { CatalogPage } from './pages/CatalogPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { SetlistPage } from './pages/SetlistPage';
import { SettingsPage } from './pages/SettingsPage';

function SidebarNav() {
  const { playlists } = usePlaylists();

  return (
    <nav className="nav">
      <NavLink to="/" end>
        Catalog
      </NavLink>
      <NavLink to="/favorites">Favorites</NavLink>
      <NavLink to="/setlist">Setlist</NavLink>
      <NavLink to="/settings">Settings</NavLink>
      {playlists.length > 0 ? (
        <>
          <div className="nav-section-label">Playlists</div>
          <div className="playlist-tiles">
            {playlists.map((p) => (
              <NavLink
                key={p.id}
                to={`/playlist/${p.id}`}
                className="playlist-tile"
                title={p.name}
              >
                <PlaylistIcon icon={p.icon} iconColor={p.iconColor} />
                <span className="playlist-tile-name">{p.name}</span>
              </NavLink>
            ))}
          </div>
        </>
      ) : null}
    </nav>
  );
}

function AccentBootstrap() {
  useEffect(() => {
    void api()
      .settingsGet()
      .then((s) => applyAccentTheme(s.accentColor || DEFAULT_ACCENT))
      .catch(() => applyAccentTheme(DEFAULT_ACCENT));
  }, []);
  return null;
}

export function App() {
  return (
    <PreviewProvider>
      <PlaylistProvider>
        <AccentBootstrap />
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <span>CH</span>
              Catalog
            </div>
            <SidebarNav />
          </aside>
          <Routes>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/setlist" element={<SetlistPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
          </Routes>
        </div>
      </PlaylistProvider>
    </PreviewProvider>
  );
}
