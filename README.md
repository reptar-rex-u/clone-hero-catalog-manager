# CH Catalog

Portable desktop app to browse, filter, and favorite songs from a local [Clone Hero](https://clonehero.net/) library.

Bro Summary:
Clone Hero Song Catalog - When you get a large library, its hard to remember what you have. 
This program lists all your songs, instruments available and difficulties per instrument (see pics at end).
Preview songs, add to setlist or create custom playlists. Does not interact with Clone Hero.
Colors are customizable. Just tell it where your songs are, scan, and enjoy. It even tells you which songs
have lyrics and video. I'll add a button to open Bridge later so if you dont have it, you can search if it
is available for download and get it.

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

Main Page:
<img width="2560" height="1375" alt="main-catalog" src="https://github.com/user-attachments/assets/3b676c64-5941-4e4b-96d3-702bc710c7e2" />

Playlists, Favorites, Setlist:
<img width="2560" height="813" alt="favs" src="https://github.com/user-attachments/assets/b9c6f964-2c0f-4ee7-8159-1afd9a9d727c" />
<img width="2560" height="820" alt="setlist" src="https://github.com/user-attachments/assets/9c1083a1-5333-46aa-b506-a89a3fc81199" />
<img width="2560" height="834" alt="playlist-2" src="https://github.com/user-attachments/assets/48d6d6d3-b56a-4219-8235-9a36cdcd3fa8" />
<img width="2560" height="836" alt="playlist-1" src="https://github.com/user-attachments/assets/98363390-dbfe-473f-8339-809b14ff6046" />

Playlist Editor:
<img width="641" height="941" alt="playlist-editor" src="https://github.com/user-attachments/assets/0ac83ffe-97e3-4e5e-a38e-8bf46b537173" />

Instruments w/Difficulty on Hover:
<img width="2198" height="193" alt="instruments" src="https://github.com/user-attachments/assets/11ca9bf0-5728-44a7-9ef0-71abb3a46f23" />
<img width="2196" height="403" alt="difficulty-on-hover" src="https://github.com/user-attachments/assets/0a40ad12-a0d3-49e2-899f-8ff740b91bfa" />

Song Info:
<img width="1770" height="981" alt="song-info" src="https://github.com/user-attachments/assets/119de1bf-d581-4d36-8089-e086fdd700fd" />

Settings & Color Picker:
<img width="1297" height="817" alt="settings" src="https://github.com/user-attachments/assets/60ab4f77-b270-4336-9fee-cdaf93ccd384" />
<img width="1265" height="763" alt="color-picker" src="https://github.com/user-attachments/assets/ac9f114e-7e83-41cf-9826-73e3fb23e46e" />
