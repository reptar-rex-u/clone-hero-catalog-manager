import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SongListItem } from '../../shared/types';
import { api, formatLength } from '../lib/api';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { InstrumentIcons } from './InstrumentIcons';
import { PreviewButton } from './PreviewButton';

interface Props {
  songs: SongListItem[];
  onOpen: (id: number) => void;
  onChanged: () => void;
}

export function SongGrid({ songs, onOpen, onChanged }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [playlistSong, setPlaylistSong] = useState<SongListItem | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  return (
    <>
      <div className="song-grid-wrap" ref={parentRef}>
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const song = songs[virtualRow.index];
            return (
              <div
                key={song.id}
                className="song-row"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onDoubleClick={() => onOpen(song.id)}
              >
                <div className="title" onClick={() => onOpen(song.id)} role="presentation">
                  {song.name}
                </div>
                <div className="meta">{song.artist}</div>
                <InstrumentIcons instruments={song.instruments} />
                <div className="meta">{song.genre || '—'}</div>
                <div className="meta">{song.charter || '—'}</div>
                <div className="meta">{formatLength(song.lengthMs)}</div>
                <div className="row-actions">
                  <PreviewButton song={song} compact />
                  <button
                    className={`btn btn-icon${song.isFavorite ? ' active-fav' : ''}`}
                    type="button"
                    title={song.isFavorite ? 'Unfavorite' : 'Favorite'}
                    onClick={async (e) => {
                      e.stopPropagation();
                      await api().songsToggleFavorite(song.id);
                      onChanged();
                    }}
                  >
                    ★
                  </button>
                  <button
                    className="btn btn-icon"
                    type="button"
                    title="Add to playlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistSong(song);
                    }}
                  >
                    +
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await api().setlistAdd(song.id);
                      onChanged();
                    }}
                  >
                    + Setlist
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <AddToPlaylistModal
        songId={playlistSong?.id ?? null}
        songName={playlistSong?.name}
        onClose={() => setPlaylistSong(null)}
      />
    </>
  );
}
