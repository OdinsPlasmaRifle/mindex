import Database from 'better-sqlite3'
import { app } from 'electron'
import { join, relative } from 'path'

let db: Database.Database

const SCHEMA_VERSION = 2

const SCHEMA = `
  CREATE TABLE schema_version (
    version INTEGER NOT NULL
  );

  INSERT INTO schema_version (version) VALUES (${SCHEMA_VERSION});

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    media_type TEXT NOT NULL DEFAULT 'comics' CHECK(media_type IN ('comics')),
    image_path TEXT,
    is_hidden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE source (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'directory',
    library_id INTEGER REFERENCES library(id) ON DELETE SET NULL
  );

  CREATE TABLE comic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    author TEXT NOT NULL,
    image_path TEXT,
    directory TEXT NOT NULL UNIQUE,
    favorite INTEGER NOT NULL DEFAULT 0,
    library_id INTEGER NOT NULL REFERENCES library(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES source(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE volume (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comic_id INTEGER NOT NULL REFERENCES comic(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    directory TEXT NOT NULL,
    file TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(comic_id, number)
  );

  CREATE TABLE chapter (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    volume_id INTEGER NOT NULL REFERENCES volume(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('chapter', 'extra')),
    file TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(volume_id, number, type)
  );
`

function migrateV1toV2(): void {
  db.exec('ALTER TABLE comic ADD COLUMN source_id INTEGER REFERENCES source(id) ON DELETE CASCADE')

  const sources = db.prepare('SELECT id, path FROM source').all() as Array<{ id: number; path: string }>

  for (const source of sources) {
    const sourcePath = source.path.replace(/[/\\]+$/, '')

    // Find comics belonging to this source
    const comics = db.prepare("SELECT id, directory, image_path FROM comic WHERE directory LIKE ? ESCAPE '\\'").all(
      sourcePath.replace(/[%_]/g, '\\$&') + '/%'
    ) as Array<{ id: number; directory: string; image_path: string | null }>

    for (const comic of comics) {
      const relDir = relative(sourcePath, comic.directory)
      const relImage = comic.image_path ? relative(sourcePath, comic.image_path) : null

      db.prepare('UPDATE comic SET source_id = ?, directory = ?, image_path = ? WHERE id = ?').run(
        source.id, relDir, relImage, comic.id
      )

      // Update volumes
      const volumes = db.prepare('SELECT id, directory, file FROM volume WHERE comic_id = ?').all(comic.id) as Array<{ id: number; directory: string; file: string | null }>

      for (const vol of volumes) {
        const relVolDir = relative(sourcePath, vol.directory)
        const relVolFile = vol.file ? relative(sourcePath, vol.file) : null
        db.prepare('UPDATE volume SET directory = ?, file = ? WHERE id = ?').run(relVolDir, relVolFile, vol.id)

        // Update chapters
        const chapters = db.prepare('SELECT id, file FROM chapter WHERE volume_id = ?').all(vol.id) as Array<{ id: number; file: string }>

        for (const ch of chapters) {
          const relChFile = relative(sourcePath, ch.file)
          db.prepare('UPDATE chapter SET file = ? WHERE id = ?').run(relChFile, ch.id)
        }
      }
    }
  }

  db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION)
}

export function initDb(): void {
  const dbPath = join(app.getPath('userData'), 'mindex.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
  ).get()

  if (!row) {
    db.exec(SCHEMA)
  } else {
    const versionRow = db.prepare('SELECT version FROM schema_version').get() as { version: number }
    if (versionRow.version < SCHEMA_VERSION) {
      const migrate = db.transaction(() => {
        if (versionRow.version < 2) {
          migrateV1toV2()
        }
      })
      migrate()
    }
  }
}

export function getDb(): Database.Database {
  return db
}
