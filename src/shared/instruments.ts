import type { InstrumentInfo, InstrumentName } from './types';

export const ALL_INSTRUMENTS: InstrumentName[] = [
  'Guitar',
  'Bass',
  'Rhythm',
  'GuitarCoop',
  'Keys',
  'Drums',
  'Vocals',
];

export const INSTRUMENT_LABELS: Record<InstrumentName, string> = {
  Guitar: 'Guitar',
  Bass: 'Bass',
  Rhythm: 'Rhythm',
  GuitarCoop: 'Guitar Coop',
  Keys: 'Keys',
  Drums: 'Drums',
  Vocals: 'Vocals',
};

export type InstrumentVisualState = 'missing' | 'available' | 'expertOnly';

export function instrumentState(
  instruments: InstrumentInfo[] | undefined,
  name: InstrumentName,
): InstrumentVisualState {
  const hit = instruments?.find((i) => i.instrument === name);
  if (!hit) return 'missing';
  return hit.expertOnly ? 'expertOnly' : 'available';
}
