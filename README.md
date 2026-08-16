# CH Catalog

Portable desktop app to browse, filter, and favorite songs from a local [Clone Hero](https://clonehero.net/) library.

**Version:** see `package.json` and [CHANGELOG.md](./CHANGELOG.md).

## Download

Windows users can download the latest `CH Catalog Setup.exe` from the
[Releases](../../releases) page. The installer includes the required SQLite
native module; users do not need Node.js or Visual Studio to run the installed
application.

## Runtime prerequisites

- Windows 10 or newer (64-bit)
- A Clone Hero Songs folder

## Stack

- Electron Forge + Vite + TypeScript
- React + React Router + TanStack Virtual
- SQLite (`better-sqlite3`, WAL)
- Typed IPC (no local HTTP server)

## Prerequisites (development)

- Node.js 20+ (Node 24 is fine)
- Visual Studio Build Tools with **Desktop development with C++** (for `better-sqlite3`)

## Setup

```bash
npm install
npx electron-rebuild -f -w better-sqlite3
npm start
```

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Dev app (Forge + Vite) |
| `npm run package` | Package without installer |
| `npm run make` | Build Windows `.exe` installer — see [make-installer.md](./make-installer.md) |
| `npm run rebuild:native` | Rebuild `better-sqlite3` for this Electron ABI |
| `npm run build:icon` | Rebuild `assets/icon.ico` from `assets/icon.png` |
| `npm run lint` | ESLint |

## First run

1. Open **Settings**
2. Choose your Clone Hero **Songs** folder
3. Save (scan starts automatically) or click **Rescan library**

## Features

- Recursive library scan + live folder watching (including nested / dot-prefixed group folders like `.1 CharterName`)
- Metadata from `song.ini`; instruments from `notes.chart` / `notes.mid`
- Instruments: Guitar, Bass, Rhythm, Guitar Coop, Keys, Drums, Vocals (no 6-fret/GHL)
- Instrument icons everywhere: amber = available, red = Expert only, dim = not charted
- Catalog filters: decade (80's / 90's / 2000's…), genre, charter, instrument + inline icons per row
- Lyrics / video presence flags
- Settings: Songs folder, accent color, rescan, export skipped-songs log, export/import settings (accent color, favorites & playlists)
- Virtualized catalog (no album art on the main list)
- Favorites + temporary setlist (setlist clears on quit)
- 30s song preview from `song.*` audio (falls back to `guitar.*` / other stems), starting at `preview_start_time` from song.ini or chart
- Custom playlists with sidebar icon tiles (emoji, color square, or uploaded image; name under icon); edit icon on playlist page; included in settings export/import

## Project layout

```text
src/main/       Electron main: DB, scanner, IPC
src/preload/    contextBridge API
src/renderer/   React UI
src/shared/     Shared TypeScript types
```

## Cursor subagents

Specialists live in `.cursor/agents/`:

| Agent | Use for |
|---|---|
| `electron-main` | IPC, window, settings, protocols |
| `song-indexer` | Parsers, scan/watch, SQLite song data |
| `catalog-ui` | React pages, virtualization, theme |
| `forge-packaging` | Installers and native module packaging |

See `.cursor/rules/subagent-delegation.mdc` for when to delegate.

## Packaging notes

Forge’s Vite plugin packs only `.vite` by default, so `better-sqlite3` (left external in `vite.main.config.ts`) would be missing from `app.asar`. `forge.config.ts` allowlists that package; `AutoUnpackNativesPlugin` puts `*.node` in `app.asar.unpacked`. Rebuild the native module before `npm run make`. Catalog SQLite files stay in `userData`, not in the asar.

## Data locations

- Settings + SQLite DB: Electron `userData` (Windows: `%APPDATA%\CH Catalog\`)
  - Catalog DB: `catalog.sqlite` (+ `-wal` / `-shm` while open)
  - On SQLITE_CORRUPT the app backs up those files under `corrupt-backups\`, recreates an empty DB, and rescans
- Songs remain in your Clone Hero Songs folder
