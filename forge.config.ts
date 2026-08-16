import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';

const iconIco = path.resolve(__dirname, 'assets/icon.ico');

/**
 * @electron-forge/plugin-vite ignores everything except `/.vite` unless we set
 * packagerConfig.ignore ourselves. better-sqlite3 is a Vite external, so it
 * must be copied into the asar (native `.node` then unpacked by AutoUnpackNativesPlugin).
 *
 * v13 ships N-API `prebuilds/*.node` and loads those before `build/Release`.
 * Keep prebuilds; skip compile-only trees (src/deps/obj).
 */
function ignorePathForPackager(file: string): boolean {
  if (!file) return false;
  const p = file.replace(/\\/g, '/');
  if (p === '/package.json') return false;
  if (p.startsWith('/.vite')) return false;
  if (p === '/node_modules') return false;

  const sqlite = '/node_modules/better-sqlite3';
  if (p === sqlite || p.startsWith(`${sqlite}/`)) {
    if (p === `${sqlite}/deps` || p.startsWith(`${sqlite}/deps/`)) {
      return true;
    }
    if (p === `${sqlite}/src` || p.startsWith(`${sqlite}/src/`)) {
      return true;
    }
    if (p.includes('/obj/')) return true;
    return false;
  }

  return true;
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Vite plugin would otherwise omit node_modules; prune would then copy every
    // production dep if we only un-ignore /node_modules. Keep sqlite only.
    prune: false,
    ignore: ignorePathForPackager,
    // Product / window title; exe basename is set separately (no spaces)
    name: 'CH Catalog',
    executableName: 'CHCatalog',
    icon: path.resolve(__dirname, 'assets/icon'),
    extraResource: [iconIco],
  },
  rebuildConfig: {
    onlyModules: ['better-sqlite3'],
  },
  makers: [
    new MakerSquirrel({
      name: 'CHCatalog',
      setupIcon: iconIco,
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          // Output filename follows the entry basename (main.js / preload.js).
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
