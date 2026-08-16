import { useCallback, useEffect, useMemo, useState } from 'react';
import { ALL_INSTRUMENTS, INSTRUMENT_LABELS } from '../../shared/instruments';
import type {
  FilterOptions,
  InstrumentName,
  LibraryStatus,
  SongListItem,
} from '../../shared/types';
import { SongDetailModal } from '../components/SongDetailModal';
import { SongGrid } from '../components/SongGrid';
import { api } from '../lib/api';
import { usePreview } from '../lib/PreviewContext';

export function CatalogPage() {
  const { playingId, stopPreview } = usePreview();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [decade, setDecade] = useState('');
  const [genre, setGenre] = useState('');
  const [charter, setCharter] = useState('');
  const [instrument, setInstrument] = useState<InstrumentName | ''>('');
  const [songs, setSongs] = useState<SongListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    decades: [],
    genres: [],
    charters: [],
  });
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    const result = await api().songsSearch({
      query: debounced,
      decade: decade || undefined,
      genre: genre || undefined,
      charter: charter || undefined,
      instrument: instrument || undefined,
      offset: 0,
      limit: 5000,
    });
    setSongs(result.items);
    setTotal(result.total);
  }, [debounced, decade, genre, charter, instrument]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void api().songsFilterOptions().then(setFilters);
    void api().libraryStatus().then((s) => {
      setStatus(s);
      if (!s.scanning) void load();
    });
    let wasScanning = false;
    return api().onLibraryStatus((s) => {
      setStatus(s);
      if (wasScanning && !s.scanning) {
        void load();
        void api().songsFilterOptions().then(setFilters);
      }
      wasScanning = s.scanning;
    });
  }, [load]);

  const statusText = useMemo(() => {
    if (!status) return '';
    if (status.scanning) {
      if (status.scanTotal > 0) {
        return `Scanning… ${status.scanned.toLocaleString()}/${status.scanTotal.toLocaleString()}`;
      }
      return 'Scanning…';
    }
    return `${total.toLocaleString()} songs`;
  }, [status, total]);

  const hasActiveFilters = Boolean(
    query || decade || genre || charter || instrument,
  );

  const clearFilters = () => {
    setQuery('');
    setDebounced('');
    setDecade('');
    setGenre('');
    setCharter('');
    setInstrument('');
  };

  return (
    <div className="main">
      <div className="topbar">
        <input
          className="search-input"
          placeholder="Search title, artist, album, charter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filters">
          <select
            className="select-input"
            value={decade}
            onChange={(e) => setDecade(e.target.value)}
          >
            <option value="">Decade</option>
            {filters.decades.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            className="select-input"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">Genre</option>
            {filters.genres.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="select-input"
            value={charter}
            onChange={(e) => setCharter(e.target.value)}
          >
            <option value="">Charter</option>
            {filters.charters.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="select-input"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value as InstrumentName | '')}
          >
            <option value="">Instrument</option>
            {ALL_INSTRUMENTS.map((v) => (
              <option key={v} value={v}>
                {INSTRUMENT_LABELS[v]}
              </option>
            ))}
          </select>
          <button
            className="btn"
            type="button"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
            title="Clear search and filters"
          >
            Clear
          </button>
        </div>
        <div className="status-chip">{statusText}</div>
      </div>
      <div className="content">
        <div className="instrument-legend">
          <span className="swatch">
            <span className="dot available" /> Available
          </span>
          <span className="swatch">
            <span className="dot expert" /> Expert only
          </span>
          <span className="swatch">
            <span className="dot missing" /> Not charted
          </span>
          <button
            type="button"
            className={`btn btn-icon preview-btn legend-stop-btn${playingId != null ? ' is-playing' : ''}`}
            title="Stop preview"
            disabled={playingId == null}
            onClick={() => stopPreview()}
          >
            ■
          </button>
        </div>
        {songs.length === 0 ? (
          <div className="empty">
            No songs yet. Set your Songs folder in Settings, then rescan.
          </div>
        ) : (
          <SongGrid
            songs={songs}
            onOpen={setDetailId}
            onChanged={() => void load()}
          />
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
