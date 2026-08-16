import fs from 'node:fs';
import { net, protocol } from 'electron';
import { pathToFileURL } from 'node:url';
import { getSongById } from '../db/songsRepo';
import { resolveArtworkPath } from '../scanner/mediaFlags';

const SCHEME = 'ch-art';

export function artworkSchemePrivileged(): {
  scheme: string;
  privileges: {
    standard: boolean;
    secure: boolean;
    supportFetchAPI: boolean;
    bypassCSP: boolean;
    stream: boolean;
    corsEnabled: boolean;
  };
} {
  return {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
      corsEnabled: true,
    },
  };
}

function songIdFromRequest(requestUrl: string): number | null {
  try {
    const url = new URL(requestUrl);
    // Preferred: ch-art://song/123
    const fromPath = Number(url.pathname.replace(/^\/+/, '').split('/')[0]);
    if (Number.isFinite(fromPath) && fromPath > 0) return fromPath;
    // Fallback: ch-art://123
    const fromHost = Number(url.hostname);
    if (Number.isFinite(fromHost) && fromHost > 0) return fromHost;
  } catch {
    // ignore
  }
  return null;
}

export function registerArtworkProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const id = songIdFromRequest(request.url);
      if (id == null) {
        return new Response('Bad request', { status: 400 });
      }
      const song = getSongById(id);
      if (!song) return new Response('Not found', { status: 404 });
      const art = resolveArtworkPath(song.folderPath);
      if (!art || !fs.existsSync(art)) {
        return new Response('No artwork', { status: 404 });
      }
      // Recommended Electron path: serve via net.fetch(file URL)
      return net.fetch(pathToFileURL(art).href);
    } catch {
      return new Response('Error', { status: 500 });
    }
  });
}

export function artworkUrlForSong(id: number): string | null {
  const song = getSongById(id);
  if (!song) return null;
  const art = resolveArtworkPath(song.folderPath);
  if (!art) return null;
  return `${SCHEME}://song/${id}`;
}
