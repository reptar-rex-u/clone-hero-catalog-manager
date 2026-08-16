import { useCallback, useEffect, useState } from 'react';
import type { SongListItem } from '../../shared/types';
import { PreviewButton } from '../components/PreviewButton';
import { SongArtCard } from '../components/SongArtCard';
import { SongDetailModal } from '../components/SongDetailModal';
import { api } from '../lib/api';

export function FavoritesPage() {
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await api().songsSearch({
      favoritesOnly: true,
      offset: 0,
      limit: 5000,
    });
    setSongs(result.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="main">
      <div className="content">
        <div className="page-header">
          <h1>Favorites</h1>
          <span className="status-chip">{songs.length} songs</span>
        </div>
        {songs.length === 0 ? (
          <div className="empty">No favorites yet. Star songs from the catalog.</div>
        ) : (
          <div className="art-grid">
            {songs.map((song) => (
              <SongArtCard
                key={song.id}
                song={song}
                actions={
                  <>
                    <PreviewButton song={song} />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => setDetailId(song.id)}
                    >
                      Details
                    </button>
                    <button
                      className="btn active-fav"
                      type="button"
                      onClick={async () => {
                        await api().songsToggleFavorite(song.id);
                        void load();
                      }}
                    >
                      ★
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </div>
      <SongDetailModal
        songId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => void load()}
      />
    </div>
  );
}
