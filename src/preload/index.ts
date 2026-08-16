import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  AppSettings,
  ChCatalogApi,
  LibraryStatus,
  SongSearchParams,
} from '../shared/types';

const api: ChCatalogApi = {
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSet: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:set', settings),
  pickExecutable: () => ipcRenderer.invoke('dialog:pickExecutable'),
  launchBridge: () => ipcRenderer.invoke('executable:launchBridge'),
  launchCloneHero: () => ipcRenderer.invoke('executable:launchCloneHero'),
  songsSearch: (params: SongSearchParams) =>
    ipcRenderer.invoke('songs:search', params),
  songsGetDetail: (id: number) => ipcRenderer.invoke('songs:getDetail', id),
  songsToggleFavorite: (id: number) =>
    ipcRenderer.invoke('songs:toggleFavorite', id),
  songsFilterOptions: () => ipcRenderer.invoke('songs:filterOptions'),
  setlistGet: () => ipcRenderer.invoke('setlist:get'),
  setlistAdd: (id: number) => ipcRenderer.invoke('setlist:add', id),
  setlistRemove: (id: number) => ipcRenderer.invoke('setlist:remove', id),
  setlistClear: () => ipcRenderer.invoke('setlist:clear'),
  libraryRescan: () => ipcRenderer.invoke('library:rescan'),
  libraryStatus: () => ipcRenderer.invoke('library:status'),
  libraryExportSkipped: () => ipcRenderer.invoke('library:exportSkipped'),
  favoritesExport: () => ipcRenderer.invoke('favorites:export'),
  favoritesImport: () => ipcRenderer.invoke('favorites:import'),
  playlistsList: () => ipcRenderer.invoke('playlists:list'),
  playlistsGet: (id: number) => ipcRenderer.invoke('playlists:get', id),
  playlistsCreate: (
    name: string,
    options?: { icon?: string; iconColor?: string },
  ) => ipcRenderer.invoke('playlists:create', name, options),
  playlistsRename: (id: number, name: string) =>
    ipcRenderer.invoke('playlists:rename', id, name),
  playlistsUpdateIcon: (id: number, icon: string, iconColor: string) =>
    ipcRenderer.invoke('playlists:updateIcon', id, icon, iconColor),
  playlistsPickIconImage: () =>
    ipcRenderer.invoke('playlists:pickIconImage'),
  playlistsDelete: (id: number) => ipcRenderer.invoke('playlists:delete', id),
  playlistsAddSong: (playlistId: number, songId: number) =>
    ipcRenderer.invoke('playlists:addSong', playlistId, songId),
  playlistsRemoveSong: (playlistId: number, songId: number) =>
    ipcRenderer.invoke('playlists:removeSong', playlistId, songId),
  pickDirectory: () => ipcRenderer.invoke('dialog:pickDirectory'),
  onLibraryStatus: (cb) => {
    const listener = (_event: IpcRendererEvent, status: LibraryStatus) => cb(status);
    ipcRenderer.on('library:statusChanged', listener);
    return () => ipcRenderer.removeListener('library:statusChanged', listener);
  },
};

contextBridge.exposeInMainWorld('chCatalog', api);
