# Mindex

Desktop application for indexing and browsing a local media collection. Built with Electron, React, and SQLite.

## Library layout

**The directory and file structure is strict in the current version of this project.** The scanner derives everything from names:

```
<source directory>/
  Series Name (Author)/
    Series Name Icon.jpg          # optional cover art
    Series Name Vol. 01/
      Series Name Vol. 01.cbz     # optional whole-volume file
      Series Name Ch. 01.cbz
      Series Name Extra 01.cbz
```

## Prerequisites

- [Node.js](https://nodejs.org/) v22 LTS (v20 works, but warns on install)
- Native build tools, to compile `better-sqlite3` for Electron:
  - **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with the "Desktop development with C++" workload, plus [Python 3](https://www.python.org/downloads/)
  - **Linux:** `build-essential`, `python3`
- `git` on `PATH`

## Development

Install dependencies. This also runs a `postinstall` step that rebuilds `better-sqlite3` for Electron:

```sh
npm ci --include=dev
```

Start the app in development mode with hot reload:

```sh
npm run dev
```

Build the app (main, preload, and renderer) without packaging:

```sh
npm run build
```

Launch the built app locally:

```sh
npm start
```

## Production

Install dependencies, including dev — `electron-builder` is a devDependency and packaging fails without it:

```sh
npm ci --include=dev
```

### Windows

```sh
npm run package:win
```

Produces an NSIS installer (`.exe`) in the `dist/` directory. Packaging from Linux for Windows requires [Wine](https://www.winehq.org/).

### Linux

```sh
npm run package:linux
```

Produces an AppImage and `.deb` package in the `dist/` directory.

---

Output formats, icons, and other options are configured in `electron-builder.yml` — see the [electron-builder docs](https://www.electron.build/configuration).

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
