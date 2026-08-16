import type { ReactNode } from 'react';
import type { SongListItem } from '../../shared/types';
import { AlbumArt } from './AlbumArt';
import { InstrumentIcons } from './InstrumentIcons';

interface Props {
  song: SongListItem;
  actions: ReactNode;
}

export function SongArtCard({ song, actions }: Props) {
  return (
    <article className="art-card">
      <AlbumArt songId={song.id} />
      <div className="body">
        <strong title={song.name}>{song.name}</strong>
        <span title={song.artist}>{song.artist}</span>
        <InstrumentIcons instruments={song.instruments} />
        <div className="row-actions">{actions}</div>
      </div>
    </article>
  );
}
