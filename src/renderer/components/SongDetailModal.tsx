import { useEffect, useState } from 'react';
import type { SongDetail } from '../../shared/types';
import { api, formatLength } from '../lib/api';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { AlbumArt } from './AlbumArt';
import { InstrumentIcons } from './InstrumentIcons';
import { PreviewButton } from './PreviewButton';

interface Props {
  songId: number | null;
  onClose: () => void;
  onChanged?: () => void;
}

export function SongDetailModal({ songId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<SongDetail | null>(null);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  useEffect(() => {
    if (songId == null) {
      setDetail(null);
      setPlaylistOpen(false);
      return;
    }
    let cancelled = false;
    api()
      .songsGetDetail(songId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  if (songId == null || !detail) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} role="presentation">
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <AlbumArt songId={detail.id} />
          </div>
          <div>
            <h2>{detail.name}</h2>
            <div className="meta-grid">
              <dt>Artist</dt>
              <dd>{detail.artist || '—'}</dd>
              <dt>Album</dt>
              <dd>{detail.album || '—'}</dd>
              <dt>Charter</dt>
              <dd>{detail.charter || '—'}</dd>
              <dt>Genre</dt>
              <dd>{detail.genre || '—'}</dd>
              <dt>Year</dt>
              <dd>{detail.year || '—'}</dd>
              <dt>Length</dt>
              <dd>{formatLength(detail.lengthMs)}</dd>
            </div>

            <div className="chips">
              {detail.hasLyrics && <span className="chip flag">Lyrics</span>}
              {detail.hasVideo && <span className="chip flag">Video</span>}
            </div>
            <div style={{ marginTop: 12 }}>
              <InstrumentIcons instruments={detail.instruments} size="md" />
            </div>

            <div className="row-actions" style={{ marginTop: 18 }}>
              <PreviewButton song={detail} />
              <button
                className={`btn${detail.isFavorite ? ' active-fav' : ''}`}
                type="button"
                onClick={async () => {
                  await api().songsToggleFavorite(detail.id);
                  const next = await api().songsGetDetail(detail.id);
                  setDetail(next);
                  onChanged?.();
                }}
              >
                {detail.isFavorite ? 'Unfavorite' : 'Favorite'}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => setPlaylistOpen(true)}
              >
                + Playlist
              </button>
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  await api().setlistAdd(detail.id);
                  onChanged?.();
                }}
              >
                Add to Setlist
              </button>
              <button className="btn btn-ghost" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      {playlistOpen ? (
        <AddToPlaylistModal
          songId={detail.id}
          songName={detail.name}
          onClose={() => setPlaylistOpen(false)}
        />
      ) : null}
    </>
  );
}
