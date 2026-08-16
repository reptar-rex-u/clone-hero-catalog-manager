import { useEffect, useState } from 'react';
import {
  DEFAULT_ACCENT,
  applyAccentTheme,
  normalizeHex,
} from '../../shared/accentTheme';
import type { AppSettings, LibraryStatus } from '../../shared/types';
import { api } from '../lib/api';
import { usePlaylists } from '../lib/PlaylistContext';

const ACCENT_PRESETS = [
  { label: 'Green', value: DEFAULT_ACCENT },
  { label: 'Teal', value: '#2ec4b6' },
  { label: 'Blue', value: '#4c9ffe' },
  { label: 'Purple', value: '#a78bfa' },
  { label: 'Pink', value: '#f472b6' },
  { label: 'Orange', value: '#fb923c' },
  { label: 'Red', value: '#f87171' },
];

export function SettingsPage() {
  const { refreshPlaylists } = usePlaylists();
  const [settings, setSettings] = useState<AppSettings>({
    songsDirectory: '',
    bridgePath: '',
    cloneHeroPath: '',
    accentColor: DEFAULT_ACCENT,
  });
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void api().settingsGet().then((s) => {
      setSettings(s);
      applyAccentTheme(s.accentColor);
    });
    void api().libraryStatus().then(setStatus);
    return api().onLibraryStatus(setStatus);
  }, []);

  const setAccent = (hex: string) => {
    const normalized = normalizeHex(hex) ?? DEFAULT_ACCENT;
    setSettings((s) => ({ ...s, accentColor: normalized }));
    applyAccentTheme(normalized);
  };

  return (
    <div className="main">
      <div className="content">
        <div className="page-header">
          <h1>Settings</h1>
        </div>
        <div className="settings-form">
          <div className="settings-row">
            <label htmlFor="songs-dir">Songs folder</label>
            <input
              id="songs-dir"
              className="search-input"
              value={settings.songsDirectory}
              onChange={(e) =>
                setSettings((s) => ({ ...s, songsDirectory: e.target.value }))
              }
            />
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const dir = await api().pickDirectory();
                if (dir) setSettings((s) => ({ ...s, songsDirectory: dir }));
              }}
            >
              Browse…
            </button>
          </div>

          <div className="settings-row">
            <div>
              <label htmlFor="bridge-path">Bridge executable</label>
              <p className="settings-help">
                Used by Launch Bridge to find missing songs.
              </p>
            </div>
            <input
              id="bridge-path"
              className="search-input"
              placeholder="Path to Bridge.exe"
              value={settings.bridgePath}
              onChange={(e) =>
                setSettings((s) => ({ ...s, bridgePath: e.target.value }))
              }
            />
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const path = await api().pickExecutable();
                if (path) setSettings((s) => ({ ...s, bridgePath: path }));
              }}
            >
              Browse…
            </button>
          </div>

          <div className="settings-row">
            <div>
              <label htmlFor="clone-hero-path">Clone Hero executable</label>
              <p className="settings-help">
                Used by Launch Clone Hero from the catalog.
              </p>
            </div>
            <input
              id="clone-hero-path"
              className="search-input"
              placeholder="Path to Clone Hero.exe"
              value={settings.cloneHeroPath}
              onChange={(e) =>
                setSettings((s) => ({ ...s, cloneHeroPath: e.target.value }))
              }
            />
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const path = await api().pickExecutable();
                if (path) setSettings((s) => ({ ...s, cloneHeroPath: path }));
              }}
            >
              Browse…
            </button>
          </div>

          <div className="settings-accent-block">
            <label htmlFor="accent-color">Accent color</label>
            <p className="settings-help">
              Picks the app highlight color. Buttons, nav, and glows use matching
              lighter/darker tones.
            </p>
            <div className="accent-picker-row">
              <input
                id="accent-color"
                className="accent-color-input"
                type="color"
                value={normalizeHex(settings.accentColor) ?? DEFAULT_ACCENT}
                onChange={(e) => setAccent(e.target.value)}
                title="Choose accent color"
              />
              <input
                className="search-input accent-hex-input"
                value={settings.accentColor}
                spellCheck={false}
                onChange={(e) => {
                  const v = e.target.value;
                  setSettings((s) => ({ ...s, accentColor: v }));
                  if (normalizeHex(v)) applyAccentTheme(v);
                }}
                onBlur={() => {
                  const n = normalizeHex(settings.accentColor);
                  if (n) setAccent(n);
                  else setAccent(DEFAULT_ACCENT);
                }}
              />
              <button
                className="btn"
                type="button"
                onClick={() => setAccent(DEFAULT_ACCENT)}
              >
                Reset green
              </button>
            </div>
            <div className="accent-presets">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`accent-swatch${
                    (normalizeHex(settings.accentColor) ?? DEFAULT_ACCENT) ===
                    p.value
                      ? ' is-active'
                      : ''
                  }`}
                  style={{ background: p.value }}
                  title={p.label}
                  aria-label={p.label}
                  onClick={() => setAccent(p.value)}
                />
              ))}
            </div>
            <div className="accent-preview">
              <button className="btn btn-primary" type="button">
                Primary
              </button>
              <span className="chip flag">Preview</span>
              <span className="status-chip" style={{ color: 'var(--accent)' }}>
                Accent text
              </span>
            </div>
          </div>

          <div className="row-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={async () => {
                const next = await api().settingsSet({
                  ...settings,
                  accentColor:
                    normalizeHex(settings.accentColor) ?? DEFAULT_ACCENT,
                });
                setSettings(next);
                applyAccentTheme(next.accentColor);
                setMessage('Settings saved.');
              }}
            >
              Save
            </button>
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const s = await api().libraryRescan();
                setStatus(s);
                setMessage('Rescan started.');
              }}
            >
              Rescan library
            </button>
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const result = await api().libraryExportSkipped();
                if (result.canceled) {
                  setMessage('Export canceled.');
                  return;
                }
                if (!result.ok) {
                  setMessage(result.error ?? 'Export failed.');
                  return;
                }
                setMessage(
                  result.count === 0
                    ? `Exported empty skip log to ${result.path}`
                    : `Exported ${result.count.toLocaleString()} skipped folder(s) to ${result.path}`,
                );
              }}
            >
              Export skipped songs
            </button>
          </div>
          <div className="row-actions">
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const result = await api().favoritesExport();
                if (result.canceled) {
                  setMessage('Settings export canceled.');
                  return;
                }
                if (!result.ok) {
                  setMessage(result.error ?? 'Settings export failed.');
                  return;
                }
                setMessage(
                  `Exported settings` +
                    (result.count
                      ? `, ${result.count.toLocaleString()} favorite(s)`
                      : '') +
                    (result.playlistCount
                      ? `, ${result.playlistCount.toLocaleString()} playlist(s)`
                      : '') +
                    ` to ${result.path}`,
                );
              }}
            >
              Export settings
            </button>
            <button
              className="btn"
              type="button"
              onClick={async () => {
                const result = await api().favoritesImport();
                if (result.canceled) {
                  setMessage('Settings import canceled.');
                  return;
                }
                if (!result.ok) {
                  setMessage(result.error ?? 'Settings import failed.');
                  return;
                }
                if (result.accentColor) {
                  setSettings((s) => ({
                    ...s,
                    accentColor: result.accentColor!,
                  }));
                  applyAccentTheme(result.accentColor);
                }
                setMessage(
                  `Imported settings` +
                    (result.matched
                      ? `, ${result.matched.toLocaleString()} favorite(s)`
                      : '') +
                    (result.playlistsImported
                      ? `, ${result.playlistsImported.toLocaleString()} playlist(s)`
                      : '') +
                    (result.accentColor ? ', accent color' : '') +
                    '.',
                );
                await refreshPlaylists();
              }}
            >
              Import settings
            </button>
          </div>
          {status && (
            <p className="status-chip">
              {status.scanning
                ? status.scanTotal > 0
                  ? `Scanning… ${status.scanned.toLocaleString()}/${status.scanTotal.toLocaleString()} (${status.songCount.toLocaleString()} indexed)`
                  : 'Scanning…'
                : `Indexed ${status.songCount.toLocaleString()} songs`}
              {status.skippedCount > 0
                ? ` · ${status.skippedCount.toLocaleString()} skipped`
                : ''}
              {status.lastError ? ` · Error: ${status.lastError}` : ''}
            </p>
          )}
          {message && <p className="status-chip">{message}</p>}
        </div>
      </div>
    </div>
  );
}
