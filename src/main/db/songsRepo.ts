import type {
  FilterOptions,
  InstrumentInfo,
  InstrumentName,
  SongDetail,
  SongListItem,
  SongSearchParams,
  SongSearchResult,
} from '../../shared/types';
import {
  decadeOption,
  decadeStartFromYear,
  parseSongYear,
} from '../../shared/decades';
import {
  normalizeSearchText,
  sqlNormalizeSearchCol,
} from '../../shared/searchNormalize';
import { getDb } from './connection';

export interface SongUpsertInput {
  folderPath: string;
  name: string;
  artist: string;
  album: string;
  charter: string;
  genre: string;
  year: string;
  lengthMs: number | null;
  previewStartMs: number | null;
  hasLyrics: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  notesFormat: string | null;
  mtimeMs: number;
  instruments: InstrumentInfo[];
}

function mapInstrumentRow(row: Record<string, unknown>): InstrumentInfo {
  return {
    instrument: String(row.instrument) as InstrumentName,
    difficulties: {
      easy: Boolean(row.has_easy),
      medium: Boolean(row.has_medium),
      hard: Boolean(row.has_hard),
      expert: Boolean(row.has_expert),
    },
    expertOnly: Boolean(row.expert_only),
  };
}

function mapSongRow(
  row: Record<string, unknown>,
  instruments: InstrumentInfo[] = [],
): SongListItem {
  return {
    id: Number(row.id),
    folderPath: String(row.folder_path),
    name: String(row.name ?? ''),
    artist: String(row.artist ?? ''),
    album: String(row.album ?? ''),
    charter: String(row.charter ?? ''),
    genre: String(row.genre ?? ''),
    year: String(row.year ?? ''),
    lengthMs: row.length_ms == null ? null : Number(row.length_ms),
    previewStartMs:
      row.preview_start_ms == null ? null : Number(row.preview_start_ms),
    isFavorite: Boolean(row.is_favorite),
    hasLyrics: Boolean(row.has_lyrics),
    hasVideo: Boolean(row.has_video),
    hasAudio: Boolean(row.has_audio),
    instruments,
  };
}

