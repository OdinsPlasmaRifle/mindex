import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { basename } from 'path'
import { pathToFileURL } from 'url'
import { exportBackup, importBackup } from './backup'
import {
  deleteComic,
  getComic,
  getComics,
  getRandomComicId,
  getVolume,
  toggleFavorite
} from './comics'
import {
  broadcastHiddenContentState,
  clearHiddenContentPin,
  getHiddenContentEnabled,
  getHiddenContentVisible,
  hasHiddenContentPin,
  pinFailureMessage,
  setHiddenContentEnabled,
  setHiddenContentPin,
  setHiddenContentVisible,
  verifyHiddenContentPin
} from './hiddenContent'
import {
  addSource,
  checkAllSourcesExist,
  checkLibrarySourcesExist,
  clearAllData,
  clearSource,
  createLibrary,
  deleteLibrary,
  getLibraries,
  getLibrary,
  getLibrarySources,
  getMissingSourcePaths,
  pickLibraryImage,
  pickSourceDirectory,
  refreshSource,
  updateLibrary,
  updateSourcePath
} from './library'
import { refreshComic } from './scan'
import { registerTagHandlers } from './tags'

// IPC wiring only. Each handler normalises its arguments and delegates to the
// module that owns the behaviour, so channel names stay in one place and the
// domain logic stays readable without Electron in the way.

/** Notifies every window, not just the sender — other windows show the same data. */
function broadcast(...channels: string[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    for (const channel of channels) win.webContents.send(channel)
  }
}

function registerComicHandlers(): void {
  ipcMain.handle(
    'get-comics',
    (
      _event,
      libraryId: number,
      page: number,
      search: string,
      pageSize: number = 20,
      favoritesOnly: boolean = false,
      includedTagIds: number[] = [],
      excludedTagIds: number[] = [],
      sortBy: string = 'name',
      sortDir: string = 'asc'
    ) =>
      getComics({
        libraryId,
        page,
        search,
        pageSize,
        favoritesOnly,
        includedTagIds,
        excludedTagIds,
        sortBy,
        sortDir
      })
  )

  ipcMain.handle('get-random-comic', (_event, libraryId: number) => getRandomComicId(libraryId))

  ipcMain.handle('get-comic', (_event, id: number) => getComic(id))

  ipcMain.handle('get-volume', (_event, id: number) => getVolume(id))

  ipcMain.handle('refresh-comic', (_event, id: number) => refreshComic(id))

  ipcMain.handle('delete-comic', (event, id: number) => {
    const deleted = deleteComic(id)
    if (deleted) event.sender.send('comics-updated')
    return deleted
  })

  ipcMain.handle('toggle-favorite', (_event, id: number) => toggleFavorite('comic', id))
  ipcMain.handle('toggle-volume-favorite', (_event, id: number) => toggleFavorite('volume', id))
  ipcMain.handle('toggle-chapter-favorite', (_event, id: number) => toggleFavorite('chapter', id))

  ipcMain.handle('open-file', async (_event, filePath: string) => {
    if (!filePath) return { error: 'No file path recorded — try refreshing the comic.' }

    // Catch a stale or mismatched path before handing it to the OS, which fails
    // silently. A missing file usually means the folder was renamed or moved
    // since the last scan.
    if (!existsSync(filePath)) {
      console.error('open-file: path does not exist:', filePath)
      return { error: `File not found on disk: ${basename(filePath)}` }
    }

    try {
      // openPath takes a raw filesystem path, so nothing needs escaping. Building
      // a file:// URI by interpolation instead silently corrupts any name
      // containing '#', '?' or '%' — the URI parser reads them as a fragment,
      // query, or percent-escape and the path never reaches the handler.
      const openPathError = await shell.openPath(filePath)
      if (!openPathError) return { success: true }

      // Fall back to a file:// URI — more reliable on some Linux desktops. Built
      // via pathToFileURL so every reserved character is encoded properly.
      await shell.openExternal(pathToFileURL(filePath).href)
      return { success: true }
    } catch (err) {
      console.error('open-file failed for', filePath, err)
      return { error: String(err) }
    }
  })
}

