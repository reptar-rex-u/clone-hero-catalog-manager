import fs from 'node:fs';
import { net, protocol } from 'electron';
import { pathToFileURL } from 'node:url';
import { getSongById } from '../db/songsRepo';
import { resolveSongAudioPath } from '../scanner/mediaFlags';

const SCHEME = 'ch-audio';

export function audioSchemePrivileged(): {
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
    const fromPath = Number(url.pathname.replace(/^\/+/, '').split('/')[0]);
    if (Number.isFinite(fromPath) && fromPath > 0) return fromPath;
    const fromHost = Number(url.hostname);
    if (Number.isFinite(fromHost) && fromHost > 0) return fromHost;
  } catch {
    // ignore
  }
  return null;
}

export function registerAudioProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const id = songIdFromRequest(request.url);
      if (id == null) {
        return new Response('Bad request', { status: 400 });
      }
      const song = getSongById(id);
      if (!song) return new Response('Not found', { status: 404 });
      const audio = resolveSongAudioPath(song.folderPath);
      if (!audio || !fs.existsSync(audio)) {
        return new Response('No audio', { status: 404 });
      }
      return net.fetch(pathToFileURL(audio).href);
    } catch {
      return new Response('Error', { status: 500 });
    }
  });
}

export function audioUrlForSong(id: number): string {
  return `${SCHEME}://song/${id}`;
}
