import type { SongListItem } from '../../shared/types';
import { usePreview } from '../lib/PreviewContext';

interface Props {
  song: SongListItem;
  /** Icon-only compact control for dense rows. */
  compact?: boolean;
}

export function PreviewButton({ song, compact = false }: Props) {
  const { playingId, togglePreview } = usePreview();
  const playing = playingId === song.id;

  if (!song.hasAudio) {
    return (
      <button
        className={`btn${compact ? ' btn-icon' : ''} preview-btn is-disabled`}
        type="button"
        disabled
        title="No audio file found (song.*/guitar.*)"
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      >
        {compact ? '▶' : 'Preview'}
      </button>
    );
  }

  return (
    <button
      className={`btn${compact ? ' btn-icon' : ''}${playing ? ' preview-btn is-playing' : ' preview-btn'}`}
      type="button"
      title={playing ? 'Stop preview' : 'Play 30s preview'}
      onClick={(e) => {
        e.stopPropagation();
        togglePreview(song);
      }}
    >
      {compact ? (playing ? '■' : '▶') : playing ? 'Stop' : 'Preview'}
    </button>
  );
}
