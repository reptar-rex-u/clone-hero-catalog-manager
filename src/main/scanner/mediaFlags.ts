import fs from 'node:fs';
import path from 'node:path';

const VIDEO_NAMES = [
  'video.mp4',
  'video.webm',
  'video.avi',
  'video.ogv',
  'video.mpeg',
  'video.mpg',
  'video.mkv',
  'video.mov',
];

const LYRIC_FILES = ['lyrics.txt', 'lyrics.lrc', 'song.lyrics'];

export function folderHasVideo(folderPath: string, iniVideoPath: string | null): boolean {
  if (iniVideoPath) {
    const resolved = path.isAbsolute(iniVideoPath)
      ? iniVideoPath
      : path.join(folderPath, iniVideoPath);
    if (fs.existsSync(resolved)) return true;
  }

  try {
    const entries = fs.readdirSync(folderPath);
    const lower = new Set(entries.map((e) => e.toLowerCase()));
    if (VIDEO_NAMES.some((name) => lower.has(name))) return true;
    return entries.some((e) => /^video\./i.test(e));
  } catch {
    return false;
  }
}

export function folderHasLyricFile(folderPath: string): boolean {
  try {
    const entries = fs.readdirSync(folderPath);
    const lower = new Set(entries.map((e) => e.toLowerCase()));
    return LYRIC_FILES.some((name) => lower.has(name));
  } catch {
    return false;
  }
}

const ART_BASENAMES = new Set([
  'album.png',
  'album.jpg',
  'album.jpeg',
  'album.webp',
  'cover.png',
  'cover.jpg',
  'cover.jpeg',
  'folder.jpg',
  'folder.png',
]);

export function resolveArtworkPath(folderPath: string): string | null {
  try {
    const entries = fs.readdirSync(folderPath);
    // Prefer album.* in common order, case-insensitive
    for (const preferred of ART_BASENAMES) {
      const hit = entries.find((e) => e.toLowerCase() === preferred);
      if (hit) return path.join(folderPath, hit);
    }
  } catch {
    // ignore
  }
  return null;
}

/** Preferred audio extensions (Chromium-playable first). */
const SONG_AUDIO_EXTS = [
  '.ogg',
  '.mp3',
  '.wav',
  '.opus',
  '.flac',
  '.m4a',
  '.aac',
  '.oga',
];

/**
 * Basenames Clone Hero uses for audio. Prefer full mix `song`, then common
 * stems (many charts ship only `guitar.opus` / `guitar.ogg`).
 */
const AUDIO_BASENAMES = [
  'song',
  'guitar',
  'rhythm',
  'bass',
  'drums',
  'keys',
  'vocals',
  'guitarcoop',
  'coopguitar',
];

/**
 * Resolve chart audio for preview: `song.*`, then stem fallbacks like `guitar.*`.
 */
export function resolveSongAudioPath(folderPath: string): string | null {
  try {
    const entries = fs.readdirSync(folderPath);
    const byLower = new Map(entries.map((e) => [e.toLowerCase(), e]));
    for (const base of AUDIO_BASENAMES) {
      for (const ext of SONG_AUDIO_EXTS) {
        const hit = byLower.get(`${base}${ext}`);
        if (hit) return path.join(folderPath, hit);
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function folderHasSongAudio(folderPath: string): boolean {
  return resolveSongAudioPath(folderPath) != null;
}

export function songFolderMtime(folderPath: string, watchFiles: string[]): number {
  let max = 0;
  for (const file of watchFiles) {
    try {
      const st = fs.statSync(file);
      if (st.mtimeMs > max) max = st.mtimeMs;
    } catch {
      // ignore missing
    }
  }
  try {
    const st = fs.statSync(folderPath);
    if (st.mtimeMs > max) max = st.mtimeMs;
  } catch {
    // ignore
  }
  return max;
}
