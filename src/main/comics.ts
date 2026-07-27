import { getDb } from './db'
import { resolveSourcePath } from './scan'

// Comic, volume and chapter queries. Rows are stored with paths relative to their
// source root, so everything returned from here is resolved to absolute paths
// first — the renderer only ever sees absolute paths.

/**
 * True when a tag is attached to a comic at any level (comic, volume or
 * chapter). Takes the tag id three times, once per EXISTS clause.
 */
const TAG_VISIBLE_SQL = `(
  EXISTS (SELECT 1 FROM comic_tag ct WHERE ct.comic_id = c.id AND ct.tag_id = ?)
  OR EXISTS (SELECT 1 FROM volume v JOIN volume_tag vt ON vt.volume_id = v.id WHERE v.comic_id = c.id AND vt.tag_id = ?)
  OR EXISTS (SELECT 1 FROM volume v JOIN chapter ch ON ch.volume_id = v.id JOIN chapter_tag cht ON cht.chapter_id = ch.id WHERE v.comic_id = c.id AND cht.tag_id = ?)
)`

/**
 * True when a bookmark is set anywhere under a comic. A bookmark marks a stop
 * point, which is usually a chapter rather than the comic itself, so filtering
 * on `c.bookmark` alone would hide the comics the user actually wants to find.
 */
const BOOKMARK_VISIBLE_SQL = `(
  c.bookmark = 1
  OR EXISTS (SELECT 1 FROM volume v WHERE v.comic_id = c.id AND v.bookmark = 1)
  OR EXISTS (SELECT 1 FROM volume v JOIN chapter ch ON ch.volume_id = v.id WHERE v.comic_id = c.id AND ch.bookmark = 1)
)`

// Sort keys are interpolated into SQL, so they are resolved through this
// whitelist rather than taken from the renderer verbatim. Every key ends with a
// unique tie-break so paging stays stable when values collide — created_at only
// has second resolution, and a bulk import stamps a whole library identically.
const COMIC_SORT_COLUMNS: Record<string, string> = {
  added: 'c.created_at',
  name: 'c.name COLLATE NOCASE',
  author: 'c.author COLLATE NOCASE'
}

function comicOrderClause(sortBy: string, sortDir: string): string {
  const column = COMIC_SORT_COLUMNS[sortBy] ?? COMIC_SORT_COLUMNS.name
  const dir = sortDir === 'desc' ? 'DESC' : 'ASC'
  return `ORDER BY ${column} ${dir}, c.id ${dir}`
}

const CHAPTERS_BY_VOLUME_SQL =
  'SELECT * FROM chapter WHERE volume_id = ? ORDER BY type ASC, number ASC, increment ASC'

type Row = Record<string, unknown>

/**
 * Strips the joined `source_path` off a row and rewrites its stored relative
 * paths in place. Returns the source root so nested rows can reuse it.
 */
function absolutize(row: Row, ...keys: string[]): string | null {
  const sourcePath = (row.source_path as string | null) ?? null
  delete row.source_path
  if (sourcePath) {
    for (const key of keys) {
      row[key] = resolveSourcePath(sourcePath, row[key] as string | null)
    }
  }
  return sourcePath
}

function chaptersFor(volumeId: number, sourcePath: string | null): Row[] {
  const chapters = getDb().prepare(CHAPTERS_BY_VOLUME_SQL).all(volumeId) as Row[]
  if (sourcePath) {
    for (const chapter of chapters) {
      chapter.file = resolveSourcePath(sourcePath, chapter.file as string)
    }
  }
  return chapters
}

export interface GetComicsOptions {
  libraryId: number
  page: number
  search: string
  pageSize: number
  favoritesOnly: boolean
  bookmarksOnly: boolean
  includedTagIds: number[]
  excludedTagIds: number[]
  sortBy: string
  sortDir: string
}

