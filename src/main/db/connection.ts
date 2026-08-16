import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { SCHEMA_SQL } from './schema';

/** Bump when song.ini / chart indexing semantics change (forces one full reindex). */
export const INDEX_USER_VERSION = 5;

let db: Database.Database | null = null;
/** True after this process wiped/recreated a corrupt catalog DB (caller should rescan). */
let recoveredThisSession = false;

export function getDbPath(): string {
  const dir = app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'catalog.sqlite');
}

/** Main DB + WAL sidecars that must stay consistent as a set. */
export function getDbFilePaths(dbPath = getDbPath()): string[] {
  return [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
}

export function consumeDbRecoveredFlag(): boolean {
  const value = recoveredThisSession;
  recoveredThisSession = false;
  return value;
}

export function isSqliteCorruptError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code?: unknown }).code) : '';
  const message =
    'message' in err ? String((err as { message?: unknown }).message) : '';
  return (
    code === 'SQLITE_CORRUPT' ||
    code === 'SQLITE_NOTADB' ||
    code === 'SQLITE_IOERR_SHORT_READ' ||
    /database disk image is malformed/i.test(message) ||
    /file is not a database/i.test(message)
  );
}

function migrateSongsColumns(database: Database.Database): void {
  const cols = database.prepare('PRAGMA table_info(songs)').all() as Array<{
    name: string;
  }>;
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('preview_start_ms')) {
    database.exec('ALTER TABLE songs ADD COLUMN preview_start_ms INTEGER');
  }
  if (!names.has('has_audio')) {
    database.exec(
      'ALTER TABLE songs ADD COLUMN has_audio INTEGER NOT NULL DEFAULT 0',
    );
  }
}

function assertIntegrity(database: Database.Database): void {
  database.prepare('SELECT count(*) AS c FROM sqlite_master').get();
  const rows = database.pragma('quick_check') as Array<{
    quick_check: string;
  }>;
  const ok = rows.length === 1 && rows[0]?.quick_check === 'ok';
  if (!ok) {
    const detail = rows.map((r) => r.quick_check).join('; ') || 'unknown';
    const err = new Error(
      `database disk image is malformed (quick_check: ${detail})`,
    ) as Error & { code: string };
    err.code = 'SQLITE_CORRUPT';
    throw err;
  }
}

function configureConnection(database: Database.Database): void {
  database.pragma('journal_mode = WAL');
  // FULL reduces torn WAL risk if the process is killed mid-write.
  database.pragma('synchronous = FULL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  database.exec(SCHEMA_SQL);
  migrateSongsColumns(database);
}

function removeOrphanSidecars(dbPath: string): void {
  if (fs.existsSync(dbPath)) return;
  for (const side of [`${dbPath}-wal`, `${dbPath}-shm`]) {
    try {
      if (fs.existsSync(side)) fs.unlinkSync(side);
    } catch {
      // ignore
    }
  }
}

function openRaw(): Database.Database {
  const dbPath = getDbPath();
  removeOrphanSidecars(dbPath);
  const database = new Database(dbPath);
  try {
    configureConnection(database);
    assertIntegrity(database);
    return database;
  } catch (err) {
    try {
      database.close();
    } catch {
      // ignore
    }
    throw err;
  }
}

function backupCorruptFiles(dbPath: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(path.dirname(dbPath), 'corrupt-backups');
  fs.mkdirSync(backupDir, { recursive: true });

  for (const filePath of getDbFilePaths(dbPath)) {
    if (!fs.existsSync(filePath)) continue;
    const base = path.basename(filePath);
    const dest = path.join(backupDir, `${base}.${stamp}`);
    try {
      fs.copyFileSync(filePath, dest);
    } catch {
      // Best-effort backup; deletion below still proceeds.
    }
  }

  // Keep only the newest few backup sets (by mtime) to avoid unbounded growth.
  try {
    const entries = fs
      .readdirSync(backupDir)
      .map((name) => {
        const full = path.join(backupDir, name);
        return { full, mtime: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    for (const entry of entries.slice(18)) {
      try {
        fs.unlinkSync(entry.full);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

/** Delete catalog.sqlite and WAL/SHM sidecars. Connection must already be closed. */
export function deleteDbFiles(dbPath = getDbPath()): void {
  for (const filePath of getDbFilePaths(dbPath)) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore locked/missing
    }
  }
}

function wipeCorruptDatabase(): void {
  const dbPath = getDbPath();
  backupCorruptFiles(dbPath);
  deleteDbFiles(dbPath);
  recoveredThisSession = true;
  console.error(
    `[ch-catalog] SQLite catalog was corrupt; backed up under corrupt-backups and recreated at ${dbPath}`,
  );
}

function closeDbHandle(): void {
  if (!db) return;
  try {
    db.close();
  } catch {
    // ignore
  }
  db = null;
}

/**
 * Open (or reopen) the catalog DB. On SQLITE_CORRUPT, backup + delete db/wal/shm
 * and create a fresh schema. Callers should rescan when consumeDbRecoveredFlag().
 */
export function getDb(): Database.Database {
  if (db) return db;

  try {
    db = openRaw();
  } catch (err) {
    if (!isSqliteCorruptError(err)) throw err;
    wipeCorruptDatabase();
    db = openRaw();
  }
  return db;
}

/**
 * If `err` is corruption, close, wipe, reopen, and return true so the caller
 * can retry and/or trigger a library rescan. Otherwise returns false.
 */
export function recoverFromCorrupt(err: unknown): boolean {
  if (!isSqliteCorruptError(err)) return false;
  closeDbHandle();
  wipeCorruptDatabase();
  db = openRaw();
  return true;
}

export function getIndexUserVersion(): number {
  return Number(getDb().pragma('user_version', { simple: true }) ?? 0);
}

export function setIndexUserVersion(version: number): void {
  getDb().pragma(`user_version = ${version}`);
}

/** Non-blocking WAL flush; safe to call during long scans. */
export function checkpointWalPassive(): void {
  if (!db) return;
  try {
    db.pragma('wal_checkpoint(PASSIVE)');
  } catch {
    // ignore
  }
}

export function closeDb(): void {
  if (!db) return;
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // ignore checkpoint errors on shutdown
  }
  try {
    db.close();
  } catch {
    // ignore
  }
  db = null;
}
