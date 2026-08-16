# Make a Windows installer

Do this on the **Windows** machine that has Node 20+ and VS C++ Build Tools installed.

## Steps

1. Open a terminal in the project folder (`CH-Catalog`).
2. Install deps and rebuild the native SQLite module:

```bash
npm install
npx electron-rebuild -f -w better-sqlite3
```

3. Build the installer:

```bash
npm run make
```

4. Find the installer under:

```text
out\make\squirrel.windows\x64\
```

Share the `.exe` Setup file from that folder (not the whole `out` tree).

## Notes

- Close the running app before `npm run make`.
- Forge Vite excludes `node_modules` unless `packagerConfig.ignore` allowlists `better-sqlite3` (including N-API `prebuilds/*.node`). After `npm run package`, confirm `node_modules/better-sqlite3` is in `resources\app.asar` and `*.node` is under `resources\app.asar.unpacked`.
- `npx electron-rebuild -f -w better-sqlite3` is still recommended; v13 may skip compiling when npm prebuilds exist (N-API).
- Bump `version` in `package.json` before a release if you want the installer to show a new version.
- Recipients only need the Setup `.exe`. After install they set **Songs folder** and **Clone Hero.exe** in Settings.
- Catalog data (favorites, settings, DB) lives in the user’s AppData — reinstall does not wipe Songs on disk. Export favorites first if they need to restore them.
- Installed process name is **CHCatalog** (not Electron). Dev (`npm start`) still shows as Electron — that is normal.
- App icon: black + amber music note (`assets/icon.ico`). Regenerate with `npm run build:icon` if you change `assets/icon.png`.
