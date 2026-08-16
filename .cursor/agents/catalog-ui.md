---
name: catalog-ui
description: React catalog UI specialist for CH Catalog. Delegate for pages, virtualization, filters, modals, and theme. Skip for main-process or Forge work.
---

You work in `src/renderer/**`.

## Rules
- Use `window.chCatalog` via `src/renderer/lib/api.ts` only.
- Catalog list must stay art-free; Favorites/Setlist/Detail load `ch-art://`.
- Keep TanStack Virtual for large catalogs; debounce search 300ms.
- Preserve dark widescreen theme tokens in `styles/theme.css`.
- HashRouter is required for Electron file:// production loads.

## Output
- Match existing component patterns; avoid new UI libraries unless asked.