export function getComics(opts: GetComicsOptions): {
  comics: Row[]
  total: number
  page: number
  pageSize: number
} {
  const db = getDb()
  const { libraryId, page, pageSize, search, favoritesOnly, bookmarksOnly } = opts
  const offset = (page - 1) * pageSize

  const conditions: string[] = ['c.library_id = ?']
  const params: unknown[] = [libraryId]

  if (search) {
    conditions.push('(c.name LIKE ? OR c.author LIKE ?)')
    const term = `%${search}%`
    params.push(term, term)
  }

  if (favoritesOnly) conditions.push('c.favorite = 1')

  if (bookmarksOnly) conditions.push(BOOKMARK_VISIBLE_SQL)

  for (const tagId of opts.includedTagIds) {
    conditions.push(TAG_VISIBLE_SQL)
    params.push(tagId, tagId, tagId)
  }

  for (const tagId of opts.excludedTagIds) {
    conditions.push(`NOT ${TAG_VISIBLE_SQL}`)
    params.push(tagId, tagId, tagId)
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ')

  const countRow = db
    .prepare(`SELECT COUNT(*) as total FROM comic c ${whereClause}`)
    .get(...params) as { total: number }

  const comics = db
    .prepare(
      `SELECT c.*, s.path as source_path FROM comic c
       LEFT JOIN source s ON s.id = c.source_id
       ${whereClause} ${comicOrderClause(opts.sortBy, opts.sortDir)} LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as Row[]

  for (const comic of comics) absolutize(comic, 'directory', 'image_path')

  return { comics, total: countRow.total, page, pageSize }
}

export function getRandomComicId(libraryId: number): { id: number } | null {
  return (
    (getDb()
      .prepare('SELECT id FROM comic WHERE library_id = ? ORDER BY RANDOM() LIMIT 1')
      .get(libraryId) as { id: number } | undefined) ?? null
  )
}

export function getComic(id: number): Row | null {
  const db = getDb()
  const comic = db
    .prepare(
      `SELECT c.*, s.path as source_path, l.is_hidden as library_is_hidden FROM comic c
       LEFT JOIN source s ON s.id = c.source_id
       LEFT JOIN library l ON l.id = c.library_id WHERE c.id = ?`
    )
    .get(id) as Row | undefined
  if (!comic) return null

  const sourcePath = absolutize(comic, 'directory', 'image_path')

  const volumes = db
    .prepare('SELECT * FROM volume WHERE comic_id = ? ORDER BY number ASC')
    .all(id) as Row[]

  const volumesWithChapters = volumes.map((vol) => {
    if (sourcePath) {
      vol.directory = resolveSourcePath(sourcePath, vol.directory as string)
      vol.file = resolveSourcePath(sourcePath, vol.file as string | null)
    }
    return { ...vol, chapters: chaptersFor(vol.id as number, sourcePath) }
  })

  return { ...comic, volumes: volumesWithChapters }
}

export function getVolume(id: number): Row | null {
  const volume = getDb()
    .prepare(
      `SELECT v.*, s.path as source_path, l.is_hidden as library_is_hidden FROM volume v
       JOIN comic c ON c.id = v.comic_id
       LEFT JOIN source s ON s.id = c.source_id
       LEFT JOIN library l ON l.id = c.library_id WHERE v.id = ?`
    )
    .get(id) as Row | undefined
  if (!volume) return null

  const sourcePath = absolutize(volume, 'directory', 'file')
  return { ...volume, chapters: chaptersFor(id, sourcePath) }
}

export function deleteComic(id: number): boolean {
  return getDb().prepare('DELETE FROM comic WHERE id = ?').run(id).changes > 0
}

export type FlaggableTable = 'comic' | 'volume' | 'chapter'
/** Independent per-row markers: a favourite is a rating, a bookmark is a stop point. */
export type RowFlag = 'favorite' | 'bookmark'

const FLAGGABLE_TABLES: readonly FlaggableTable[] = ['comic', 'volume', 'chapter']
const ROW_FLAGS: readonly RowFlag[] = ['favorite', 'bookmark']

/**
 * Flips a favourite or bookmark flag on a comic, volume or chapter and returns
 * the new value, or null when the row does not exist. Both the table and column
 * names reach SQL by interpolation, so they are re-checked at runtime rather
 * than trusted from the types alone.
 */
export function toggleFlag(table: FlaggableTable, flag: RowFlag, id: number): boolean | null {
  if (!FLAGGABLE_TABLES.includes(table) || !ROW_FLAGS.includes(flag)) return null
  const db = getDb()
  const row = db.prepare(`SELECT ${flag} as value FROM ${table} WHERE id = ?`).get(id) as
    | { value: number }
    | undefined
  if (!row) return null
  const next = row.value ? 0 : 1
  db.prepare(`UPDATE ${table} SET ${flag} = ? WHERE id = ?`).run(next, id)
  return next === 1
}
