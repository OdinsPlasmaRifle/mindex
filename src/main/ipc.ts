import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { getDb } from './db'
import { readdirSync, existsSync } from 'fs'
import { join, basename, extname, relative } from 'path'

let onMenuRebuild: (() => void) | null = null
export function setMenuRebuildCallback(cb: () => void): void {
  onMenuRebuild = cb
}

function parseComicFolder(name: string): { name: string; author: string } | null {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!match) return null
  return { name: match[1].trim(), author: match[2].trim() }
}

function parseVolumeNumber(name: string): number | null {
  const match = name.match(/Vol\.\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

function parseChapterNumber(name: string): { number: number; type: 'chapter' | 'extra' } | null {
  const extraMatch = name.match(/Extra\s*(\d+)/i)
  if (extraMatch) return { number: parseInt(extraMatch[1], 10), type: 'extra' }

  const chMatch = name.match(/Ch\.\s*(\d+)/i)
  if (chMatch) return { number: parseInt(chMatch[1], 10), type: 'chapter' }

  return null
}

function isImageFile(name: string): boolean {
  const ext = extname(name).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)
}

function resolveSourcePath(sourcePath: string, relativePath: string | null): string | null {
  if (!relativePath) return null
  return join(sourcePath, relativePath)
}

function scanComicDir(
  db: ReturnType<typeof getDb>,
  comicDir: string,
  parsed: { name: string; author: string },
  libraryId: number,
  sourceRoot: string,
  sourceId: number
): 'imported' | 'updated' {
  const relBase = relative(sourceRoot, comicDir)

  // Find icon/cover image
  let relImagePath: string | null = null
  const comicFiles = readdirSync(comicDir, { withFileTypes: true })
  for (const f of comicFiles) {
    if (f.isFile() && isImageFile(f.name)) {
      if (f.name.toLowerCase().includes('icon') || f.name.toLowerCase().includes('cover')) {
        relImagePath = join(relBase, f.name)
        break
      }
      if (!relImagePath) {
        relImagePath = join(relBase, f.name)
      }
    }
  }

  // Upsert comic: match by directory+source_id first, then by name+author to prevent duplicates
  const existing = (
    db.prepare('SELECT id FROM comic WHERE directory = ? AND source_id = ?').get(relBase, sourceId) ??
    db.prepare('SELECT id FROM comic WHERE name = ? AND author = ?').get(parsed.name, parsed.author)
  ) as { id: number } | undefined

  let comicId: number
  let result: 'imported' | 'updated'
  if (existing) {
    db.prepare('UPDATE comic SET name = ?, author = ?, image_path = ?, directory = ?, library_id = ?, source_id = ? WHERE id = ?').run(
      parsed.name,
      parsed.author,
      relImagePath,
      relBase,
      libraryId,
      sourceId,
      existing.id
    )
    comicId = existing.id
    result = 'updated'
  } else {
    const ins = db
      .prepare('INSERT INTO comic (name, author, image_path, directory, library_id, source_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(parsed.name, parsed.author, relImagePath, relBase, libraryId, sourceId)
    comicId = ins.lastInsertRowid as number
    result = 'imported'
  }

  // Process volumes
  for (const volEntry of comicFiles) {
    if (!volEntry.isDirectory()) continue
    const volNum = parseVolumeNumber(volEntry.name)
    if (volNum === null) continue

    const volDir = join(comicDir, volEntry.name)
    const relVolDir = join(relBase, volEntry.name)

    // Find volume cbz file
    let relVolumeFile: string | null = null
    const volFiles = readdirSync(volDir, { withFileTypes: true })
    for (const f of volFiles) {
      if (
        f.isFile() &&
        f.name.endsWith('.cbz') &&
        /Vol\.\s*\d+/i.test(f.name) &&
        !/Ch\./i.test(f.name) &&
        !/Extra/i.test(f.name)
      ) {
        relVolumeFile = join(relVolDir, f.name)
        break
      }
    }

    // Upsert volume
    const existingVol = db
      .prepare('SELECT id FROM volume WHERE comic_id = ? AND number = ?')
      .get(comicId, volNum) as { id: number } | undefined

    let volumeId: number
    if (existingVol) {
      db.prepare('UPDATE volume SET directory = ?, file = ? WHERE id = ?').run(
        relVolDir,
        relVolumeFile,
        existingVol.id
      )
      volumeId = existingVol.id
      // Delete old chapters to re-import
      db.prepare('DELETE FROM chapter WHERE volume_id = ?').run(volumeId)
    } else {
      const ins = db
        .prepare('INSERT INTO volume (comic_id, number, directory, file) VALUES (?, ?, ?, ?)')
        .run(comicId, volNum, relVolDir, relVolumeFile)
      volumeId = ins.lastInsertRowid as number
    }

    // Process chapters and extras
    for (const f of volFiles) {
      if (!f.isFile() || !f.name.endsWith('.cbz')) continue
      // Skip the volume file itself
      if (relVolumeFile && join(relVolDir, f.name) === relVolumeFile) continue

      const chapterInfo = parseChapterNumber(f.name)
      if (!chapterInfo) continue

      db.prepare('INSERT OR REPLACE INTO chapter (volume_id, number, type, file) VALUES (?, ?, ?, ?)').run(
        volumeId,
        chapterInfo.number,
        chapterInfo.type,
        join(relVolDir, f.name)
      )
    }
  }

  return result
}

function importSource(rootDir: string, libraryId: number): { imported: number; updated: number } {
  const db = getDb()
  let imported = 0
  let updated = 0

  // Upsert source first to get its ID
  db.prepare(
    'INSERT INTO source (path, library_id) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET library_id = excluded.library_id'
  ).run(rootDir, libraryId)

  const sourceRow = db.prepare('SELECT id FROM source WHERE path = ?').get(rootDir) as { id: number }
  const sourceId = sourceRow.id

  const entries = readdirSync(rootDir, { withFileTypes: true })

  const transaction = db.transaction(() => {
    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const parsed = parseComicFolder(entry.name)
      if (!parsed) continue

      const result = scanComicDir(db, join(rootDir, entry.name), parsed, libraryId, rootDir, sourceId)
      if (result === 'imported') imported++
      else updated++
    }
  })

  transaction()

  return { imported, updated }
}

function refreshComic(comicId: number): boolean {
  const db = getDb()

  const comic = db.prepare(
    'SELECT c.id, c.directory, c.library_id, c.source_id, s.path as source_path FROM comic c LEFT JOIN source s ON s.id = c.source_id WHERE c.id = ?'
  ).get(comicId) as
    | { id: number; directory: string; library_id: number; source_id: number | null; source_path: string | null }
    | undefined
  if (!comic || !comic.source_id || !comic.source_path) return false

  const fullDir = join(comic.source_path, comic.directory)
  const parsed = parseComicFolder(basename(fullDir))
  if (!parsed) return false

  const transaction = db.transaction(() => {
    scanComicDir(db, fullDir, parsed, comic.library_id, comic.source_path!, comic.source_id!)
  })

  transaction()
  return true
}

export function clearAllData(): void {
  const db = getDb()
  db.exec('DELETE FROM chapter')
  db.exec('DELETE FROM volume')
  db.exec('DELETE FROM comic')
  db.exec('DELETE FROM source')
  db.exec('DELETE FROM library')
  db.exec("DELETE FROM settings")
}

export function getLibrarySources(libraryId: number): Array<{ id: number; path: string; type: string; library_id: number }> {
  const db = getDb()
  return db.prepare(
    'SELECT id, path, type, library_id FROM source WHERE library_id = ? ORDER BY path ASC'
  ).all(libraryId) as Array<{ id: number; path: string; type: string; library_id: number }>
}

export function checkLibrarySourcesExist(libraryId: number): Array<{ id: number; path: string; type: string; library_id: number; exists: boolean }> {
  const sources = getLibrarySources(libraryId)
  return sources.map((s) => ({ ...s, exists: existsSync(s.path) }))
}

export function checkAllSourcesExist(): Array<{ id: number; path: string; type: string; library_id: number | null; exists: boolean }> {
  const db = getDb()
  const sources = db.prepare(
    'SELECT id, path, type, library_id FROM source ORDER BY path ASC'
  ).all() as Array<{ id: number; path: string; type: string; library_id: number | null }>
  return sources.map((s) => ({ ...s, exists: existsSync(s.path) }))
}

export function updateSourcePath(id: number, newPath: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT id FROM source WHERE id = ?').get(id) as
    | { id: number }
    | undefined
  if (!row) return false

  db.prepare('UPDATE source SET path = ? WHERE id = ?').run(newPath, id)
  return true
}

export function refreshSource(id: number): { imported: number; updated: number } | null {
  const db = getDb()
  const row = db.prepare('SELECT path, library_id FROM source WHERE id = ?').get(id) as
    | { path: string; library_id: number | null }
    | undefined
  if (!row || !row.library_id) return null
  return importSource(row.path, row.library_id)
}

export function clearSource(id: number): boolean {
  const db = getDb()
  const row = db.prepare('SELECT id FROM source WHERE id = ?').get(id) as
    | { id: number }
    | undefined
  if (!row) return false

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM comic WHERE source_id = ?').run(id)
    db.prepare('DELETE FROM source WHERE id = ?').run(id)
  })

  transaction()
  return true
}

