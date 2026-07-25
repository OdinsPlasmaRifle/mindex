# Mindex

Desktop application for indexing and browsing a local media collection. Built with Electron, React, and SQLite.

Import directories of comics organised by series folders and browse them with search, sorting, favourites, tags, and volume/chapter drill-down.

## Library layout

**The directory and file structure is strict in the current version of this project.** The scanner derives everything from names, so folders and files must match these patterns:

```
<source directory>/
  Series Name (Author)/
    Series Name Icon.jpg          # optional cover art
    Series Name Vol. 01/
      Series Name Vol. 01.cbz     # optional whole-volume file
      Series Name Ch. 01.cbz
      Series Name Ch. 02a.cbz     # trailing letter = increment
      Series Name Extra 01.cbz
```

- A series folder must end with `(Author)` — anything else is skipped.
- Cover art is the first image in the series folder whose name contains `icon` or `cover`; failing that, the first image of any name.
- A volume folder must contain `Vol. <number>`.
- Chapter files must be `.cbz` and contain `Ch. <number>` (optionally followed by a letter) or `Extra <number>`.
- A `.cbz` with `Vol. <number>` and no `Ch.`/`Extra` is treated as the whole-volume file.

Comic paths are stored relative to their source directory, so moving a whole library only requires repointing the source (Edit Library → Update).

## Prerequisites

