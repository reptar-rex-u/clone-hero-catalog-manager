import {
  DEFAULT_PLAYLIST_ICON,
  DEFAULT_PLAYLIST_ICON_COLOR,
  playlistIconSrc,
} from '../../shared/playlistIcons';

interface Props {
  icon: string;
  iconColor: string;
  className?: string;
  title?: string;
}

export function PlaylistIcon({
  icon,
  iconColor,
  className = 'playlist-tile-icon',
  title,
}: Props) {
  const src = playlistIconSrc(icon);
  return (
    <span
      className={`${className}${src ? ' has-image' : ''}`}
      style={{ background: iconColor || DEFAULT_PLAYLIST_ICON_COLOR }}
      title={title}
      aria-hidden
    >
      {src ? (
        <img src={src} alt="" className="playlist-icon-img" draggable={false} />
      ) : (
        icon || DEFAULT_PLAYLIST_ICON
      )}
    </span>
  );
}
