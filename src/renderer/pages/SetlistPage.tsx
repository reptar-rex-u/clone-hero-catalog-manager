import { useCallback, useEffect, useState } from 'react';
import type { SongListItem } from '../../shared/types';
import { PreviewButton } from '../components/PreviewButton';
import { SongArtCard } from '../components/SongArtCard';
import { SongDetailModal } from '../components/SongDetailModal';
import { api } from '../lib/api';

export function SetlistPage() {
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setSongs(await api().setlistGet());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="main">
      <div className="content">
        <div className="page-header">
          <h1>Setlist Builder</h1>
          <div className="row-actions">
            <span className="status-chip">{songs.length} queued</span>
            <button
              className="btn btn-danger"
              type="button"
              onClick={async () => {
                await api().setlistClear();
                void load();
              }}
            >
              Clear Setlist
            </button>
          </div>
        </div>
        {songs.length === 0 ? (
          <div className="empty">
            Setlist is empty. Add songs from the catalog. Clears automatically when the app
            closes.
          </div>
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
                      className="btn"
                      type="button"
                      onClick={async () => {
                        await api().setlistRemove(song.id);
                        void load();
                      }}
                    >
                      Remove
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
