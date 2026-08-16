import fs from 'node:fs';
import path from 'node:path';
import type { LibraryStatus } from '../../shared/types';
import { recoverFromCorrupt } from '../db/connection';
import { getSongCount, removeSongByPath } from '../db/songsRepo';
import { fullScan, indexSongFolder } from './scanLibrary';
import { getSkipCount, recordSkip } from './skipLog';

type StatusListener = (status: LibraryStatus) => void;

let watcher: fs.FSWatcher | null = null;
let watchedPath: string | null = null;
let scanning = false;
let scanned = 0;
let scanTotal = 0;
let skippedCount = 0;
let lastError: string | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let scanToken = 0;
let scanInFlight: Promise<void> | null = null;
const pending = new Set<string>();
const listeners = new Set<StatusListener>();

function emit(): void {
  const status = getLibraryStatus();
  for (const listener of listeners) listener(status);
}

export function getLibraryStatus(): LibraryStatus {
  let songCount = 0;
  try {
    songCount = getSongCount();
  } catch (err) {
    if (recoverFromCorrupt(err)) {
      songCount = 0;
      lastError =
        'Catalog database was corrupt and was reset. Rescan required.';
    } else {
      throw err;
    }
  }
  return {
    scanning,
    watchedPath,
    songCount,
    scanned,
    scanTotal,
    skippedCount,
    lastError,
  };
}

export function onLibraryStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function songDirFromEvent(filePath: string): string {
  const base = path.basename(filePath).toLowerCase();
  if (
    base === 'song.ini' ||
    base === 'notes.chart' ||
    base === 'notes.mid' ||
    base.startsWith('album.') ||
    base.startsWith('video.') ||
    base.startsWith('lyrics.')
  ) {
    return path.dirname(filePath);
  }
  return filePath;
}

function shouldIgnoreWatchPath(filePath: string): boolean {
  const parts = filePath.split(/[/\\]/);
  return parts.some((part) => {
    const base = part.toLowerCase();
    return (
      base === '.git' ||
      base === '.svn' ||
      base === '.hg' ||
      base === 'node_modules' ||
      base === '__macosx'
    );
  });
}

async function flushPending(): Promise<void> {
  const folders = [...pending];
  pending.clear();
  for (let i = 0; i < folders.length; i += 1) {
    try {
      const outcome = indexSongFolder(folders[i], true);
      if (outcome === 'skipped') {
        skippedCount = getSkipCount();
      }
    } catch (err) {
      if (recoverFromCorrupt(err)) {
        lastError =
          'Catalog database was corrupt and was reset; starting a full rescan.';
        emit();
        if (watchedPath) {
          void rescanLibrary(watchedPath);
        }
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      lastError = message;
      recordSkip(folders[i], `Watcher index error: ${message}`);
      skippedCount = getSkipCount();
    }
    if (i % 4 === 0) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
  emit();
}

function queueFolder(folder: string): void {
  pending.add(folder);
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void flushPending();
  }, 400);
}

function closeWatcher(): void {
  if (!watcher) return;
  try {
    watcher.close();
  } catch {
    // ignore
  }
  watcher = null;
}

/**
 * Native recursive fs.watch (one OS handle on Windows) — avoids chokidar
 * attaching thousands of per-folder watchers that freeze the UI.
 */
function ensureWatcher(songsDirectory: string): void {
  closeWatcher();

  try {
    watcher = fs.watch(
      songsDirectory,
      { recursive: true },
      (_eventType, filename) => {
        if (!filename) return;
        const full = path.join(songsDirectory, filename);
        if (shouldIgnoreWatchPath(full)) return;

        const folder = songDirFromEvent(full);
        if (path.basename(full).toLowerCase() === 'song.ini' && _eventType === 'rename') {
          // unlink of song.ini — try remove when folder no longer has ini
          if (!fs.existsSync(path.join(folder, 'song.ini'))) {
            removeSongByPath(folder);
            emit();
            return;
          }
        }
        queueFolder(folder);
      },
    );

    watcher.on('error', (err) => {
      lastError = err instanceof Error ? err.message : String(err);
      emit();
    });
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    emit();
  }
}

export async function startWatching(songsDirectory: string): Promise<LibraryStatus> {
  // Cancel any in-flight scan
  scanToken += 1;
  const myToken = scanToken;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pending.clear();
  closeWatcher();

  watchedPath = songsDirectory || null;
  lastError = null;
  scanned = 0;
  scanTotal = 0;
  skippedCount = 0;

  if (!songsDirectory) {
    scanning = false;
    emit();
    return getLibraryStatus();
  }

  scanning = true;
  emit();

  const run = (async () => {
    // Let the window finish painting before heavy FS work
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    if (myToken !== scanToken) return;

    try {
      const result = await fullScan(songsDirectory, {
        shouldCancel: () => myToken !== scanToken,
        onProgress: (done, total) => {
          if (myToken !== scanToken) return;
          scanned = done;
          scanTotal = total;
          skippedCount = getSkipCount();
          if (done === total || done % 25 === 0 || done === 1) {
            emit();
          }
        },
      });
      if (myToken === scanToken) {
        skippedCount = result.skipped;
      }
    } catch (err) {
      if (myToken !== scanToken) return;
      if (recoverFromCorrupt(err)) {
        lastError =
          'Catalog database was corrupt and was reset; restarting scan.';
        // Restart once on a fresh DB (new token will cancel this run's finally watcher).
        const dir = songsDirectory;
        setTimeout(() => {
          if (watchedPath === dir) void startWatching(dir);
        }, 0);
        return;
      }
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      if (myToken === scanToken) {
        scanning = false;
        scanned = scanTotal;
        skippedCount = getSkipCount();
        emit();
        // Defer watcher attach so the renderer can process the "scan done" status first
        setTimeout(() => {
          if (myToken !== scanToken) return;
          try {
            ensureWatcher(songsDirectory);
          } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            emit();
          }
        }, 100);
      }
    }
  })();

  scanInFlight = run;
  return getLibraryStatus();
}

export async function stopWatching(): Promise<void> {
  scanToken += 1;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  pending.clear();
  scanning = false;
  closeWatcher();
  if (scanInFlight) {
    try {
      await scanInFlight;
    } catch {
      // ignore
    }
    scanInFlight = null;
  }
}

export async function rescanLibrary(songsDirectory: string): Promise<LibraryStatus> {
  return startWatching(songsDirectory);
}