function loadInstrumentsForIds(ids: number[]): Map<number, InstrumentInfo[]> {
  const map = new Map<number, InstrumentInfo[]>();
  if (ids.length === 0) return map;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT * FROM song_instruments
       WHERE song_id IN (${placeholders})
       ORDER BY song_id, instrument`,
    )
    .all(...ids) as Array<Record<string, unknown>>;

  for (const row of rows) {
    const songId = Number(row.song_id);
    const list = map.get(songId) ?? [];
    list.push(mapInstrumentRow(row));
    map.set(songId, list);
  }
  return map;
}

function withInstruments(rows: Array<Record<string, unknown>>): SongListItem[] {
  const ids = rows.map((r) => Number(r.id));
  const byId = loadInstrumentsForIds(ids);
  return rows.map((row) => mapSongRow(row, byId.get(Number(row.id)) ?? []));
}

export function upsertSong(input: SongUpsertInput): number {
  const db = getDb();
  const now = Date.now();

  const existing = db
    .prepare('SELECT id, is_favorite FROM songs WHERE folder_path = ?')
    .get(input.folderPath) as { id: number; is_favorite: number } | undefined;

  let songId: number;
  if (existing) {
    db.prepare(
      `UPDATE songs SET
        name = ?, artist = ?, album = ?, charter = ?, genre = ?, year = ?,
        length_ms = ?, preview_start_ms = ?, has_lyrics = ?, has_video = ?,
        has_audio = ?, notes_format = ?, mtime_ms = ?, updated_at = ?
      WHERE id = ?`,
    ).run(
      input.name,
      input.artist,
      input.album,
      input.charter,
      input.genre,
      input.year,
      input.lengthMs,
      input.previewStartMs,
      input.hasLyrics ? 1 : 0,
      input.hasVideo ? 1 : 0,
      input.hasAudio ? 1 : 0,
      input.notesFormat,
      input.mtimeMs,
      now,
      existing.id,
    );
    songId = existing.id;
    db.prepare('DELETE FROM song_instruments WHERE song_id = ?').run(songId);
  } else {
    const result = db
      .prepare(
        `INSERT INTO songs (
          folder_path, name, artist, album, charter, genre, year,
          length_ms, preview_start_ms, has_lyrics, has_video, has_audio,
          notes_format, mtime_ms, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.folderPath,
        input.name,
        input.artist,
        input.album,
        input.charter,
        input.genre,
        input.year,
        input.lengthMs,
        input.previewStartMs,
        input.hasLyrics ? 1 : 0,
        input.hasVideo ? 1 : 0,
        input.hasAudio ? 1 : 0,
        input.notesFormat,
        input.mtimeMs,
        now,
      );
    songId = Number(result.lastInsertRowid);
  }

  const insertInst = db.prepare(
    `INSERT INTO song_instruments (
      song_id, instrument, has_easy, has_medium, has_hard, has_expert, expert_only
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction((instruments: InstrumentInfo[]) => {
    for (const inst of instruments) {
      insertInst.run(
        songId,
        inst.instrument,
        inst.difficulties.easy ? 1 : 0,
        inst.difficulties.medium ? 1 : 0,
        inst.difficulties.hard ? 1 : 0,
        inst.difficulties.expert ? 1 : 0,
        inst.expertOnly ? 1 : 0,
      );
    }
  });
  tx(input.instruments);

  return songId;
}

export function removeSongByPath(folderPath: string): void {
  getDb().prepare('DELETE FROM songs WHERE folder_path = ?').run(folderPath);
}

export function removeSongsNotIn(paths: Set<string>): number {
  const db = getDb();
  const rows = db.prepare('SELECT id, folder_path FROM songs').all() as Array<{
    id: number;
    folder_path: string;
  }>;
  const del = db.prepare('DELETE FROM songs WHERE id = ?');
  let removed = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      if (!paths.has(row.folder_path)) {
        del.run(row.id);
        removed += 1;
      }
    }
  });
  tx();
  return removed;
}

export function getSongMtime(folderPath: string): number | null {
  const row = getDb()
    .prepare('SELECT mtime_ms FROM songs WHERE folder_path = ?')
    .get(folderPath) as { mtime_ms: number } | undefined;
  return row ? row.mtime_ms : null;
}

export function searchSongs(params: SongSearchParams): SongSearchResult {
  const db = getDb();
  const offset = params.offset ?? 0;
  const limit = Math.min(params.limit ?? 100, 10000);
  const where: string[] = [];
  const values: unknown[] = [];

  if (params.favoritesOnly) {
    where.push('is_favorite = 1');
  }
  if (params.genre) {
    where.push('genre = ?');
    values.push(params.genre);
  }
  if (params.charter) {
    where.push('charter = ?');
    values.push(params.charter);
  }
  if (params.decade) {
    const start = Number(params.decade);
    if (Number.isFinite(start) && start >= 1900 && start <= 2090) {
      const end = start + 9;
      const twoDigits = Array.from({ length: 10 }, (_, i) =>
        String((start + i) % 100).padStart(2, '0'),
      );
      where.push(`(
        (CAST(year AS INTEGER) BETWEEN ? AND ? AND CAST(year AS INTEGER) BETWEEN 1900 AND 2099)
        OR year GLOB ?
        OR trim(year) IN (${twoDigits.map(() => '?').join(', ')})
      )`);
      values.push(start, end, `${start}[0-9]*`, ...twoDigits);
    }
  }
  if (params.instrument) {
    where.push(
      `id IN (SELECT song_id FROM song_instruments WHERE instrument = ?)`,
    );
    values.push(params.instrument);
  }
  if (params.query?.trim()) {
    const q = `%${normalizeSearchText(params.query)}%`;
    const name = sqlNormalizeSearchCol('name');
    const artist = sqlNormalizeSearchCol('artist');
    const album = sqlNormalizeSearchCol('album');
    const charter = sqlNormalizeSearchCol('charter');
    where.push(
      `(${name} LIKE ? OR ${artist} LIKE ? OR ${album} LIKE ? OR ${charter} LIKE ?)`,
    );
    values.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM songs ${whereSql}`).get(...values) as {
      c: number;
    }
  ).c;

  const rows = db
    .prepare(
      `SELECT * FROM songs ${whereSql}
       ORDER BY artist COLLATE NOCASE, name COLLATE NOCASE
       LIMIT ? OFFSET ?`,
    )
    .all(...values, limit, offset) as Array<Record<string, unknown>>;

  return { items: withInstruments(rows), total };
}

export function getSongById(id: number): SongListItem | null {
  const row = getDb()
    .prepare('SELECT * FROM songs WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return withInstruments([row])[0] ?? null;
}

export function getSongDetail(id: number): SongDetail | null {
  const song = getSongById(id);
  if (!song) return null;
  return {
    ...song,
    artworkUrl: null,
  };
}

export function toggleFavorite(id: number): boolean | null {
  const db = getDb();
  const row = db
    .prepare('SELECT is_favorite FROM songs WHERE id = ?')
    .get(id) as { is_favorite: number } | undefined;
  if (!row) return null;
  const next = row.is_favorite ? 0 : 1;
  db.prepare('UPDATE songs SET is_favorite = ? WHERE id = ?').run(next, id);
  return Boolean(next);
}

export function getFilterOptions(): FilterOptions {
  const db = getDb();
  const pick = (column: string): string[] =>
    (
      db
        .prepare(
          `SELECT DISTINCT ${column} AS v FROM songs
           WHERE ${column} IS NOT NULL AND trim(${column}) != ''
           ORDER BY ${column} COLLATE NOCASE`,
        )
        .all() as Array<{ v: string }>
    ).map((r) => r.v);

  const yearRows = db
    .prepare(
      `SELECT DISTINCT year AS v FROM songs
       WHERE year IS NOT NULL AND trim(year) != ''`,
    )
    .all() as Array<{ v: string }>;

  const decadeStarts = new Set<number>();
  for (const row of yearRows) {
    const y = parseSongYear(row.v);
    if (y != null && y >= 1900 && y <= 2099) {
      decadeStarts.add(decadeStartFromYear(y));
    }
  }

  return {
    decades: [...decadeStarts]
      .sort((a, b) => a - b)
      .map((start) => decadeOption(start)),
    genres: pick('genre'),
    charters: pick('charter'),
  };
}

export function getSongCount(): number {
  return (getDb().prepare('SELECT COUNT(*) AS c FROM songs').get() as { c: number }).c;
}
