import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PlaylistSummary } from '../../shared/types';
import { api } from './api';

interface PlaylistContextValue {
  playlists: PlaylistSummary[];
  refreshPlaylists: () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextValue | null>(null);

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);

  const refreshPlaylists = useCallback(async () => {
    const list = await api().playlistsList();
    setPlaylists(list);
  }, []);

  useEffect(() => {
    void refreshPlaylists();
  }, [refreshPlaylists]);

  const value = useMemo(
    () => ({ playlists, refreshPlaylists }),
    [playlists, refreshPlaylists],
  );

  return (
    <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>
  );
}

export function usePlaylists(): PlaylistContextValue {
  const ctx = useContext(PlaylistContext);
  if (!ctx) {
    throw new Error('usePlaylists must be used within PlaylistProvider');
  }
  return ctx;
}