export function addSource(path: string, libraryId: number): { id: number; imported: number; updated: number } {
  const result = importSource(path, libraryId)
  const db = getDb()
  const row = db.prepare('SELECT id FROM source WHERE path = ?').get(path) as { id: number }
  return { id: row.id, ...result }
}

export async function pickSourceDirectory(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Source Directory'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export function createLibrary(
  opts: { name: string; description?: string; mediaType?: string; imagePath?: string; isHidden?: boolean },
  sourcePaths?: string[]
): { id: number; sourceResults?: Array<{ path: string; imported: number; updated: number }> } {
  const db = getDb()
  const ins = db.prepare(
    'INSERT INTO library (name, description, media_type, image_path, is_hidden) VALUES (?, ?, ?, ?, ?)'
  ).run(
    opts.name,
    opts.description ?? null,
    opts.mediaType ?? 'comics',
    opts.imagePath ?? null,
    opts.isHidden ? 1 : 0
  )
  const id = ins.lastInsertRowid as number

  if (sourcePaths && sourcePaths.length > 0) {
    const sourceResults = sourcePaths.map((path) => {
      const result = importSource(path, id)
      return { path, ...result }
    })
    return { id, sourceResults }
  }

  return { id }
}

export function getLibraries(search?: string, hiddenFilter: 'hide' | 'include' | 'only' = 'hide'): Array<Record<string, unknown>> {
  const db = getDb()
  const conditions: string[] = []
  const params: unknown[] = []

  if (search) {
    conditions.push('l.name LIKE ?')
    params.push(`%${search}%`)
  }

  if (hiddenFilter === 'hide') {
    conditions.push('l.is_hidden = 0')
  } else if (hiddenFilter === 'only') {
    conditions.push('l.is_hidden = 1')
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  return db.prepare(
    `SELECT l.*, COUNT(c.id) as comic_count FROM library l LEFT JOIN comic c ON c.library_id = l.id ${whereClause} GROUP BY l.id ORDER BY l.name ASC`
  ).all(...params) as Array<Record<string, unknown>>
}

export function getLibrary(id: number): Record<string, unknown> | null {
  const db = getDb()
  return (db.prepare('SELECT l.*, COUNT(c.id) as comic_count FROM library l LEFT JOIN comic c ON c.library_id = l.id WHERE l.id = ? GROUP BY l.id').get(id) as Record<string, unknown>) ?? null
}

export function updateLibrary(id: number, opts: { name?: string; description?: string; imagePath?: string | null; isHidden?: boolean }): boolean {
  const db = getDb()
  const sets: string[] = []
  const params: unknown[] = []

  if (opts.name !== undefined) {
    sets.push('name = ?')
    params.push(opts.name)
  }
  if (opts.description !== undefined) {
    sets.push('description = ?')
    params.push(opts.description || null)
  }
  if (opts.imagePath !== undefined) {
    sets.push('image_path = ?')
    params.push(opts.imagePath)
  }
  if (opts.isHidden !== undefined) {
    sets.push('is_hidden = ?')
    params.push(opts.isHidden ? 1 : 0)
  }

  if (sets.length === 0) return false

  params.push(id)
  const result = db.prepare(`UPDATE library SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  return result.changes > 0
}

export function deleteLibrary(id: number): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM library WHERE id = ?').run(id)
  return result.changes > 0
}

export async function pickLibraryImage(win: BrowserWindow): Promise<string | null> {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    title: 'Select Library Image',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export function getHiddenContentEnabled(): boolean {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'hidden_content_enabled'").get() as
    | { value: string }
    | undefined
  return row?.value === '1'
}

export function setHiddenContentEnabled(enabled: boolean): void {
  const db = getDb()
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('hidden_content_enabled', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(enabled ? '1' : '0')
}

export function getMissingSourcePaths(libraryId: number): string[] {
  const sources = getLibrarySources(libraryId)
  return sources.filter((s) => !existsSync(s.path)).map((s) => s.path)
}

export function registerIpcHandlers(): void {
  ipcMain.handle(
    'get-comics',
    (_event, libraryId: number, page: number, search: string, pageSize: number = 20, favoritesOnly: boolean = false) => {
      const db = getDb()
      const offset = (page - 1) * pageSize

      const conditions: string[] = ['c.library_id = ?']
      const params: unknown[] = [libraryId]

      if (search) {
        conditions.push('(c.name LIKE ? OR c.author LIKE ?)')
        const term = `%${search}%`
        params.push(term, term)
      }

      if (favoritesOnly) {
        conditions.push('c.favorite = 1')
      }

      const whereClause = 'WHERE ' + conditions.join(' AND ')

      const countRow = db
        .prepare(`SELECT COUNT(*) as total FROM comic c ${whereClause}`)
        .get(...params) as { total: number }

      params.push(pageSize, offset)
      const comics = db
        .prepare(
          `SELECT c.*, s.path as source_path FROM comic c LEFT JOIN source s ON s.id = c.source_id ${whereClause} ORDER BY c.name ASC LIMIT ? OFFSET ?`
        )
        .all(...params) as Array<Record<string, unknown>>

      // Resolve relative paths to absolute
      const resolved = comics.map((comic) => {
        const sourcePath = comic.source_path as string | null
        delete comic.source_path
        if (sourcePath) {
          comic.directory = resolveSourcePath(sourcePath, comic.directory as string)
          comic.image_path = resolveSourcePath(sourcePath, comic.image_path as string | null)
        }
        return comic
      })

      return { comics: resolved, total: countRow.total, page, pageSize }
    }
  )

  ipcMain.handle('get-random-comic', (_event, libraryId: number) => {
    const db = getDb()
    return db.prepare('SELECT id FROM comic WHERE library_id = ? ORDER BY RANDOM() LIMIT 1').get(libraryId) as { id: number } | undefined ?? null
  })

  ipcMain.handle('get-comic', (_event, id: number) => {
    const db = getDb()
    const comic = db.prepare(
      'SELECT c.*, s.path as source_path FROM comic c LEFT JOIN source s ON s.id = c.source_id WHERE c.id = ?'
    ).get(id) as Record<string, unknown> | undefined
    if (!comic) return null

    const sourcePath = comic.source_path as string | null
    delete comic.source_path
    if (sourcePath) {
      comic.directory = resolveSourcePath(sourcePath, comic.directory as string)
      comic.image_path = resolveSourcePath(sourcePath, comic.image_path as string | null)
    }

    const volumes = db
      .prepare('SELECT * FROM volume WHERE comic_id = ? ORDER BY number ASC')
      .all(id) as Array<Record<string, unknown>>

    const volumesWithChapters = volumes.map((vol) => {
      if (sourcePath) {
        vol.directory = resolveSourcePath(sourcePath, vol.directory as string)!
        vol.file = resolveSourcePath(sourcePath, vol.file as string | null)
      }

      const chapters = db
        .prepare('SELECT * FROM chapter WHERE volume_id = ? ORDER BY type ASC, number ASC')
        .all(vol.id) as Array<Record<string, unknown>>

      const resolvedChapters = chapters.map((ch) => {
        if (sourcePath) {
          ch.file = resolveSourcePath(sourcePath, ch.file as string)!
        }
        return ch
      })

      return { ...vol, chapters: resolvedChapters }
    })

    return { ...comic, volumes: volumesWithChapters }
  })

  ipcMain.handle('get-volume', (_event, id: number) => {
    const db = getDb()
    const volume = db.prepare(
      'SELECT v.*, s.path as source_path FROM volume v JOIN comic c ON c.id = v.comic_id LEFT JOIN source s ON s.id = c.source_id WHERE v.id = ?'
    ).get(id) as Record<string, unknown> | undefined
    if (!volume) return null

    const sourcePath = volume.source_path as string | null
    delete volume.source_path
    if (sourcePath) {
      volume.directory = resolveSourcePath(sourcePath, volume.directory as string)!
      volume.file = resolveSourcePath(sourcePath, volume.file as string | null)
    }

    const chapters = db
      .prepare(
        "SELECT * FROM chapter WHERE volume_id = ? ORDER BY type ASC, number ASC"
      )
      .all(id) as Array<Record<string, unknown>>

    const resolvedChapters = chapters.map((ch) => {
      if (sourcePath) {
        ch.file = resolveSourcePath(sourcePath, ch.file as string)!
      }
      return ch
    })

    return { ...volume, chapters: resolvedChapters }
  })

  ipcMain.handle('refresh-comic', (_event, id: number) => {
    return refreshComic(id)
  })

  ipcMain.handle('toggle-favorite', (_event, id: number) => {
    const db = getDb()
    const comic = db.prepare('SELECT favorite FROM comic WHERE id = ?').get(id) as
      | { favorite: number }
      | undefined
    if (!comic) return null
    const newValue = comic.favorite ? 0 : 1
    db.prepare('UPDATE comic SET favorite = ? WHERE id = ?').run(newValue, id)
    return newValue === 1
  })

  ipcMain.handle('toggle-volume-favorite', (_event, id: number) => {
    const db = getDb()
    const volume = db.prepare('SELECT favorite FROM volume WHERE id = ?').get(id) as
      | { favorite: number }
      | undefined
    if (!volume) return null
    const newValue = volume.favorite ? 0 : 1
    db.prepare('UPDATE volume SET favorite = ? WHERE id = ?').run(newValue, id)
    return newValue === 1
  })

  ipcMain.handle('toggle-chapter-favorite', (_event, id: number) => {
    const db = getDb()
    const chapter = db.prepare('SELECT favorite FROM chapter WHERE id = ?').get(id) as
      | { favorite: number }
      | undefined
    if (!chapter) return null
    const newValue = chapter.favorite ? 0 : 1
    db.prepare('UPDATE chapter SET favorite = ? WHERE id = ?').run(newValue, id)
    return newValue === 1
  })

  ipcMain.handle('open-file', async (_event, filePath: string) => {
    const result = await shell.openPath(filePath)
    if (result) {
      return { error: result }
    }
    return { success: true }
  })

  ipcMain.handle('get-hidden-content-enabled', () => {
    return getHiddenContentEnabled()
  })

  ipcMain.handle('set-hidden-content-enabled', (_event, enabled: boolean) => {
    setHiddenContentEnabled(enabled)
    const windows = BrowserWindow.getAllWindows()
    for (const w of windows) {
      w.webContents.send('hidden-content-toggled', enabled)
    }
    if (onMenuRebuild) onMenuRebuild()
  })

  ipcMain.handle('get-missing-source-paths', (_event, libraryId: number) => {
    return getMissingSourcePaths(libraryId)
  })

  // Source handlers
  ipcMain.handle('pick-source-directory', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return pickSourceDirectory(win)
  })

  ipcMain.handle('add-source', (event, path: string, libraryId: number) => {
    const result = addSource(path, libraryId)
    event.sender.send('comics-updated')
    return result
  })

  ipcMain.handle('get-library-sources', (_event, libraryId: number) => {
    return getLibrarySources(libraryId)
  })

  ipcMain.handle('check-library-sources-exist', (_event, libraryId: number) => {
    return checkLibrarySourcesExist(libraryId)
  })

  ipcMain.handle('check-all-sources-exist', () => {
    return checkAllSourcesExist()
  })

  ipcMain.handle('update-source-path', async (event, id: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false

    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select New Directory Location'
    })

    if (result.canceled || result.filePaths.length === 0) return false

    const success = updateSourcePath(id, result.filePaths[0])
    if (success) {
      event.sender.send('comics-updated')
    }
    return success
  })

  ipcMain.handle('refresh-source', (event, id: number) => {
    const result = refreshSource(id)
    if (result) {
      event.sender.send('comics-updated')
    }
    return result
  })

  ipcMain.handle('clear-source', (event, id: number) => {
    const result = clearSource(id)
    if (result) {
      event.sender.send('comics-updated')
    }
    return result
  })

  // Library handlers
  ipcMain.handle('create-library', (_event, opts: { name: string; description?: string; mediaType?: string; imagePath?: string; isHidden?: boolean }, sourcePaths?: string[]) => {
    return createLibrary(opts, sourcePaths)
  })

  ipcMain.handle('pick-library-image', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return null
    return pickLibraryImage(win)
  })

  ipcMain.handle('get-libraries', (_event, search?: string, hiddenFilter?: 'hide' | 'include' | 'only') => {
    return getLibraries(search, hiddenFilter)
  })

  ipcMain.handle('get-library', (_event, id: number) => {
    return getLibrary(id)
  })

  ipcMain.handle('update-library', (_event, id: number, opts: { name?: string; description?: string; imagePath?: string | null; isHidden?: boolean }) => {
    return updateLibrary(id, opts)
  })

  ipcMain.handle('delete-library', (_event, id: number) => {
    return deleteLibrary(id)
  })

  ipcMain.handle('clear-all-data', (event) => {
    clearAllData()
    event.sender.send('comics-updated')
  })
}
