import {
  DEFAULT_PLAYLIST_ICON,
  DEFAULT_PLAYLIST_ICON_COLOR,
  isCustomPlaylistIcon,
  normalizePlaylistIcon,
} from '../../shared/playlistIcons';
import type { SongListItem } from '../../shared/types';
import { deletePlaylistIconFile } from '../playlistIconsStore';
import { getDb } from './connection';
import { getSongById } from './songsRepo';

export interface PlaylistSummary {
  id: number;
  name: string;
  icon: string;
  iconColor: string;
  songCount: number;
}

let schemaReady = false;

function now(): number {
  return Date.now();
}

/** Add icon columns for DBs created before playlist icons existed. */
export function ensurePlaylistSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  const cols = db.prepare('PRAGMA table_info(playlists)').all() as Array<{
    name: string;
  }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('icon')) {
    db.exec(
      `ALTER TABLE playlists ADD COLUMN icon TEXT NOT NULL DEFAULT '${DEFAULT_PLAYLIST_ICON}'`,
    );
  }
  if (!names.has('icon_color')) {
    db.exec(
      `ALTER TABLE playlists ADD COLUMN icon_color TEXT NOT NULL DEFAULT '${DEFAULT_PLAYLIST_ICON_COLOR}'`,
    );
  }
  schemaReady = true;
}

function mapSummary(row: {
  id: number;
  name: string;
  icon: string;
  icon_color: string;
  song_count: number;
}): PlaylistSummary {
  return {
    id: row.id,
    name: row.name,
    icon: normalizePlaylistIcon(row.icon),
    iconColor: row.icon_color || DEFAULT_PLAYLIST_ICON_COLOR,
    songCount: row.song_count,
  };
}

