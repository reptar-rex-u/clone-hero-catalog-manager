/** Default / preset playlist sidebar icons (emoji). */
export const DEFAULT_PLAYLIST_ICON = '🎵';

export const DEFAULT_PLAYLIST_ICON_COLOR = '#3ecf8e';

/** Stored icon value prefix for uploaded images (`img:<filename>`). */
export const CUSTOM_PLAYLIST_ICON_PREFIX = 'img:';

export const PLAYLIST_ICON_PRESETS = [
  '🎵',
  '🎸',
  '🥁',
  '🎹',
  '🎤',
  '🎧',
  '🔥',
  '⭐',
  '💜',
  '🧡',
  '💙',
  '💚',
  '⚡',
  '🌙',
  '🎮',
  '📀',
] as const;

export const PLAYLIST_COLOR_PRESETS = [
  '#3ecf8e',
  '#4c9ffe',
  '#a78bfa',
  '#f472b6',
  '#fb923c',
  '#f87171',
  '#f0b429',
  '#2ec4b6',
  '#94a3b8',
] as const;

export function isCustomPlaylistIcon(icon: string): boolean {
  return icon.startsWith(CUSTOM_PLAYLIST_ICON_PREFIX);
}

/** Safe filename after `img:` (uuid + ext). */
export function customPlaylistIconFileName(icon: string): string | null {
  if (!isCustomPlaylistIcon(icon)) return null;
  const name = icon.slice(CUSTOM_PLAYLIST_ICON_PREFIX.length);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(png|jpe?g|webp|gif)$/i.test(name)) {
    return null;
  }
  return name;
}

export function playlistIconSrc(icon: string): string | null {
  const name = customPlaylistIconFileName(icon);
  if (!name) return null;
  return `ch-plicon://icon/${name}`;
}

export function normalizePlaylistIcon(icon: string | undefined | null): string {
  const trimmed = (icon ?? '').trim();
  if (!trimmed) return DEFAULT_PLAYLIST_ICON;
  if (isCustomPlaylistIcon(trimmed)) {
    return customPlaylistIconFileName(trimmed) ? trimmed : DEFAULT_PLAYLIST_ICON;
  }
  // Allow multi-codepoint emoji / ZWJ sequences
  return Array.from(trimmed).slice(0, 8).join('');
}
