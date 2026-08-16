export type InstrumentName =
  | 'Guitar'
  | 'Bass'
  | 'Rhythm'
  | 'GuitarCoop'
  | 'Keys'
  | 'Drums'
  | 'Vocals';

export interface DifficultyFlags {
  easy: boolean;
  medium: boolean;
  hard: boolean;
  expert: boolean;
}

export interface InstrumentInfo {
  instrument: InstrumentName;
  difficulties: DifficultyFlags;
  expertOnly: boolean;
}

export interface SongListItem {
  id: number;
  folderPath: string;
  name: string;
  artist: string;
  album: string;
  charter: string;
  genre: string;
  year: string;
  lengthMs: number | null;
  /** Preview offset from song.ini / chart (ms). Null = start of file. */
  previewStartMs: number | null;
  isFavorite: boolean;
  hasLyrics: boolean;
  hasVideo: boolean;
  /** True when a `song.*` audio file exists in the folder. */
  hasAudio: boolean;
  instruments: InstrumentInfo[];
}

export interface SongDetail extends SongListItem {
  artworkUrl: string | null;
}

export interface SongSearchParams {
  query?: string;
  genre?: string;
  charter?: string;
  /** Decade start year as string, e.g. "1990" for 90's. */
  decade?: string;
  instrument?: InstrumentName;
  favoritesOnly?: boolean;
  offset?: number;
  limit?: number;
}

export interface SongSearchResult {
  items: SongListItem[];
  total: number;
}

export interface AppSettings {
  songsDirectory: string;
  /** Hex accent color, e.g. #3ecf8e */
  accentColor: string;
  /** Optional path to the Bridge executable. */
  bridgePath: string;
  /** Optional path to the Clone Hero executable. */
  cloneHeroPath: string;
}

export type ExecutableTarget = 'bridge' | 'cloneHero';

export interface LaunchExecutableResult {
  ok: boolean;
  error?: string;
}

export interface LibraryStatus {
  scanning: boolean;
  watchedPath: string | null;
  songCount: number;
  scanned: number;
  scanTotal: number;
  skippedCount: number;
  lastError: string | null;
}

export interface FilterOptions {
  decades: Array<{ value: string; label: string }>;
  genres: string[];
  charters: string[];
}

export interface PlaylistSummary {
  id: number;
  name: string;
  icon: string;
  iconColor: string;
  songCount: number;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  icon: string;
  iconColor: string;
  songs: SongListItem[];
}

export interface ChCatalogApi {
  settingsGet: () => Promise<AppSettings>;
  settingsSet: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  pickExecutable: () => Promise<string | null>;
  launchBridge: () => Promise<LaunchExecutableResult>;
  launchCloneHero: () => Promise<LaunchExecutableResult>;
  songsSearch: (params: SongSearchParams) => Promise<SongSearchResult>;
  songsGetDetail: (id: number) => Promise<SongDetail | null>;
  songsToggleFavorite: (id: number) => Promise<boolean>;
  songsFilterOptions: () => Promise<FilterOptions>;
  setlistGet: () => Promise<SongListItem[]>;
  setlistAdd: (id: number) => Promise<SongListItem[]>;
  setlistRemove: (id: number) => Promise<SongListItem[]>;
  setlistClear: () => Promise<void>;
  playlistsList: () => Promise<PlaylistSummary[]>;
  playlistsGet: (id: number) => Promise<PlaylistDetail | null>;
  playlistsCreate: (
    name: string,
    options?: { icon?: string; iconColor?: string },
  ) => Promise<PlaylistSummary>;
  playlistsRename: (id: number, name: string) => Promise<boolean>;
  playlistsUpdateIcon: (
    id: number,
    icon: string,
    iconColor: string,
  ) => Promise<boolean>;
  /** Open file dialog; copies image into userData and returns `img:<file>` or null. */
  playlistsPickIconImage: () => Promise<string | null>;
  playlistsDelete: (id: number) => Promise<boolean>;
  playlistsAddSong: (
    playlistId: number,
    songId: number,
  ) => Promise<{ ok: boolean; alreadyInPlaylist?: boolean }>;
  playlistsRemoveSong: (playlistId: number, songId: number) => Promise<boolean>;
  libraryRescan: () => Promise<LibraryStatus>;
  libraryStatus: () => Promise<LibraryStatus>;
  libraryExportSkipped: () => Promise<{
    ok: boolean;
    path?: string;
    canceled?: boolean;
    error?: string;
    count: number;
  }>;
  favoritesExport: () => Promise<{
    ok: boolean;
    path?: string;
    canceled?: boolean;
    error?: string;
    count: number;
    playlistCount: number;
  }>;
  favoritesImport: () => Promise<{
    ok: boolean;
    canceled?: boolean;
    error?: string;
    matched: number;
    missing: number;
    total: number;
    playlistsImported: number;
    accentColor?: string;
  }>;
  pickDirectory: () => Promise<string | null>;
  onLibraryStatus: (cb: (status: LibraryStatus) => void) => () => void;
}

declare global {
  interface Window {
    chCatalog: ChCatalogApi;
  }
}

export {};
