import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import {
  CUSTOM_PLAYLIST_ICON_PREFIX,
  customPlaylistIconFileName,
  isCustomPlaylistIcon,
} from '../shared/playlistIcons';

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export function getPlaylistIconsDir(): string {
  const dir = path.join(app.getPath('userData'), 'playlist-icons');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolvePlaylistIconPath(icon: string): string | null {
  const name = customPlaylistIconFileName(icon);
  if (!name) return null;
  const dir = getPlaylistIconsDir();
  const full = path.join(dir, name);
  if (path.dirname(full) !== dir) return null;
  if (!fs.existsSync(full)) return null;
  return full;
}

export function importPlaylistIconFromPath(sourcePath: string): string | null {
  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return null;
  if (!fs.existsSync(sourcePath)) return null;
  const normalizedExt = ext === '.jpeg' ? '.jpg' : ext;
  const fileName = `${randomUUID()}${normalizedExt}`;
  const dest = path.join(getPlaylistIconsDir(), fileName);
  fs.copyFileSync(sourcePath, dest);
  return `${CUSTOM_PLAYLIST_ICON_PREFIX}${fileName}`;
}

export function deletePlaylistIconFile(icon: string): void {
  if (!isCustomPlaylistIcon(icon)) return;
  const full = resolvePlaylistIconPath(icon);
  if (!full) return;
  try {
    fs.unlinkSync(full);
  } catch {
    // ignore
  }
}

export function playlistIconToDataUrl(icon: string): string | null {
  const full = resolvePlaylistIconPath(icon);
  if (!full) return null;
  const ext = path.extname(full).toLowerCase().replace('.', '');
  const mime =
    ext === 'jpg' || ext === 'jpeg'
      ? 'image/jpeg'
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
            ? 'image/gif'
            : null;
  if (!mime) return null;
  const buf = fs.readFileSync(full);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export function importPlaylistIconFromDataUrl(dataUrl: string): string | null {
  const match =
    /^data:(image\/(png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/i.exec(
      dataUrl.trim(),
    );
  if (!match) return null;
  const kind = match[2].toLowerCase();
  const ext =
    kind === 'jpeg' || kind === 'jpg'
      ? '.jpg'
      : kind === 'png'
        ? '.png'
        : kind === 'webp'
          ? '.webp'
          : '.gif';
  const fileName = `${randomUUID()}${ext}`;
  const dest = path.join(getPlaylistIconsDir(), fileName);
  fs.writeFileSync(dest, Buffer.from(match[3], 'base64'));
  return `${CUSTOM_PLAYLIST_ICON_PREFIX}${fileName}`;
}
