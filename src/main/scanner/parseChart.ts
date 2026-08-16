import fs from 'node:fs';
import type { DifficultyFlags, InstrumentInfo, InstrumentName } from '../../shared/types';

const SECTION_RE = /^\s*\[(.+?)\]\s*$/;

interface ParsedSection {
  difficulty: keyof DifficultyFlags | null;
  instrument: InstrumentName | null;
}

function parseSectionName(name: string): ParsedSection {
  const lower = name.toLowerCase();

  // Skip GHL / 6-fret entirely
  if (lower.includes('ghl')) {
    return { difficulty: null, instrument: null };
  }

  let difficulty: keyof DifficultyFlags | null = null;
  if (lower.startsWith('easy')) difficulty = 'easy';
  else if (lower.startsWith('medium')) difficulty = 'medium';
  else if (lower.startsWith('hard')) difficulty = 'hard';
  else if (lower.startsWith('expert')) difficulty = 'expert';

  if (!difficulty) {
    if (lower === 'vocals' || lower === 'harmony1' || lower === 'harmony2' || lower === 'harmony3') {
      return { difficulty: 'expert', instrument: 'Vocals' };
    }
    return { difficulty: null, instrument: null };
  }

  const rest = name.slice(difficulty.length);

  if (/^single$/i.test(rest)) return { difficulty, instrument: 'Guitar' };
  if (/^doublebass$/i.test(rest)) return { difficulty, instrument: 'Bass' };
  if (/^doubleguitar$/i.test(rest)) return { difficulty, instrument: 'Rhythm' };
  if (/^guitarcoop$/i.test(rest) || /^doublecoop$/i.test(rest)) {
    return { difficulty, instrument: 'GuitarCoop' };
  }
  if (/^keyboard$/i.test(rest) || /^keys$/i.test(rest)) {
    return { difficulty, instrument: 'Keys' };
  }
  if (/^drums$/i.test(rest) || /^prodrums$/i.test(rest)) {
    return { difficulty, instrument: 'Drums' };
  }
  if (/^vocals$/i.test(rest)) return { difficulty, instrument: 'Vocals' };

  return { difficulty: null, instrument: null };
}

function emptyDiffs(): DifficultyFlags {
  return { easy: false, medium: false, hard: false, expert: false };
}

function parseChartPreviewStartMs(text: string): number | null {
  let inSong = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const section = SECTION_RE.exec(line);
    if (section) {
      inSong = /^song$/i.test(section[1]);
      continue;
    }
    if (!inSong) continue;
    if (line === '}' || line === '{') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().toLowerCase();
    if (key !== 'previewstart' && key !== 'preview_start') continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n);
  }
  return null;
}

export function parseChartFile(filePath: string): {
  instruments: InstrumentInfo[];
  hasLyrics: boolean;
  previewStartMs: number | null;
} {
  const text = fs.readFileSync(filePath, 'utf8');
  const map = new Map<InstrumentName, DifficultyFlags>();
  let hasLyrics = false;
  const previewStartMs = parseChartPreviewStartMs(text);

  for (const line of text.split(/\r?\n/)) {
    if (!hasLyrics && (/"lyric\s/i.test(line) || /"phrase_start"/i.test(line))) {
      hasLyrics = true;
    }

    const match = SECTION_RE.exec(line);
    if (!match) continue;
    const name = match[1];
    if (!hasLyrics && /^vocals$/i.test(name)) {
      // Vocals section alone is not lyrics; keep scanning for lyric events
    }
    const { difficulty, instrument } = parseSectionName(name);
    if (!difficulty || !instrument) continue;
    const flags = map.get(instrument) ?? emptyDiffs();
    flags[difficulty] = true;
    map.set(instrument, flags);
  }

  const instruments = [...map.entries()].map(([instrument, difficulties]) => {
    const anyLower = difficulties.easy || difficulties.medium || difficulties.hard;
    const expertOnly = difficulties.expert && !anyLower;
    return { instrument, difficulties, expertOnly };
  });

  return { instruments, hasLyrics, previewStartMs };
}
