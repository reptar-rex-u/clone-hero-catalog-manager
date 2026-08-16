import fs from 'node:fs';
import { BrowserWindow, dialog } from 'electron';
import { getDb } from './db/connection';
import {
  addSongToPlaylist,
  createPlaylist,
  listPlaylists,
  listPlaylistsForExport,
  updatePlaylistIcon,
} from './db/playlistsRepo';
import {
  importPlaylistIconFromDataUrl,
  playlistIconToDataUrl,
} from './playlistIconsStore';
import {
  DEFAULT_PLAYLIST_ICON,
  DEFAULT_PLAYLIST_ICON_COLOR,
  isCustomPlaylistIcon,
  normalizePlaylistIcon,
} from '../shared/playlistIcons';
import { normalizeHex } from '../shared/accentTheme';
import { loadSettings, saveSettings } from './settings';

export interface SongRefExportEntry {
  folderPath: string;
  name: string;
  artist: string;
  album: string;
  charter: string;
}

export interface PlaylistExportEntry {
  name: string;
  icon?: string;
  iconColor?: string;
  /** Base64 data URL for custom uploaded icons. */
  iconImage?: string;
  songs: SongRefExportEntry[];
}

export interface SettingsExportEntry {
  accentColor: string;
}

export interface LibraryBackupFile {
  version: 2 | 3;
  app: 'CH Catalog';
  exportedAt: string;
  settings?: SettingsExportEntry;
  favorites: SongRefExportEntry[];
  playlists: PlaylistExportEntry[];
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function listFavoriteRows(): SongRefExportEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT folder_path, name, artist, album, charter
       FROM songs
       WHERE is_favorite = 1
       ORDER BY artist COLLATE NOCASE, name COLLATE NOCASE`,
    )
    .all() as Array<{
    folder_path: string;
    name: string;
    artist: string;
    album: string;
    charter: string;
  }>;

  return rows.map((r) => ({
    folderPath: r.folder_path,
    name: r.name ?? '',
    artist: r.artist ?? '',
    album: r.album ?? '',
    charter: r.charter ?? '',
  }));
}

function findSongId(entry: SongRefExportEntry): number | null {
  const db = getDb();

  const byPath = db
    .prepare('SELECT id FROM songs WHERE folder_path = ?')
    .get(entry.folderPath) as { id: number } | undefined;
  if (byPath) return byPath.id;

  const byMeta = db
    .prepare(
      `SELECT id FROM songs
       WHERE lower(trim(name)) = ? AND lower(trim(artist)) = ?
       LIMIT 1`,
    )
    .get(normalizeKey(entry.name), normalizeKey(entry.artist)) as
    | { id: number }
    | undefined;
  if (byMeta) return byMeta.id;

  return null;
}

function asSongRef(entry: unknown): SongRefExportEntry | null {
  if (!entry || typeof entry !== 'object') return null;
  const e = entry as Record<string, unknown>;
  return {
    folderPath: String(e.folderPath ?? ''),
    name: String(e.name ?? ''),
    artist: String(e.artist ?? ''),
    album: String(e.album ?? ''),
    charter: String(e.charter ?? ''),
  };
}

export async function exportFavorites(): Promise<{
  ok: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
  count: number;
  playlistCount: number;
}> {
  const favorites = listFavoriteRows();
  const playlists = listPlaylistsForExport().map((p) => {
    const iconImage = isCustomPlaylistIcon(p.icon)
      ? playlistIconToDataUrl(p.icon) ?? undefined
      : undefined;
    return {
      name: p.name,
      icon: iconImage ? DEFAULT_PLAYLIST_ICON : p.icon,
      iconColor: p.iconColor,
      ...(iconImage ? { iconImage } : {}),
      songs: p.songs,
    };
  });
  const settings = loadSettings();
  const payload: LibraryBackupFile = {
    version: 3,
    app: 'CH Catalog',
    exportedAt: new Date().toISOString(),
    settings: {
      accentColor: settings.accentColor,
    },
    favorites,
    playlists,
  };

  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win ?? undefined, {
    title: 'Export settings',
    defaultPath: 'ch-catalog-settings.json',
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return {
      ok: false,
      canceled: true,
      count: favorites.length,
      playlistCount: playlists.length,
    };
  }

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
    return {
      ok: true,
      path: result.filePath,
      count: favorites.length,
      playlistCount: playlists.length,
    };
  } catch (err) {
    return {
      ok: false,
      count: favorites.length,
      playlistCount: playlists.length,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function importFavorites(): Promise<{
  ok: boolean;
  canceled?: boolean;
  error?: string;
  matched: number;
  missing: number;
  total: number;
  playlistsImported: number;
  accentColor?: string;
}> {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win ?? undefined, {
    title: 'Import settings',
    properties: ['openFile'],
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return {
      ok: false,
      canceled: true,
      matched: 0,
      missing: 0,
      total: 0,
      playlistsImported: 0,
    };
  }

  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(raw) as Partial<LibraryBackupFile> & {
      favorites?: unknown[];
      playlists?: unknown[];
      settings?: unknown;
      accentColor?: unknown;
    };
    const favorites = Array.isArray(parsed.favorites) ? parsed.favorites : null;
    if (!favorites) {
      return {
        ok: false,
        error: 'Invalid settings file (missing favorites array).',
        matched: 0,
        missing: 0,
        total: 0,
        playlistsImported: 0,
      };
    }

    const db = getDb();
    const mark = db.prepare('UPDATE songs SET is_favorite = 1 WHERE id = ?');
    let matched = 0;

    const importFavs = db.transaction((items: unknown[]) => {
      for (const item of items) {
        const entry = asSongRef(item);
        if (!entry) continue;
        const id = findSongId(entry);
        if (id == null) continue;
        mark.run(id);
        matched += 1;
      }
    });
    importFavs(favorites);

    let playlistsImported = 0;
    const playlistEntries = Array.isArray(parsed.playlists)
      ? parsed.playlists
      : [];

    for (const rawPlaylist of playlistEntries) {
      if (!rawPlaylist || typeof rawPlaylist !== 'object') continue;
      const pl = rawPlaylist as {
        name?: unknown;
        icon?: unknown;
        iconColor?: unknown;
        iconImage?: unknown;
        songs?: unknown;
      };
      const name = String(pl.name ?? '').trim() || 'Imported playlist';
      const iconColor =
        String(pl.iconColor ?? DEFAULT_PLAYLIST_ICON_COLOR).trim() ||
        DEFAULT_PLAYLIST_ICON_COLOR;
      let icon = normalizePlaylistIcon(String(pl.icon ?? DEFAULT_PLAYLIST_ICON));
      if (typeof pl.iconImage === 'string' && pl.iconImage.startsWith('data:')) {
        const imported = importPlaylistIconFromDataUrl(pl.iconImage);
        if (imported) icon = imported;
      } else if (isCustomPlaylistIcon(icon)) {
        // Local img: refs are not portable without iconImage.
        icon = DEFAULT_PLAYLIST_ICON;
      }
      const songs = Array.isArray(pl.songs) ? pl.songs : [];

      const existing = listPlaylists().find(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );
      const playlist =
        existing ?? createPlaylist(name, { icon, iconColor });
      if (existing) {
        updatePlaylistIcon(playlist.id, icon, iconColor);
      }

      let addedAtLeastOne = false;
      for (const song of songs) {
        const entry = asSongRef(song);
        if (!entry) continue;
        const songId = findSongId(entry);
        if (songId == null) continue;
        const resultAdd = addSongToPlaylist(playlist.id, songId);
        if (resultAdd.ok) addedAtLeastOne = true;
      }
      if (addedAtLeastOne || !existing) playlistsImported += 1;
    }

    let accentColor: string | undefined;
    const settingsBlock =
      parsed.settings && typeof parsed.settings === 'object'
        ? (parsed.settings as { accentColor?: unknown })
        : null;
    const rawAccent =
      (settingsBlock?.accentColor != null
        ? String(settingsBlock.accentColor)
        : null) ??
      (parsed.accentColor != null ? String(parsed.accentColor) : null);
    if (rawAccent) {
      const normalized = normalizeHex(rawAccent);
      if (normalized) {
        saveSettings({ accentColor: normalized });
        accentColor = normalized;
      }
    }

    return {
      ok: true,
      matched,
      missing: 0,
      total: matched,
      playlistsImported,
      accentColor,
    };
  } catch (err) {
    return {
      ok: false,
      matched: 0,
      missing: 0,
      total: 0,
      playlistsImported: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
