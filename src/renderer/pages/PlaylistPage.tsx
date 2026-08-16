import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DEFAULT_PLAYLIST_ICON,
  DEFAULT_PLAYLIST_ICON_COLOR,
} from '../../shared/playlistIcons';
import type { SongListItem } from '../../shared/types';
import { PlaylistIcon } from '../components/PlaylistIcon';
import { PlaylistIconPicker } from '../components/PlaylistIconPicker';
import { PreviewButton } from '../components/PreviewButton';
import { SongArtCard } from '../components/SongArtCard';
import { SongDetailModal } from '../components/SongDetailModal';
import { api } from '../lib/api';
import { usePlaylists } from '../lib/PlaylistContext';

export function PlaylistPage() {
  const { playlistId } = useParams();
  const id = Number(playlistId);
  const navigate = useNavigate();
  const { refreshPlaylists } = usePlaylists();
  const [name, setName] = useState('');
  const [draftName, setDraftName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_PLAYLIST_ICON);
  const [iconColor, setIconColor] = useState(DEFAULT_PLAYLIST_ICON_COLOR);
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [editingIcon, setEditingIcon] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    const detail = await api().playlistsGet(id);
    if (!detail) {
      navigate('/');
      return;
    }
    setName(detail.name);
    setDraftName(detail.name);
    setIcon(detail.icon || DEFAULT_PLAYLIST_ICON);
    setIconColor(detail.iconColor || DEFAULT_PLAYLIST_ICON_COLOR);
    setSongs(detail.songs);
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRename = async () => {
    const next = draftName.trim();
    if (!next) {
      setMessage('Name cannot be empty.');
      return;
    }
    const ok = await api().playlistsRename(id, next);
    if (!ok) {
      setMessage('Could not rename playlist.');
      return;
    }
    setName(next);
    setRenaming(false);
    setMessage('');
    await refreshPlaylists();
  };

  const saveIcon = async (nextIcon: string, nextColor: string) => {
    setIcon(nextIcon);
    setIconColor(nextColor);
    await api().playlistsUpdateIcon(id, nextIcon, nextColor);
    await refreshPlaylists();
  };

  const removeSong = async (songId: number) => {
    await api().playlistsRemoveSong(id, songId);
    await load();
    await refreshPlaylists();
  };

  const deletePlaylist = async () => {
    const ok = window.confirm(
      `Delete playlist “${name}”? Songs stay in your library.`,
    );
    if (!ok) return;
    await api().playlistsDelete(id);
    await refreshPlaylists();
    navigate('/');
  };

  if (!Number.isFinite(id)) return null;

  return (
    <div className="main">
      <div className="content">
        <div className="page-header playlist-page-header">
          <div className="playlist-page-title">
            <PlaylistIcon icon={icon} iconColor={iconColor} />
            {renaming ? (
              <div className="playlist-rename-row">
                <input
                  className="search-input"
                  value={draftName}
                  autoFocus
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveRename();
                    if (e.key === 'Escape') {
                      setDraftName(name);
                      setRenaming(false);
                    }
                  }}
                />
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => void saveRename()}
                >
                  Save
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    setDraftName(name);
                    setRenaming(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1>{name}</h1>
            )}
          </div>
          <span className="status-chip">{songs.length} songs</span>
          <div className="row-actions">
            {!renaming && (
              <button
                className="btn"
                type="button"
                onClick={() => setRenaming(true)}
              >
                Rename
              </button>
            )}
            <button
              className="btn"
              type="button"
              onClick={() => setEditingIcon((v) => !v)}
            >
              {editingIcon ? 'Done icon' : 'Edit icon'}
            </button>
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => void deletePlaylist()}
            >
              Delete playlist
            </button>
          </div>
        </div>
        {editingIcon ? (
          <div className="playlist-icon-edit-panel">
            <PlaylistIconPicker
              icon={icon}
              iconColor={iconColor}
              onChange={(nextIcon, nextColor) => {
                void saveIcon(nextIcon, nextColor);
              }}
            />
          </div>
        ) : null}
        {message ? <p className="status-chip">{message}</p> : null}
        {songs.length === 0 ? (
          <div className="empty">
            No songs yet. Use + next to ★ in the catalog to add songs.
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
                      onClick={() => void removeSong(song.id)}
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
