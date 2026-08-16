import { useEffect, useState } from 'react';
import {
  DEFAULT_PLAYLIST_ICON,
  DEFAULT_PLAYLIST_ICON_COLOR,
} from '../../shared/playlistIcons';
import { PlaylistIcon } from './PlaylistIcon';
import { PlaylistIconPicker } from './PlaylistIconPicker';
import { api } from '../lib/api';
import { usePlaylists } from '../lib/PlaylistContext';

interface Props {
  songId: number | null;
  songName?: string;
  onClose: () => void;
}

export function AddToPlaylistModal({ songId, songName, onClose }: Props) {
  const { playlists, refreshPlaylists } = usePlaylists();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_PLAYLIST_ICON);
  const [iconColor, setIconColor] = useState(DEFAULT_PLAYLIST_ICON_COLOR);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (songId != null) {
      setCreating(false);
      setNewName('');
      setIcon(DEFAULT_PLAYLIST_ICON);
      setIconColor(DEFAULT_PLAYLIST_ICON_COLOR);
      setMessage('');
      void refreshPlaylists();
    }
  }, [songId, refreshPlaylists]);

  if (songId == null) return null;

  const addTo = async (playlistId: number) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api().playlistsAddSong(playlistId, songId);
      await refreshPlaylists();
      if (!result.ok) {
        setMessage('Could not add song.');
        return;
      }
      if (result.alreadyInPlaylist) {
        setMessage('Already in that playlist.');
        return;
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setMessage('Enter a playlist name.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const created = await api().playlistsCreate(name, { icon, iconColor });
      await api().playlistsAddSong(created.id, songId);
      await refreshPlaylists();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Add to playlist"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Add to playlist</h2>
        {songName ? <p className="modal-subtitle">{songName}</p> : null}

        {!creating ? (
          <>
            <div className="playlist-pick-list">
              {playlists.length === 0 ? (
                <p className="empty-inline">No playlists yet.</p>
              ) : (
                playlists.map((p) => (
                  <button
                    key={p.id}
                    className="btn playlist-pick-item"
                    type="button"
                    disabled={busy}
                    onClick={() => void addTo(p.id)}
                  >
                    <span className="playlist-pick-left">
                      <PlaylistIcon
                        icon={p.icon}
                        iconColor={p.iconColor}
                        className="playlist-pick-icon"
                      />
                      <span>{p.name}</span>
                    </span>
                    <span className="meta">{p.songCount}</span>
                  </button>
                ))
              )}
            </div>
            <div className="row-actions" style={{ marginTop: 14 }}>
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy}
                onClick={() => setCreating(true)}
              >
                New playlist…
              </button>
              <button className="btn btn-ghost" type="button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="field-label" htmlFor="new-playlist-name">
              Playlist name
            </label>
            <input
              id="new-playlist-name"
              className="search-input"
              value={newName}
              autoFocus
              placeholder="My playlist"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void createAndAdd();
              }}
            />
            <label className="field-label" style={{ marginTop: 12 }}>
              Icon
            </label>
            <PlaylistIconPicker
              icon={icon}
              iconColor={iconColor}
              onChange={(nextIcon, nextColor) => {
                setIcon(nextIcon);
                setIconColor(nextColor);
              }}
            />
            <div className="row-actions" style={{ marginTop: 14 }}>
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy}
                onClick={() => void createAndAdd()}
              >
                Create & add
              </button>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => {
                  setCreating(false);
                  setMessage('');
                }}
              >
                Back
              </button>
            </div>
          </>
        )}
        {message ? (
          <p className="status-chip" style={{ marginTop: 12 }}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
