import fs from 'node:fs';
import path from 'node:path';
import {
  INDEX_USER_VERSION,
  checkpointWalPassive,
  getIndexUserVersion,
  isSqliteCorruptError,
  setIndexUserVersion,
} from '../db/connection';
import {
  getSongMtime,
  removeSongByPath,
  removeSongsNotIn,
  upsertSong,
} from '../db/songsRepo';
import { parseChartFile } from './parseChart';
import { parseMidFile } from './parseMid';
import { parseSongIni } from './parseSongIni';
import {
  folderHasLyricFile,
  folderHasSongAudio,
  folderHasVideo,
  songFolderMtime,
} from './mediaFlags';
import { clearSkipLog, getSkipCount, persistSkipLog, recordSkip } from './skipLog';

function hasSongIni(dir: string): boolean {
  return fs.existsSync(path.join(dir, 'song.ini'));
}

function hasNotesFile(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, 'notes.chart')) ||
    fs.existsSync(path.join(dir, 'notes.mid'))
  );
}

function isSongFolder(dir: string): boolean {
  return hasSongIni(dir) && hasNotesFile(dir);
}

/** Folder looks like a song attempt but is incomplete. */
function nearMissReason(dir: string): string | null {
  const ini = hasSongIni(dir);
  const notes = hasNotesFile(dir);
  if (ini && !notes) {
    return 'Has song.ini but missing notes.chart / notes.mid';
  }
  if (!ini && notes) {
    return 'Has notes.chart/notes.mid but missing song.ini';
  }
  return null;
}

const SKIP_DIR_NAMES = new Set([
  '.git',
  '.svn',
  '.hg',
  'node_modules',
  '__macosx',
]);

function shouldSkipDirectory(name: string): boolean {
  return SKIP_DIR_NAMES.has(name.toLowerCase());
}

function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

export async function findSongFolders(
  root: string,
  shouldCancel?: () => boolean,
): Promise<string[]> {
  const results: string[] = [];
  if (!root || !fs.existsSync(root)) return results;

  const stack = [root];
  let steps = 0;
  while (stack.length) {
    if (shouldCancel?.()) return results;
    const current = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      if (current !== root) {
        recordSkip(
          current,
          `Cannot read folder: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      continue;
    }

    if (isSongFolder(current)) {
      results.push(current);
    } else {
      const miss = nearMissReason(current);
      if (miss) {
        // Incomplete song folder — log and do not recurse into it
        recordSkip(current, miss);
      } else {
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          // Keep folders like ".1 ReptarRexU" — only skip known junk dirs
          if (shouldSkipDirectory(entry.name)) continue;
          stack.push(path.join(current, entry.name));
        }
      }
    }

    steps += 1;
    if (steps % 40 === 0) await yieldEventLoop();
  }

  return results;
}

export type IndexOutcome = 'indexed' | 'unchanged' | 'skipped';

export function indexSongFolder(
  folderPath: string,
  force = false,
): IndexOutcome {
  const iniPath = path.join(folderPath, 'song.ini');
  const chartPath = path.join(folderPath, 'notes.chart');
  const midPath = path.join(folderPath, 'notes.mid');
  const hasIni = fs.existsSync(iniPath);
  const notesPath = fs.existsSync(chartPath)
    ? chartPath
    : fs.existsSync(midPath)
      ? midPath
      : null;

  if (!hasIni && !notesPath) {
    removeSongByPath(folderPath);
    return 'skipped';
  }
  if (!hasIni) {
    removeSongByPath(folderPath);
    recordSkip(folderPath, 'Has notes.chart/notes.mid but missing song.ini');
    return 'skipped';
  }
  if (!notesPath) {
    removeSongByPath(folderPath);
    recordSkip(folderPath, 'Has song.ini but missing notes.chart / notes.mid');
    return 'skipped';
  }

  const mtimeMs = songFolderMtime(folderPath, [iniPath, notesPath]);
  const prev = getSongMtime(folderPath);
  if (!force && prev != null && prev === mtimeMs) {
    return 'unchanged';
  }

  try {
    const meta = parseSongIni(iniPath);
    const notesFormat = notesPath.endsWith('.chart') ? 'chart' : 'mid';
    const parsed =
      notesFormat === 'chart'
        ? parseChartFile(notesPath)
        : parseMidFile(notesPath);

    const hasLyrics = folderHasLyricFile(folderPath) || parsed.hasLyrics;
    const hasVideo = folderHasVideo(folderPath, meta.videoPath);
    const hasAudio = folderHasSongAudio(folderPath);
    const chartPreview =
      notesFormat === 'chart' && 'previewStartMs' in parsed
        ? parsed.previewStartMs
        : null;
    const previewStartMs = meta.previewStartMs ?? chartPreview ?? null;
    const name = meta.name || path.basename(folderPath) || 'Unknown Song';

    upsertSong({
      folderPath,
      name,
      artist: meta.artist || 'Unknown Artist',
      album: meta.album,
      charter: meta.charter,
      genre: meta.genre,
      year: meta.year,
      lengthMs: meta.lengthMs,
      previewStartMs,
      hasLyrics,
      hasVideo,
      hasAudio,
      notesFormat,
      mtimeMs,
      instruments: parsed.instruments,
    });

    return 'indexed';
  } catch (err) {
    // Let SQLITE_CORRUPT bubble so the library layer can wipe/reopen + rescan.
    if (isSqliteCorruptError(err)) throw err;
    recordSkip(
      folderPath,
      `Failed to parse/index: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 'skipped';
  }
}

export async function fullScan(
  root: string,
  options?: {
    shouldCancel?: () => boolean;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<{ indexed: number; removed: number; skipped: number }> {
  clearSkipLog();

  const folders = await findSongFolders(root, options?.shouldCancel);
  if (options?.shouldCancel?.()) {
    return { indexed: 0, removed: 0, skipped: 0 };
  }

  // One-shot force when metadata parsing rules change (e.g. colored titles)
  const forceAll = getIndexUserVersion() < INDEX_USER_VERSION;

  const pathSet = new Set(folders);
  const total = folders.length;
  let indexed = 0;

  options?.onProgress?.(0, total);

  for (let i = 0; i < folders.length; i += 1) {
    if (options?.shouldCancel?.()) {
      persistSkipLog();
      return { indexed, removed: 0, skipped: 0 };
    }
    const outcome = indexSongFolder(folders[i], forceAll);
    if (outcome === 'indexed') indexed += 1;
    // Keep WAL from growing unbounded across large libraries / unclean kills.
    if (indexed > 0 && indexed % 200 === 0 && outcome === 'indexed') {
      checkpointWalPassive();
    }
    if (i % 6 === 0 || i === folders.length - 1) {
      options?.onProgress?.(i + 1, total);
      await yieldEventLoop();
    }
  }

  const removed = removeSongsNotIn(pathSet);
  options?.onProgress?.(total, total);
  persistSkipLog();
  checkpointWalPassive();
  if (!options?.shouldCancel?.()) {
    setIndexUserVersion(INDEX_USER_VERSION);
  }
  return { indexed, removed, skipped: getSkipCount() };
}