- [Node.js](https://nodejs.org/) — **v22 LTS recommended.** v20 works but prints `EBADENGINE` warnings, because `electron-builder@26` pulls `@electron/rebuild@4`, which requires Node ≥22.12.
- npm (included with Node.js)
- Native build tools, to compile `better-sqlite3` for Electron:
  - **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with the "Desktop development with C++" workload, plus [Python 3](https://www.python.org/downloads/). (The old `windows-build-tools` npm package is deprecated — don't use it.)
  - **Linux:** `build-essential`, `python3`
- `git` must be on `PATH`. One transitive dependency (`@electron/node-gyp`) is fetched from GitHub rather than the registry.

## Development

Install dependencies:

```sh
npm ci
```

Use `npm ci` rather than `npm install` — it installs exactly what `package-lock.json` pins and never rewrites it. **Do not run `npm install --save-dev electron-builder`**: it is already a devDependency, and re-adding it silently drifts the lockfile's pinned versions (see [Troubleshooting](#troubleshooting)).

Either command runs a `postinstall` step that rebuilds `better-sqlite3` for Electron automatically.

Start the app in development mode with hot reload:

```sh
npm run dev
```

On Linux, `npm run dev:quiet` filters out the `Fontconfig warning:` noise Chromium emits on start. It uses `grep`, so it is Linux/macOS only — and the warnings only occur on Linux anyway.

Build the app (main, preload, and renderer) without packaging:

```sh
npm run build
```

Type-check without emitting:

```sh
npx tsc --noEmit -p tsconfig.node.json   # main + preload
npx tsc --noEmit -p tsconfig.web.json    # renderer
```

Preview/launch the built app locally:

```sh
npm start
```

## Project structure

```
src/
  main/              Electron main process (Node)
    ipc.ts           IPC wiring only — delegates to the modules below
    scan.ts          Filesystem scanning: folder/file name parsing, import, refresh
    comics.ts        Comic/volume/chapter queries, sorting, favourites
    library.ts       Libraries and their sources
    tags.ts          Tag CRUD and attach/detach at comic, volume or chapter level
    hiddenContent.ts Hidden-content enable/reveal state and PIN verification
    backup.ts        Backup export/import
    db.ts            SQLite schema and migrations
    index.ts         App entry, window creation, application menu
  preload/           contextBridge API exposed to the renderer
  renderer/src/
    pages/           One component per route
    components/      Shared UI, including icons.tsx (all SVG paths live here)
    lib/             api.ts (typed IPC surface), ipcEvents.ts, useHiddenContent.ts
```

Two conventions worth knowing:

- **All SVG paths live in `components/icons.tsx`.** Don't inline new ones at call sites.
- **Subscribe to main-process events through `lib/ipcEvents.ts`, not `api.on*` directly.** It multiplexes one `ipcRenderer` listener per channel across any number of components. Subscribing directly adds a listener per component instance, which trips Node's 10-listener warning on pages that render many `TagPool`s.

## Backups

Settings → Data → Export Backup writes a single `.mndx.bkp` file containing all libraries, comics, tags, favourites, settings, and library cover images. Source media files on disk are **not** included.

- Backups are **not encrypted** — anyone with the file can read its contents.
- The hidden-content PIN is deliberately excluded, and stays on the device that set it.
- Importing **replaces all current data**. The local PIN is preserved across an import.
- Older `.mindex` backups still import.

## Production

Packaging uses [electron-builder](https://www.electron.build/), already included as a devDependency — no extra install step is needed.

### Windows

```sh
npm run package:win
```

Produces an NSIS installer (`.exe`) in `dist/`. Cross-compiling from Linux requires [Wine](https://www.winehq.org/).

### Linux

```sh
npm run package:linux
```

Produces an AppImage and `.deb` in `dist/`.

Output formats, icons, and other options are configured in `electron-builder.yml` — see the [electron-builder docs](https://www.electron.build/configuration).

## Troubleshooting

### `'electron-builder' is not recognized` (Windows)

npm scripts run with `node_modules\.bin` on `PATH`, so this means the shim wasn't created. On Windows, npm's `bin-links` **silently skips** creating a `.cmd` shim when the target file isn't present at link time — the install reports success with no shim. Check which case you're in:

```bat
dir node_modules\electron-builder\cli.js
dir node_modules\.bin\electron-builder*
```

- **Package present, shim missing** → `npm rebuild` recreates bin links (`bin-links` defaults to true).
- **Package missing** → devDependencies were skipped. Check `npm config get omit` and `echo %NODE_ENV%`; a `NODE_ENV=production` in the environment makes npm omit them. Then `npm ci --include=dev`.
- **To unblock immediately**, bypass the shim: `npm run build && npx electron-builder --win`

### `npm error code ERR_INVALID_ARG_TYPE` — `The "from" argument must be of type string. Received undefined`

This is **not** the real error. npm's install-rollback handler (`@npmcli/arborist`, `reify.js` → `_rollbackMoveBackRetiredUnchanged`) calls `path.relative()` with an undefined first argument and crashes, which discards the original error before it can be reported.

That rollback only runs when npm is modifying an *existing* `node_modules`, so:

```bat
rmdir /s /q node_modules
npm ci
```

`npm ci` empties `node_modules` before installing, so nothing is "retired" and the broken rollback has nothing to walk — it both avoids the crash and lets the real error surface if something else is genuinely wrong. Use `npm ci --foreground-scripts --loglevel=silly` for full output.

On Windows, also exclude the project folder from Defender and keep it out of OneDrive; file locks during `node_modules` renames are a common trigger for that rollback path.

### `npm warn EBADENGINE` for `@electron/rebuild` / `node-abi`

Expected on Node 20 — see [Prerequisites](#prerequisites). Warnings only: the root `@electron/rebuild@3.7.2` that `postinstall` invokes supports Node ≥12.13. Move to Node 22 LTS to clear them.

### `Fontconfig warning: ... invalid attribute 'xsi:nil'` (Linux)

Not caused by this project — a bare Electron app emits ~90 of these. Chromium's font initialisation reads Arch's fontconfig 2.18 config files, which use syntax it complains about. Harmless; use `npm run dev:quiet` to hide it.

### "Read" does nothing when opening a comic

The app reports open failures as a toast. If it says the file wasn't found, the folder was renamed or moved since the last scan — use Edit Library → Refresh, or Update to repoint the source. If nothing launches at all, no application is associated with `.cbz` on the system:

```sh
xdg-mime query default application/zip   # Linux
```
