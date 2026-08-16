/**
 * Clone Hero / Unity rich-text tags in song.ini (name, artist, etc.).
 * Examples:
 *   <color=#FF4FA3>Title</color>
 *   <#FF0000>Title</color>
 *   <size=20>Title</size>
 */
export function stripRichText(input: string): string {
  if (!input) return '';
  let s = input;
  // Paired tags: <color=#RRGGBB>…</color>, <size=N>…</size>, <b>…</b>, …
  s = s.replace(/<\/?(?:color|size|b|i|u|material|quad|sprite)(?:\s*=[^>]*)?>/gi, '');
  // Shorthand <#RRGGBB> … (optional closing)
  s = s.replace(/<#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})>/gi, '');
  s = s.replace(/<\/?#>/g, '');
  return s.replace(/\s+/g, ' ').trim();
}
