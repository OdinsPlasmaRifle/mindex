import { readdirSync } from 'fs'
import { join, basename, extname, relative } from 'path'
import { getDb } from './db'

// Library scanning: turns a "Name (Author)/Name Vol. NN/Name Ch. NN.cbz" tree on
// disk into comic/volume/chapter rows. Paths are stored relative to their source
// root so a whole library can be moved by repointing the source.

function parseComicFolder(name: string): { name: string; author: string } | null {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!match) return null
  return { name: match[1].trim(), author: match[2].trim() }
}

function parseVolumeNumber(name: string): number | null {
  const match = name.match(/Vol\.\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

function parseChapterNumber(name: string): { number: number; increment: string; type: 'chapter' | 'extra' } | null {
  const extraMatch = name.match(/Extra\s*(\d+)/i)
  if (extraMatch) return { number: parseInt(extraMatch[1], 10), increment: '', type: 'extra' }

  const chMatch = name.match(/Ch\.\s*(\d+)([a-z])?/i)
  if (chMatch) return { number: parseInt(chMatch[1], 10), increment: (chMatch[2] || '').toLowerCase(), type: 'chapter' }

  return null
}

function isImageFile(name: string): boolean {
  const ext = extname(name).toLowerCase()
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)
}

export function resolveSourcePath(sourcePath: string, relativePath: string | null): string | null {
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
    } else {
      const ins = db
        .prepare('INSERT INTO volume (comic_id, number, directory, file) VALUES (?, ?, ?, ?)')
        .run(comicId, volNum, relVolDir, relVolumeFile)
      volumeId = ins.lastInsertRowid as number
    }

    // Upsert chapters and extras, preserving ids so tag associations and favorites survive
    const seenChapterIds: number[] = []
    for (const f of volFiles) {
      if (!f.isFile() || !f.name.endsWith('.cbz')) continue
      // Skip the volume file itself
      if (relVolumeFile && join(relVolDir, f.name) === relVolumeFile) continue

      const chapterInfo = parseChapterNumber(f.name)
      if (!chapterInfo) continue

      const row = db
        .prepare(
          `INSERT INTO chapter (volume_id, number, increment, type, file) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(volume_id, number, increment, type) DO UPDATE SET file = excluded.file
           RETURNING id`
        )
        .get(
          volumeId,
          chapterInfo.number,
          chapterInfo.increment,
          chapterInfo.type,
          join(relVolDir, f.name)
        ) as { id: number }
      seenChapterIds.push(row.id)
    }

    // Remove chapter rows whose files no longer exist on disk
    if (seenChapterIds.length === 0) {
      db.prepare('DELETE FROM chapter WHERE volume_id = ?').run(volumeId)
    } else {
      const placeholders = seenChapterIds.map(() => '?').join(',')
      db.prepare(
        `DELETE FROM chapter WHERE volume_id = ? AND id NOT IN (${placeholders})`
      ).run(volumeId, ...seenChapterIds)
    }
  }

  return result
}

export function importSource(rootDir: string, libraryId: number): { imported: number; updated: number } {
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

export function refreshComic(comicId: number): boolean {
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
