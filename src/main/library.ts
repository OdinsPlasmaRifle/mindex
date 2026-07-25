import { BrowserWindow, dialog } from 'electron'
import { existsSync } from 'fs'
import { getDb } from './db'
import { importSource } from './scan'
import { getHiddenContentVisible } from './hiddenContent'

// Libraries and their sources. A "source" is a directory on disk that a library
// scans; comics store paths relative to it, so repointing a source relocates a
// whole library without touching comic rows.

export function clearAllData(): void {
  const db = getDb()
  db.exec('DELETE FROM chapter_tag')
  db.exec('DELETE FROM volume_tag')
  db.exec('DELETE FROM comic_tag')
  db.exec('DELETE FROM tag')
  db.exec('DELETE FROM chapter')
  db.exec('DELETE FROM volume')
  db.exec('DELETE FROM comic')
  db.exec('DELETE FROM source')
  db.exec('DELETE FROM library')
  db.exec('DELETE FROM settings')
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

export type UpdateSourcePathResult = { ok: true } | { ok: false; error: string }

export function updateSourcePath(id: number, newPath: string): UpdateSourcePathResult {
  const db = getDb()
  const row = db.prepare('SELECT id FROM source WHERE id = ?').get(id) as
    | { id: number }
    | undefined
  if (!row) return { ok: false, error: 'That source no longer exists.' }

  // source.path is UNIQUE, so pointing two sources at one directory would throw
  // from SQLite and reject the IPC call — which reached the renderer as an
  // unhandled rejection and looked like the button doing nothing.
  const clash = db.prepare('SELECT id FROM source WHERE path = ? AND id != ?').get(newPath, id) as
    | { id: number }
    | undefined
  if (clash) {
    return { ok: false, error: 'Another source already points at that directory.' }
  }

  db.prepare('UPDATE source SET path = ? WHERE id = ?').run(newPath, id)
  return { ok: true }
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

  // Hidden libraries are only ever reachable while hidden content is revealed.
  const effectiveFilter = getHiddenContentVisible() ? hiddenFilter : 'hide'

  if (effectiveFilter === 'hide') {
    conditions.push('l.is_hidden = 0')
  } else if (effectiveFilter === 'only') {
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
  const del = db.transaction(() => {
    db.prepare('DELETE FROM source WHERE library_id = ?').run(id)
    return db.prepare('DELETE FROM library WHERE id = ?').run(id)
  })
  const result = del()
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

export function getMissingSourcePaths(libraryId: number): string[] {
  const sources = getLibrarySources(libraryId)
  return sources.filter((s) => !existsSync(s.path)).map((s) => s.path)
}
