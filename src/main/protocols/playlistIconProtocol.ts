import fs from 'node:fs';
import { net, protocol } from 'electron';
import { pathToFileURL } from 'node:url';
import {
  CUSTOM_PLAYLIST_ICON_PREFIX,
  customPlaylistIconFileName,
} from '../../shared/playlistIcons';
import { resolvePlaylistIconPath } from '../playlistIconsStore';

const SCHEME = 'ch-plicon';

export function playlistIconSchemePrivileged(): {
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

function fileNameFromRequest(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    const fromPath = url.pathname.replace(/^\/+/, '').split('/')[0];
    if (fromPath) {
      return customPlaylistIconFileName(
        `${CUSTOM_PLAYLIST_ICON_PREFIX}${fromPath}`,
      );
    }
    if (url.hostname && url.hostname !== 'icon') {
      return customPlaylistIconFileName(
        `${CUSTOM_PLAYLIST_ICON_PREFIX}${url.hostname}`,
      );
    }
  } catch {
    // ignore
  }
  return null;
}

export function registerPlaylistIconProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const name = fileNameFromRequest(request.url);
      if (!name) return new Response('Bad request', { status: 400 });
      const full = resolvePlaylistIconPath(
        `${CUSTOM_PLAYLIST_ICON_PREFIX}${name}`,
      );
      if (!full || !fs.existsSync(full)) {
        return new Response('Not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(full).href);
    } catch {
      return new Response('Error', { status: 500 });
    }
  });
}
