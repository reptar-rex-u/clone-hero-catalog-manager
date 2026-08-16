# Changelog

All notable changes to **CH Catalog** are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Canonical version: `package.json`.

## [1.0.1] - 2026-08-16

### Added

- Bridge and Clone Hero executable settings with native `.exe` pickers
- Sidebar launch buttons for Clone Hero and Bridge
- Bridge launch action after filtered searches, including zero-result searches

### Fixed

- Windows installer includes `better-sqlite3` (Forge Vite was packing only `.vite`, so the installed app crashed with `Cannot find module 'better-sqlite3'`)

## [1.0.0] - 2026-08-09

### Added

- Initial portable Electron desktop catalog for local Clone Hero libraries
- Recursive scan + live folder watching (including nested / dot-prefixed group folders)
- SQLite catalog (WAL) with filters: decade, genre, charter, instrument
- Instrument icons (Guitar, Bass, Rhythm, Guitar Coop, Keys, Drums, Vocals): amber / expert-only red / dim
- Lyrics and video presence flags; favorites and session setlist
- Custom playlists with sidebar icon tiles; settings export/import
- 30s song preview from chart audio stems
- Virtualized catalog UI (no album art on the main list)