export function listPlaylists(): PlaylistSummary[] {
  ensurePlaylistSchema();
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.name, p.icon, p.icon_color,
              (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS song_count
       FROM playlists p
       ORDER BY p.name COLLATE NOCASE`,
    )
    .all() as Array<{
    id: number;
    name: string;
    icon: string;
    icon_color: string;
    song_count: number;
  }>;

  return rows.map(mapSummary);
}

export function getPlaylistSongs(playlistId: number): SongListItem[] {
  ensurePlaylistSchema();
  const rows = getDb()
    .prepare(
      `SELECT song_id FROM playlist_songs
       WHERE playlist_id = ?
       ORDER BY position ASC, song_id ASC`,
    )
    .all(playlistId) as Array<{ song_id: number }>;

  const songs: SongListItem[] = [];
  for (const row of rows) {
    const song = getSongById(row.song_id);
    if (song) songs.push(song);
  }
  return songs;
}

export function getPlaylist(playlistId: number): {
  id: number;
  name: string;
  icon: string;
  iconColor: string;
  songs: SongListItem[];
} | null {
  ensurePlaylistSchema();
  const row = getDb()
    .prepare(
      'SELECT id, name, icon, icon_color FROM playlists WHERE id = ?',
    )
    .get(playlistId) as
    | { id: number; name: string; icon: string; icon_color: string }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    icon: normalizePlaylistIcon(row.icon),
    iconColor: row.icon_color || DEFAULT_PLAYLIST_ICON_COLOR,
    songs: getPlaylistSongs(playlistId),
  };
}

export function createPlaylist(
  name: string,
  options?: { icon?: string; iconColor?: string },
): PlaylistSummary {
  ensurePlaylistSchema();
  const trimmed = name.trim() || 'New playlist';
  const icon = normalizePlaylistIcon(options?.icon);
  const iconColor =
    options?.iconColor?.trim() || DEFAULT_PLAYLIST_ICON_COLOR;
  const ts = now();
  const result = getDb()
    .prepare(
      `INSERT INTO playlists (name, icon, icon_color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(trimmed, icon, iconColor, ts, ts);
  return {
    id: Number(result.lastInsertRowid),
    name: trimmed,
    icon,
    iconColor,
    songCount: 0,
  };
}

export function renamePlaylist(id: number, name: string): boolean {
  ensurePlaylistSchema();
  const trimmed = name.trim();
  if (!trimmed) return false;
  const result = getDb()
    .prepare(
      'UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?',
    )
    .run(trimmed, now(), id);
  return result.changes > 0;
}

export function updatePlaylistIcon(
  id: number,
  icon: string,
  iconColor: string,
): boolean {
  ensurePlaylistSchema();
  const nextIcon = normalizePlaylistIcon(icon);
  const nextColor = iconColor.trim() || DEFAULT_PLAYLIST_ICON_COLOR;
  const prev = getDb()
    .prepare('SELECT icon FROM playlists WHERE id = ?')
    .get(id) as { icon: string } | undefined;
  const result = getDb()
    .prepare(
      'UPDATE playlists SET icon = ?, icon_color = ?, updated_at = ? WHERE id = ?',
    )
    .run(nextIcon, nextColor, now(), id);
  if (
    result.changes > 0 &&
    prev &&
    isCustomPlaylistIcon(prev.icon) &&
    prev.icon !== nextIcon
  ) {
    deletePlaylistIconFile(prev.icon);
  }
  return result.changes > 0;
}

export function deletePlaylist(id: number): boolean {
  ensurePlaylistSchema();
  const prev = getDb()
    .prepare('SELECT icon FROM playlists WHERE id = ?')
    .get(id) as { icon: string } | undefined;
  const result = getDb().prepare('DELETE FROM playlists WHERE id = ?').run(id);
  if (result.changes > 0 && prev && isCustomPlaylistIcon(prev.icon)) {
    deletePlaylistIconFile(prev.icon);
  }
  return result.changes > 0;
}

export function addSongToPlaylist(
  playlistId: number,
  songId: number,
): { ok: boolean; alreadyInPlaylist?: boolean } {
  ensurePlaylistSchema();
  const db = getDb();
  const playlist = db
    .prepare('SELECT id FROM playlists WHERE id = ?')
    .get(playlistId) as { id: number } | undefined;
  if (!playlist) return { ok: false };

  const song = db
    .prepare('SELECT id FROM songs WHERE id = ?')
    .get(songId) as { id: number } | undefined;
  if (!song) return { ok: false };

  const existing = db
    .prepare(
      'SELECT 1 AS x FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
    )
    .get(playlistId, songId) as { x: number } | undefined;
  if (existing) return { ok: true, alreadyInPlaylist: true };

  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS m FROM playlist_songs WHERE playlist_id = ?',
    )
    .get(playlistId) as { m: number };

  db.prepare(
    'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)',
  ).run(playlistId, songId, maxPos.m + 1);
  db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(
    now(),
    playlistId,
  );
  return { ok: true, alreadyInPlaylist: false };
}

export function removeSongFromPlaylist(
  playlistId: number,
  songId: number,
): boolean {
  ensurePlaylistSchema();
  const db = getDb();
  const result = db
    .prepare(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
    )
    .run(playlistId, songId);
  if (result.changes > 0) {
    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(
      now(),
      playlistId,
    );
  }
  return result.changes > 0;
}

export function listPlaylistsForExport(): Array<{
  name: string;
  icon: string;
  iconColor: string;
  songs: Array<{
    folderPath: string;
    name: string;
    artist: string;
    album: string;
    charter: string;
  }>;
}> {
  const playlists = listPlaylists();
  const db = getDb();
  return playlists.map((p) => {
    const songs = db
      .prepare(
        `SELECT s.folder_path, s.name, s.artist, s.album, s.charter
         FROM playlist_songs ps
         JOIN songs s ON s.id = ps.song_id
         WHERE ps.playlist_id = ?
         ORDER BY ps.position ASC, s.name COLLATE NOCASE`,
      )
      .all(p.id) as Array<{
      folder_path: string;
      name: string;
      artist: string;
      album: string;
      charter: string;
    }>;
    return {
      name: p.name,
      icon: p.icon,
      iconColor: p.iconColor,
      songs: songs.map((s) => ({
        folderPath: s.folder_path,
        name: s.name ?? '',
        artist: s.artist ?? '',
        album: s.album ?? '',
        charter: s.charter ?? '',
      })),
    };
  });
}
