import { ipcMain } from 'electron'
import { getDb } from './db'
import { getHiddenContentVisible } from './hiddenContent'

// Tags can be attached at the comic, volume or chapter level. Hidden tags are
// filtered out of every read path unless hidden content is currently revealed.

export function registerTagHandlers(): void {
  ipcMain.handle(
    'list-tags',
    (
      _event,
      resource: string,
      search: string,
      limit: number = 20,
      includeHidden: boolean = false
    ) => {
      const db = getDb()
      const hiddenClause = includeHidden && getHiddenContentVisible() ? '' : ' AND is_hidden = 0'
      return db
        .prepare(
          `SELECT id, name, is_hidden FROM tag WHERE resource = ? AND name LIKE ?${hiddenClause} ORDER BY name COLLATE NOCASE ASC LIMIT ?`
        )
        .all(resource, `%${search}%`, limit) as Array<{ id: number; name: string; is_hidden: number }>
    }
  )

  ipcMain.handle(
    'create-tag',
    (event, name: string, resource: string, isHidden: boolean = false) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Tag name cannot be empty')
      const db = getDb()
      const row = db
        .prepare(
          'INSERT INTO tag (name, resource, is_hidden) VALUES (?, ?, ?) ON CONFLICT(name, resource) DO UPDATE SET name = excluded.name RETURNING id, name, resource, is_hidden'
        )
        .get(trimmed, resource, isHidden ? 1 : 0) as {
        id: number
        name: string
        resource: string
        is_hidden: number
      }
      event.sender.send('tags-updated')
      return row
    }
  )

  ipcMain.handle('get-comic-tags', (_event, comicId: number) => {
    const db = getDb()
    const hiddenClause = getHiddenContentVisible() ? '' : ' WHERE t.is_hidden = 0'
    return db
      .prepare(
        `WITH attachments AS (
          SELECT tag_id, 'comic' AS lvl FROM comic_tag WHERE comic_id = ?
          UNION ALL
          SELECT tag_id, 'volume' AS lvl FROM volume_tag WHERE volume_id IN (SELECT id FROM volume WHERE comic_id = ?)
          UNION ALL
          SELECT tag_id, 'chapter' AS lvl FROM chapter_tag WHERE chapter_id IN (
            SELECT ch.id FROM chapter ch JOIN volume v ON v.id = ch.volume_id WHERE v.comic_id = ?
          )
        )
        SELECT t.id, t.name, t.is_hidden,
          MAX(CASE WHEN a.lvl = 'comic' THEN 1 ELSE 0 END) AS direct,
          COUNT(*) AS count
        FROM tag t JOIN attachments a ON a.tag_id = t.id${hiddenClause}
        GROUP BY t.id, t.name, t.is_hidden
        ORDER BY t.name COLLATE NOCASE ASC`
      )
      .all(comicId, comicId, comicId) as Array<{ id: number; name: string; is_hidden: number; direct: 0 | 1; count: number }>
  })

  ipcMain.handle('get-volume-tags', (_event, volumeId: number) => {
    const db = getDb()
    const hiddenClause = getHiddenContentVisible() ? '' : ' WHERE t.is_hidden = 0'
    return db
      .prepare(
        `WITH attachments AS (
          SELECT tag_id, 'volume' AS lvl FROM volume_tag WHERE volume_id = ?
          UNION ALL
          SELECT tag_id, 'chapter' AS lvl FROM chapter_tag WHERE chapter_id IN (SELECT id FROM chapter WHERE volume_id = ?)
        )
        SELECT t.id, t.name, t.is_hidden,
          MAX(CASE WHEN a.lvl = 'volume' THEN 1 ELSE 0 END) AS direct,
          COUNT(*) AS count
        FROM tag t JOIN attachments a ON a.tag_id = t.id${hiddenClause}
        GROUP BY t.id, t.name, t.is_hidden
        ORDER BY t.name COLLATE NOCASE ASC`
      )
      .all(volumeId, volumeId) as Array<{ id: number; name: string; is_hidden: number; direct: 0 | 1; count: number }>
  })

  ipcMain.handle('get-chapter-tags', (_event, chapterId: number) => {
    const db = getDb()
    const hiddenClause = getHiddenContentVisible() ? '' : ' AND t.is_hidden = 0'
    return db
      .prepare(
        `SELECT t.id, t.name, t.is_hidden, 1 AS direct, 1 AS count FROM chapter_tag ct JOIN tag t ON t.id = ct.tag_id WHERE ct.chapter_id = ?${hiddenClause} ORDER BY t.name COLLATE NOCASE ASC`
      )
      .all(chapterId) as Array<{ id: number; name: string; is_hidden: number; direct: 1; count: number }>
  })

  ipcMain.handle(
    'attach-tag',
    (event, level: 'comic' | 'volume' | 'chapter', entityId: number, tagId: number) => {
      const db = getDb()
      if (level === 'comic') {
        db.prepare('INSERT OR IGNORE INTO comic_tag (comic_id, tag_id) VALUES (?, ?)').run(entityId, tagId)
      } else if (level === 'volume') {
        db.prepare('INSERT OR IGNORE INTO volume_tag (volume_id, tag_id) VALUES (?, ?)').run(entityId, tagId)
      } else {
        db.prepare('INSERT OR IGNORE INTO chapter_tag (chapter_id, tag_id) VALUES (?, ?)').run(entityId, tagId)
      }
      event.sender.send('tags-updated')
    }
  )

  ipcMain.handle(
    'detach-tag',
    (event, level: 'comic' | 'volume' | 'chapter', entityId: number, tagId: number) => {
      const db = getDb()
      if (level === 'comic') {
        db.prepare('DELETE FROM comic_tag WHERE comic_id = ? AND tag_id = ?').run(entityId, tagId)
      } else if (level === 'volume') {
        db.prepare('DELETE FROM volume_tag WHERE volume_id = ? AND tag_id = ?').run(entityId, tagId)
      } else {
        db.prepare('DELETE FROM chapter_tag WHERE chapter_id = ? AND tag_id = ?').run(entityId, tagId)
      }
      event.sender.send('tags-updated')
    }
  )

  ipcMain.handle(
    'get-all-tags',
    (_event, search: string = '') => {
      const db = getDb()
      const visible = getHiddenContentVisible()
      const hiddenClause = visible ? '' : ' AND t.is_hidden = 0'
      // Comics in hidden libraries are unreachable while hidden content is concealed,
      // so they must not be counted either.
      const comicScope = visible
        ? 'comic c'
        : 'comic c JOIN library l ON l.id = c.library_id AND l.is_hidden = 0'
      return db
        .prepare(
          `SELECT t.id, t.name, t.resource, t.is_hidden,
             (SELECT COUNT(*) FROM ${comicScope} WHERE
               EXISTS (SELECT 1 FROM comic_tag ct WHERE ct.comic_id = c.id AND ct.tag_id = t.id)
               OR EXISTS (SELECT 1 FROM volume v JOIN volume_tag vt ON vt.volume_id = v.id WHERE v.comic_id = c.id AND vt.tag_id = t.id)
               OR EXISTS (SELECT 1 FROM volume v JOIN chapter ch ON ch.volume_id = v.id JOIN chapter_tag cht ON cht.chapter_id = ch.id WHERE v.comic_id = c.id AND cht.tag_id = t.id)
             ) AS comic_count
           FROM tag t WHERE t.name LIKE ?${hiddenClause}
           ORDER BY t.name COLLATE NOCASE ASC, t.resource ASC`
        )
        .all(`%${search}%`) as Array<{
        id: number
        name: string
        resource: string
        is_hidden: number
        comic_count: number
      }>
    }
  )

  ipcMain.handle(
    'update-tag',
    (event, id: number, opts: { name?: string; isHidden?: boolean }) => {
      const db = getDb()
      const sets: string[] = []
      const params: unknown[] = []
      if (opts.name !== undefined) {
        const trimmed = opts.name.trim()
        if (!trimmed) throw new Error('Tag name cannot be empty')
        sets.push('name = ?')
        params.push(trimmed)
      }
      if (opts.isHidden !== undefined) {
        sets.push('is_hidden = ?')
        params.push(opts.isHidden ? 1 : 0)
      }
      if (sets.length === 0) return false
      params.push(id)
      const result = db.prepare(`UPDATE tag SET ${sets.join(', ')} WHERE id = ?`).run(...params)
      if (result.changes > 0) event.sender.send('tags-updated')
      return result.changes > 0
    }
  )

  ipcMain.handle('delete-tag', (event, id: number) => {
    const db = getDb()
    const result = db.prepare('DELETE FROM tag WHERE id = ?').run(id)
    if (result.changes > 0) event.sender.send('tags-updated')
    return result.changes > 0
  })

  ipcMain.handle('get-library-tags', (_event, libraryId: number) => {
    const db = getDb()
    const hiddenClause = getHiddenContentVisible() ? '' : ' AND t.is_hidden = 0'
    return db
      .prepare(
        `SELECT DISTINCT t.id, t.name, t.is_hidden FROM tag t
        WHERE t.id IN (
          SELECT ct.tag_id FROM comic_tag ct JOIN comic c ON c.id = ct.comic_id WHERE c.library_id = ?
          UNION
          SELECT vt.tag_id FROM volume_tag vt JOIN volume v ON v.id = vt.volume_id JOIN comic c ON c.id = v.comic_id WHERE c.library_id = ?
          UNION
          SELECT cht.tag_id FROM chapter_tag cht JOIN chapter ch ON ch.id = cht.chapter_id JOIN volume v ON v.id = ch.volume_id JOIN comic c ON c.id = v.comic_id WHERE c.library_id = ?
        )${hiddenClause}
        ORDER BY t.name COLLATE NOCASE ASC`
      )
      .all(libraryId, libraryId, libraryId) as Array<{ id: number; name: string; is_hidden: number }>
  })
}
