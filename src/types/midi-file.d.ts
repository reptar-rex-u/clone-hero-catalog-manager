declare module 'midi-file' {
  export interface MidiEvent {
    type: string;
    text?: string;
    noteNumber?: number;
    velocity?: number;
  }
  export interface MidiData {
    tracks: MidiEvent[][];
  }
  export function parseMidi(data: Buffer | Uint8Array): MidiData;
}
