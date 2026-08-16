import { app, BrowserWindow, protocol } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {
  closeDb,
  consumeDbRecoveredFlag,
  getDb,
  getDbFilePaths,
} from './db/connection';
import { registerIpcHandlers } from './ipc';
import {
  audioSchemePrivileged,
  registerAudioProtocol,
} from './protocols/audioProtocol';
import {
  artworkSchemePrivileged,
  registerArtworkProtocol,
} from './protocols/artworkProtocol';
import {
  playlistIconSchemePrivileged,
  registerPlaylistIconProtocol,
} from './protocols/playlistIconProtocol';
import { rescanLibrary, stopWatching } from './scanner/watchLibrary';
import { loadSettings } from './settings';
import { clearSetlist } from './setlist';

protocol.registerSchemesAsPrivileged([
  artworkSchemePrivileged(),
  playlistIconSchemePrivileged(),
  audioSchemePrivileged(),
]);

if (started) {
  app.quit();
}

// Prevent multiple instances from opening the same SQLite DB (WAL corruption).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

function resolveAppIcon(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(__dirname, '../../assets/icon.ico'),
    path.join(app.getAppPath(), 'assets/icon.ico'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** One-time copy from old "Clone Hero Catalog" AppData into "CH Catalog". */
function migrateLegacyUserData(): void {
  const dest = app.getPath('userData');
  const legacy = path.join(app.getPath('appData'), 'Clone Hero Catalog');
  if (path.resolve(dest) === path.resolve(legacy)) return;
  if (!fs.existsSync(legacy)) return;

  fs.mkdirSync(dest, { recursive: true });

  // Plain files can migrate independently.
  for (const name of ['settings.json', 'skipped-songs.log']) {
    const from = path.join(legacy, name);
    const to = path.join(dest, name);
    if (fs.existsSync(from) && !fs.existsSync(to)) {
      try {
        fs.copyFileSync(from, to);
      } catch {
        // ignore individual copy failures
      }
    }
  }

  // SQLite main + WAL/SHM must move as one set. Never attach a legacy -wal/-shm
  // onto an existing dest DB (that causes SQLITE_CORRUPT).
  const sqliteNames = [
    'catalog.sqlite',
    'catalog.sqlite-wal',
    'catalog.sqlite-shm',
  ];
  const destDbPath = path.join(dest, 'catalog.sqlite');
  const destHasAnySqlite = getDbFilePaths(destDbPath).some((p) =>
    fs.existsSync(p),
  );
  if (destHasAnySqlite) return;

  const legacyDb = path.join(legacy, 'catalog.sqlite');
  if (!fs.existsSync(legacyDb)) return;

  for (const name of sqliteNames) {
    const from = path.join(legacy, name);
    const to = path.join(dest, name);
    if (!fs.existsSync(from)) continue;
    try {
      fs.copyFileSync(from, to);
    } catch {
      // If the set is incomplete/partial, open-time integrity check + recovery
      // will wipe and recreate rather than run on a mixed DB.
    }
  }
}

const createWindow = () => {
  const icon = resolveAppIcon();
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f1419',
    title: 'CH Catalog',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (process.env.NODE_ENV === 'development' || MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // DevTools optional — leave closed by default for catalog UX
  }
};

if (gotLock) {
  /** Electron does not await async before-quit handlers; gate + preventDefault. */
  let shuttingDown = false;

  app.whenReady().then(() => {
    migrateLegacyUserData();
    getDb();
    const recovered = consumeDbRecoveredFlag();
    registerArtworkProtocol();
    registerPlaylistIconProtocol();
    registerAudioProtocol();
    registerIpcHandlers();

    // Show UI first; defer scan so the window can paint and stay responsive
    createWindow();

    const settings = loadSettings();
    if (settings.songsDirectory) {
      if (recovered) {
        console.warn(
          '[ch-catalog] Catalog DB was recreated after corruption; rescanning library.',
        );
      }
      setTimeout(() => {
        void rescanLibrary(settings.songsDirectory);
      }, 300);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', (event) => {
    if (shuttingDown) return;
    event.preventDefault();
    shuttingDown = true;
    void (async () => {
      try {
        clearSetlist();
        await stopWatching();
      } finally {
        closeDb();
        app.quit();
      }
    })();
  });

  // Safety net if quit bypasses the async before-quit path.
  app.on('will-quit', () => {
    closeDb();
  });
}