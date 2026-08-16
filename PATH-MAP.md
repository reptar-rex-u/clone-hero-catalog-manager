# PATH-MAP — CH-Catalog

## Identity

- Root: `R:\RexApps\5. Windows Apps\CH-Catalog`
- Type: Electron / React / TypeScript Windows desktop app
- No local HTTP service

## Connections

| ID | Kind | Value / contract | Defined in | Also update |
|---|---|---|---|---|
| `chcatalog.songs` | disk | User-selected Clone Hero Songs folder | Settings UI | README |
| `chcatalog.db` | storage | `%APPDATA%\CH Catalog\catalog.sqlite` plus WAL/SHM files | Electron userData | backup/recovery docs |
| `chcatalog.settings` | storage | Electron userData settings and playlist exports | Settings / IPC | README |
| `chcatalog.clonehero` | contract | Reads `song.ini`, `notes.chart`, `notes.mid`, and song audio | scanner/parsers | Clone Hero workflow docs |
| `consumer.hero2lrc` | handoff | Shares Clone Hero song/chart material with Hero2lrc | project workflow | Hero2lrc PATH-MAP |

## Change checklists

### When the song format or database schema changes

1. Update scanner/parser code and migration behavior.
2. Test a fresh scan and existing database recovery.
3. Update this map, README, and CHANGELOG.