function registerHiddenContentHandlers(): void {
  ipcMain.handle('get-hidden-content-enabled', () => getHiddenContentEnabled())

  ipcMain.handle('set-hidden-content-enabled', (_event, enabled: boolean) => {
    setHiddenContentEnabled(enabled)
    broadcastHiddenContentState()
  })

  ipcMain.handle('get-hidden-content-visible', () => getHiddenContentVisible())

  ipcMain.handle('set-hidden-content-visible', (_event, visible: boolean, pin?: string) => {
    // Concealing never requires a PIN; revealing does when one is configured.
    if (visible && hasHiddenContentPin() && !verifyHiddenContentPin(pin)) {
      return { ok: false, error: 'Incorrect PIN.' }
    }
    setHiddenContentVisible(visible)
    broadcastHiddenContentState()
    return { ok: true }
  })

  ipcMain.handle('has-hidden-content-pin', () => hasHiddenContentPin())

  // Used to gate the first step of the change-PIN flow. Shares the same
  // lockout counter as every other check, so it is not a free oracle.
  ipcMain.handle('verify-hidden-content-pin', (_event, pin: string) => {
    if (!hasHiddenContentPin()) return { ok: true }
    if (!verifyHiddenContentPin(pin)) return { ok: false, error: pinFailureMessage() }
    return { ok: true }
  })

  ipcMain.handle('set-hidden-content-pin', (_event, currentPin: string | null, newPin: string) =>
    setHiddenContentPin(currentPin, newPin)
  )

  ipcMain.handle('clear-hidden-content-pin', (_event, currentPin: string) => {
    const result = clearHiddenContentPin(currentPin)
    if (result.ok) broadcastHiddenContentState()
    return result
  })
}

function registerSourceHandlers(): void {
  ipcMain.handle('get-missing-source-paths', (_event, libraryId: number) =>
    getMissingSourcePaths(libraryId)
  )

  ipcMain.handle('pick-source-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win ? pickSourceDirectory(win) : null
  })

  ipcMain.handle('add-source', (event, path: string, libraryId: number) => {
    const result = addSource(path, libraryId)
    event.sender.send('comics-updated')
    return result
  })

  ipcMain.handle('get-library-sources', (_event, libraryId: number) => getLibrarySources(libraryId))

  ipcMain.handle('check-library-sources-exist', (_event, libraryId: number) =>
    checkLibrarySourcesExist(libraryId)
  )

  ipcMain.handle('check-all-sources-exist', () => checkAllSourcesExist())

  ipcMain.handle('update-source-path', async (event, id: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { ok: false, error: 'No window available.' }

    const picked = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select New Directory Location'
    })
    if (picked.canceled || picked.filePaths.length === 0) return { ok: false, canceled: true }

    const result = updateSourcePath(id, picked.filePaths[0])
    if (result.ok) event.sender.send('comics-updated')
    return result
  })

  ipcMain.handle('refresh-source', (event, id: number) => {
    const result = refreshSource(id)
    if (result) event.sender.send('comics-updated')
    return result
  })

  ipcMain.handle('clear-source', (event, id: number) => {
    const cleared = clearSource(id)
    if (cleared) event.sender.send('comics-updated')
    return cleared
  })
}

function registerLibraryHandlers(): void {
  ipcMain.handle(
    'create-library',
    (
      _event,
      opts: {
        name: string
        description?: string
        mediaType?: string
        imagePath?: string
        isHidden?: boolean
      },
      sourcePaths?: string[]
    ) => createLibrary(opts, sourcePaths)
  )

  ipcMain.handle('pick-library-image', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return win ? pickLibraryImage(win) : null
  })

  ipcMain.handle(
    'get-libraries',
    (_event, search?: string, hiddenFilter?: 'hide' | 'include' | 'only') =>
      getLibraries(search, hiddenFilter)
  )

  ipcMain.handle('get-library', (_event, id: number) => getLibrary(id))

  ipcMain.handle(
    'update-library',
    (
      _event,
      id: number,
      opts: { name?: string; description?: string; imagePath?: string | null; isHidden?: boolean }
    ) => updateLibrary(id, opts)
  )

  ipcMain.handle('delete-library', (_event, id: number) => deleteLibrary(id))
}

function registerDataHandlers(): void {
  ipcMain.handle('clear-all-data', (event) => {
    clearAllData()
    event.sender.send('comics-updated')
    event.sender.send('tags-updated')
    // The wipe removes the enabled setting and the PIN, so resync both.
    setHiddenContentVisible(false)
    broadcastHiddenContentState()
  })

  ipcMain.handle('export-backup', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { canceled: true }
    return exportBackup(win)
  })

  ipcMain.handle('import-backup', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { canceled: true }
    const result = await importBackup(win)
    if (!result.canceled && !result.error) {
      // An import replaces the whole database, so every view is stale.
      broadcast('comics-updated', 'tags-updated')
      broadcastHiddenContentState()
    }
    return result
  })
}

export function registerIpcHandlers(): void {
  registerComicHandlers()
  registerHiddenContentHandlers()
  registerSourceHandlers()
  registerLibraryHandlers()
  registerDataHandlers()
  registerTagHandlers()
}
