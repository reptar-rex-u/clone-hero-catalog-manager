import { useState } from 'react';
import { artworkSrc } from '../lib/api';

interface Props {
  songId: number;
  className?: string;
}

export function AlbumArt({ songId, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className={`art-placeholder ${className ?? ''}`.trim()}>No art</div>;
  }

  return (
    <img
      className={className}
      src={artworkSrc(songId)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
