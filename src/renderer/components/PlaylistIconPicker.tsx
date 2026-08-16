import {
  DEFAULT_PLAYLIST_ICON,
  DEFAULT_PLAYLIST_ICON_COLOR,
  PLAYLIST_COLOR_PRESETS,
  PLAYLIST_ICON_PRESETS,
  isCustomPlaylistIcon,
} from '../../shared/playlistIcons';
import { api } from '../lib/api';
import { PlaylistIcon } from './PlaylistIcon';

interface Props {
  icon: string;
  iconColor: string;
  onChange: (icon: string, iconColor: string) => void;
}

export function PlaylistIconPicker({ icon, iconColor, onChange }: Props) {
  return (
    <div className="playlist-icon-picker">
      <PlaylistIcon
        icon={icon}
        iconColor={iconColor}
        className="playlist-tile-icon playlist-icon-preview"
      />
      <div className="playlist-icon-choices">
        {PLAYLIST_ICON_PRESETS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`playlist-emoji-btn${icon === emoji ? ' is-active' : ''}`}
            onClick={() => onChange(emoji, iconColor)}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="playlist-color-choices">
        {PLAYLIST_COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            className={`accent-swatch${iconColor === color ? ' is-active' : ''}`}
            style={{ background: color }}
            aria-label={color}
            onClick={() => onChange(icon, color)}
          />
        ))}
        <input
          type="color"
          className="accent-color-input"
          value={iconColor || DEFAULT_PLAYLIST_ICON_COLOR}
          title="Custom square color"
          onChange={(e) => onChange(icon, e.target.value)}
        />
      </div>
      <div className="playlist-icon-upload-row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            void api()
              .playlistsPickIconImage()
              .then((next) => {
                if (next) onChange(next, iconColor);
              });
          }}
        >
          Upload image…
        </button>
        {isCustomPlaylistIcon(icon) ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onChange(DEFAULT_PLAYLIST_ICON, iconColor)}
          >
            Clear image
          </button>
        ) : null}
      </div>
    </div>
  );
}
