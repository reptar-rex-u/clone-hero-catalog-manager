import fs from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';

export interface SkipEntry {
  folderPath: string;
  reason: string;
  at: string;
}

let entries: SkipEntry[] = [];

function logPath(): string {
  return path.join(app.getPath('userData'), 'skipped-songs.log');
}

export function clearSkipLog(): void {
  entries = [];
}

export function recordSkip(folderPath: string, reason: string): void {
  entries.push({
    folderPath,
    reason,
    at: new Date().toISOString(),
  });
}

export function getSkipEntries(): SkipEntry[] {
  return [...entries];
}

export function getSkipCount(): number {
  return entries.length;
}

export function formatSkipLog(): string {
  const header = [
    'CH Catalog — skipped / refused songs',
    `Generated: ${new Date().toISOString()}`,
    `Count: ${entries.length}`,
    '',
  ].join('\n');

  if (entries.length === 0) {
    return `${header}(none)\n`;
  }

  const body = entries
    .map((e, i) => `${i + 1}. ${e.folderPath}\n   Reason: ${e.reason}\n   At: ${e.at}`)
    .join('\n\n');

  return `${header}${body}\n`;
}

/** Persist latest skip log under userData for debugging. */
export function persistSkipLog(): string {
  const file = logPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, formatSkipLog(), 'utf8');
  return file;
}

export async function exportSkipLog(): Promise<{
  ok: boolean;
  path?: string;
  canceled?: boolean;
  error?: string;
  count: number;
}> {
  const count = entries.length;
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win ?? undefined, {
    title: 'Export skipped songs log',
    defaultPath: 'ch-catalog-skipped-songs.log',
    filters: [
      { name: 'Log files', extensions: ['log', 'txt'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true, count };
  }

  try {
    fs.writeFileSync(result.filePath, formatSkipLog(), 'utf8');
    persistSkipLog();
    return { ok: true, path: result.filePath, count };
  } catch (err) {
    return {
      ok: false,
      count,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
