export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS songs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  artist TEXT NOT NULL DEFAULT '',
  album TEXT NOT NULL DEFAULT '',
  charter TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  length_ms INTEGER,
  preview_start_ms INTEGER,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  has_lyrics INTEGER NOT NULL DEFAULT 0,
  has_video INTEGER NOT NULL DEFAULT 0,
  has_audio INTEGER NOT NULL DEFAULT 0,
  notes_format TEXT,
  mtime_ms INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS song_instruments (
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  has_easy INTEGER NOT NULL DEFAULT 0,
  has_medium INTEGER NOT NULL DEFAULT 0,
  has_hard INTEGER NOT NULL DEFAULT 0,
  has_expert INTEGER NOT NULL DEFAULT 0,
  expert_only INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (song_id, instrument)
);

CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_charter ON songs(charter);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs(genre);
CREATE INDEX IF NOT EXISTS idx_songs_year ON songs(year);
CREATE INDEX IF NOT EXISTS idx_songs_favorite ON songs(is_favorite);
CREATE INDEX IF NOT EXISTS idx_songs_name ON songs(name);

CREATE TABLE IF NOT EXISTS playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🎵',
  icon_color TEXT NOT NULL DEFAULT '#3ecf8e',
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (playlist_id, song_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_songs_order
  ON playlist_songs(playlist_id, position);
`;
