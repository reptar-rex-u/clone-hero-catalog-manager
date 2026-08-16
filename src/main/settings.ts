import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_ACCENT, normalizeHex } from '../shared/accentTheme';
import type { AppSettings } from '../shared/types';

const DEFAULTS: AppSettings = {
  songsDirectory: '',
  accentColor: DEFAULT_ACCENT,
  bridgePath: '',
  cloneHeroPath: '',
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function coercePath(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function coerceSettings(parsed: Partial<AppSettings>): AppSettings {
  return {
    songsDirectory: parsed.songsDirectory ?? '',
    accentColor: normalizeHex(parsed.accentColor ?? '') ?? DEFAULT_ACCENT,
    bridgePath: coercePath(parsed.bridgePath),
    cloneHeroPath: coercePath(parsed.cloneHeroPath),
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return coerceSettings(parsed);
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next = coerceSettings({ ...loadSettings(), ...partial });
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}
