import fs from 'node:fs';
import { stripRichText } from './stripRichText';

export interface SongIniMeta {
  name: string;
  artist: string;
  album: string;
  charter: string;
  genre: string;
  year: string;
  lengthMs: number | null;
  /** Clone Hero preview start in milliseconds (null = start of song). */
  previewStartMs: number | null;
  videoPath: string | null;
}

/**
 * Parse song.ini without the npm `ini` package — that package treats `#` as an
 * inline comment, which destroys Clone Hero colored titles like:
 *   name = <color=#FF4FA3>Title</color>
 */
function parseSongIniMap(text: string): Record<string, string> {
  const root: Record<string, string> = {};
  const song: Record<string, string> = {};
  let section = '';

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) {
      continue;
    }

    const sectionMatch = trimmed.match(/^\[([^\]]+)]\s*$/);
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      continue;
    }

    const eq = rawLine.indexOf('=');
    if (eq === -1) continue;

    const key = rawLine.slice(0, eq).trim().toLowerCase();
    if (!key) continue;

    let value = rawLine.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (section === 'song') {
      if (!(key in song)) song[key] = value;
    } else if (!section) {
      if (!(key in root)) root[key] = value;
    }
  }

  return Object.keys(song).length ? song : root;
}

function pick(map: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const v = map[key.toLowerCase()];
    if (v?.trim()) return v.trim();
  }
  return '';
}

function pickPlain(map: Record<string, string>, keys: string[]): string {
  return stripRichText(pick(map, keys));
}

function parseLengthMs(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1000) return Math.round(n * 1000);
  return Math.round(n);
}

/** CH `preview_start_time` is milliseconds; ignore missing/negative. */
function parsePreviewStartMs(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function parseSongIni(filePath: string): SongIniMeta {
  let buf = fs.readFileSync(filePath);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.subarray(3);
  }

  const map = parseSongIniMap(buf.toString('utf8'));
  const lengthRaw = pick(map, ['song_length', 'songlength', 'length']);
  const previewRaw = pick(map, [
    'preview_start_time',
    'preview_start',
    'previewstart',
  ]);
  const video = pick(map, ['video', 'video_file']);

  return {
    name: pickPlain(map, ['name', 'title']),
    artist: pickPlain(map, ['artist']),
    album: pickPlain(map, ['album']),
    charter: pickPlain(map, ['charter', 'frets', 'charted_by']),
    genre: pickPlain(map, ['genre']),
    year: pick(map, ['year']),
    lengthMs: parseLengthMs(lengthRaw),
    previewStartMs: parsePreviewStartMs(previewRaw),
    videoPath: video || null,
  };
}
