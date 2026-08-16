import type { SongListItem } from '../shared/types';
import { getSongById } from './db/songsRepo';

const queue: SongListItem[] = [];

export function getSetlist(): SongListItem[] {
  return [...queue];
}

export function addToSetlist(id: number): SongListItem[] {
  if (queue.some((s) => s.id === id)) return getSetlist();
  const song = getSongById(id);
  if (song) queue.push(song);
  return getSetlist();
}

export function removeFromSetlist(id: number): SongListItem[] {
  const idx = queue.findIndex((s) => s.id === id);
  if (idx >= 0) queue.splice(idx, 1);
  return getSetlist();
}

export function clearSetlist(): void {
  queue.length = 0;
}
