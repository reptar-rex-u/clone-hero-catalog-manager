import type { ChCatalogApi } from '../../shared/types';

export function api(): ChCatalogApi {
  if (!window.chCatalog) {
    throw new Error('chCatalog preload API is not available');
  }
  return window.chCatalog;
}

export function formatLength(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function artworkSrc(songId: number): string {
  return `ch-art://song/${songId}`;
}

export function audioSrc(songId: number): string {
  return `ch-audio://song/${songId}`;
}
