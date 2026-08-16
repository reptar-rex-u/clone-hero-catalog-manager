import { BrowserWindow, dialog, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AppSettings,
  ExecutableTarget,
  SongSearchParams,
} from '../shared/types';
import { recoverFromCorrupt } from './db/connection';
import {
  getFilterOptions,
  getSongDetail,
  searchSongs,
  toggleFavorite,
} from './db/songsRepo';
import { exportFavorites, importFavorites } from './favoritesIO';
import { artworkUrlForSong } from './protocols/artworkProtocol';
import {
  getLibraryStatus,
  onLibraryStatus,
  rescanLibrary,
} from './scanner/watchLibrary';
import { exportSkipLog, getSkipCount } from './scanner/skipLog';
import { loadSettings, saveSettings } from './settings';
import {
  addToSetlist,
  clearSetlist,
  getSetlist,
  removeFromSetlist,
} from './setlist';
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  listPlaylists,
  removeSongFromPlaylist,
  renamePlaylist,
  updatePlaylistIcon,
} from './db/playlistsRepo';
import { importPlaylistIconFromPath } from './playlistIconsStore';

function rescanAfterCorruptRecovery(): void {
  const settings = loadSettings();
  if (settings.songsDirectory) {
    void rescanLibrary(settings.songsDirectory);
  }
}

/** Run a DB-backed IPC op; on SQLITE_CORRUPT wipe/reopen once and retry. */
function withCorruptRecovery<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (!recoverFromCorrupt(err)) throw err;
    rescanAfterCorruptRecovery();
    return fn();
  }
}

function executablePathForTarget(
  settings: AppSettings,
  target: ExecutableTarget,
): string {
  return target === 'bridge'
    ? settings.bridgePath
    : settings.cloneHeroPath;
}

function validateExecutablePath(executablePath: string): string | null {
  if (!executablePath) return 'No executable path is configured.';
  if (path.extname(executablePath).toLowerCase() !== '.exe') {
    return 'The configured path must point to an .exe file.';
  }

  try {
    if (!fs.statSync(executablePath).isFile()) {
      return 'The configured executable path is not a file.';
    }
  } catch {
    return 'The configured executable could not be found.';
  }

  return null;
}

function launchExecutable(
  executablePath: string,
): Promise<{ ok: boolean; error?: string }> {
  const validationError = validateExecutablePath(executablePath);
  if (validationError) {
    return Promise.resolve({ ok: false, error: validationError });
  }

  return new Promise((resolve) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(executablePath, [], {
        detached: true,
        shell: false,
        stdio: 'ignore',
      });
    } catch {
      resolve({ ok: false, error: 'The executable could not be launched.' });
      return;
    }

    child.once('spawn', () => {
      child.unref();
      resolve({ ok: true });
    });
    child.once('error', () => {
      resolve({ ok: false, error: 'The executable could not be launched.' });
    });
  });
}

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => loadSettings());

  ipcMain.handle('settings:set', async (_e, partial: Partial<AppSettings>) => {
    const prev = loadSettings();
    const next = saveSettings(partial);
    if (next.songsDirectory !== prev.songsDirectory) {
      // Kick off background scan; do not block the UI / IPC
      void rescanLibrary(next.songsDirectory);
    }
    return next;
  });

  ipcMain.handle('dialog:pickExecutable', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Executables', extensions: ['exe'] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  const launchConfiguredExecutable = (target: ExecutableTarget) => {
    const settings = loadSettings();
    return launchExecutable(executablePathForTarget(settings, target));
  };
  ipcMain.handle('executable:launchBridge', () =>
    launchConfiguredExecutable('bridge'),
  );
  ipcMain.handle('executable:launchCloneHero', () =>
    launchConfiguredExecutable('cloneHero'),
  );

  ipcMain.handle('songs:search', (_e, params: SongSearchParams) =>
    withCorruptRecovery(() => searchSongs(params ?? {})),
  );

  ipcMain.handle('songs:getDetail', (_e, id: number) =>
    withCorruptRecovery(() => {
      const detail = getSongDetail(id);
      if (!detail) return null;
      return { ...detail, artworkUrl: artworkUrlForSong(id) };
    }),
  );

  ipcMain.handle('songs:toggleFavorite', (_e, id: number) =>
    withCorruptRecovery(() => toggleFavorite(id)),
  );

  ipcMain.handle('songs:filterOptions', () =>
    withCorruptRecovery(() => getFilterOptions()),
  );

  ipcMain.handle('setlist:get', () => getSetlist());
  ipcMain.handle('setlist:add', (_e, id: number) => addToSetlist(id));
  ipcMain.handle('setlist:remove', (_e, id: number) => removeFromSetlist(id));
  ipcMain.handle('setlist:clear', () => {
    clearSetlist();
  });

  ipcMain.handle('library:rescan', async () => {
    const settings = loadSettings();
    return rescanLibrary(settings.songsDirectory); // returns immediately; scan is async
  });

  ipcMain.handle('library:status', () => getLibraryStatus());

  ipcMain.handle('library:exportSkipped', async () => exportSkipLog());

  ipcMain.handle('library:skipCount', () => getSkipCount());

  ipcMain.handle('favorites:export', async () => {
    try {
      return await exportFavorites();
    } catch (err) {
      if (!recoverFromCorrupt(err)) throw err;
      rescanAfterCorruptRecovery();
      return await exportFavorites();
    }
  });
  ipcMain.handle('favorites:import', async () => {
    try {
      return await importFavorites();
    } catch (err) {
      if (!recoverFromCorrupt(err)) throw err;
      rescanAfterCorruptRecovery();
      return await importFavorites();
    }
  });

  ipcMain.handle('playlists:list', () =>
    withCorruptRecovery(() => listPlaylists()),
  );
  ipcMain.handle('playlists:get', (_e, id: number) =>
    withCorruptRecovery(() => getPlaylist(id)),
  );
  ipcMain.handle(
    'playlists:create',
    (
      _e,
      name: string,
      options?: { icon?: string; iconColor?: string },
    ) => createPlaylist(name, options),
  );
  ipcMain.handle('playlists:rename', (_e, id: number, name: string) =>
    renamePlaylist(id, name),
  );
  ipcMain.handle(
    'playlists:updateIcon',
    (_e, id: number, icon: string, iconColor: string) =>
      updatePlaylistIcon(id, icon, iconColor),
  );
  ipcMain.handle('playlists:pickIconImage', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined, {
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
        },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return importPlaylistIconFromPath(result.filePaths[0]);
  });
  ipcMain.handle('playlists:delete', (_e, id: number) => deletePlaylist(id));
  ipcMain.handle(
    'playlists:addSong',
    (_e, playlistId: number, songId: number) =>
      addSongToPlaylist(playlistId, songId),
  );
  ipcMain.handle(
    'playlists:removeSong',
    (_e, playlistId: number, songId: number) =>
      removeSongFromPlaylist(playlistId, songId),
  );

  ipcMain.handle('dialog:pickDirectory', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win ?? undefined, {
      properties: ['openDirectory'],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return result.filePaths[0];
  });

  onLibraryStatus((status) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('library:statusChanged', status);
    }
  });
}
