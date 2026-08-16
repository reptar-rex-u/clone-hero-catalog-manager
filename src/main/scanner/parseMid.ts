import fs from 'node:fs';
import { parseMidi } from 'midi-file';
import type { DifficultyFlags, InstrumentInfo, InstrumentName } from '../../shared/types';

function emptyDiffs(): DifficultyFlags {
  return { easy: false, medium: false, hard: false, expert: false };
}

function mapTrackName(name: string): InstrumentName | null {
  const n = name.toUpperCase().replace(/\s+/g, ' ').trim();
  if (n.includes('GHL') || n.includes('6 FRET') || n.includes('6FRET')) return null;
  if (n.includes('VOCAL')) return 'Vocals';
  if (n.includes('DRUM')) return 'Drums';
  if (n.includes('KEYS') || n.includes('KEYBOARD') || n.includes('PIANO')) return 'Keys';
  if (n.includes('GUITAR COOP') || n.includes('GUITARCOOP')) return 'GuitarCoop';
  if (n.includes('RHYTHM')) return 'Rhythm';
  if (n.includes('BASS')) return 'Bass';
  if (n.includes('GUITAR')) return 'Guitar';
  return null;
}

function noteDifficulty(note: number, instrument: InstrumentName): keyof DifficultyFlags | null {
  if (instrument === 'Vocals') {
    return 'expert';
  }
  if (note >= 96 && note <= 100) return 'expert';
  if (note >= 84 && note <= 88) return 'hard';
  if (note >= 72 && note <= 76) return 'medium';
  if (note >= 60 && note <= 64) return 'easy';
  if (instrument === 'Drums') {
    if (note >= 96 && note <= 102) return 'expert';
    if (note >= 84 && note <= 90) return 'hard';
    if (note >= 72 && note <= 78) return 'medium';
    if (note >= 60 && note <= 66) return 'easy';
  }
  return null;
}

export function parseMidFile(filePath: string): {
  instruments: InstrumentInfo[];
  hasLyrics: boolean;
} {
  const buffer = fs.readFileSync(filePath);
  const midi = parseMidi(buffer);
  const map = new Map<InstrumentName, DifficultyFlags>();
  let hasLyrics = false;

  for (const track of midi.tracks) {
    let trackName = '';
    for (const event of track) {
      if (event.type === 'trackName' && typeof event.text === 'string') {
        trackName = event.text;
        break;
      }
    }
    const instrument = mapTrackName(trackName);
    const flags = instrument ? map.get(instrument) ?? emptyDiffs() : null;

    for (const event of track) {
      if (!hasLyrics && (event.type === 'lyrics' || event.type === 'text')) {
        const text = String((event as { text?: string }).text ?? '').trim();
        if (text && !text.startsWith('[')) hasLyrics = true;
      }
      if (!instrument || !flags) continue;
      if (event.type !== 'noteOn' || !('noteNumber' in event)) continue;
      if ((event as { velocity?: number }).velocity === 0) continue;
      const diff = noteDifficulty((event as { noteNumber: number }).noteNumber, instrument);
      if (diff) flags[diff] = true;
    }

    if (instrument && flags) map.set(instrument, flags);
  }

  const instruments = [...map.entries()]
    .filter(([, d]) => d.easy || d.medium || d.hard || d.expert)
    .map(([instrument, difficulties]) => {
      const anyLower = difficulties.easy || difficulties.medium || difficulties.hard;
      const expertOnly = difficulties.expert && !anyLower;
      return { instrument, difficulties, expertOnly };
    });

  return { instruments, hasLyrics };
}
