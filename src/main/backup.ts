import AdmZip from 'adm-zip'
import { app, dialog, BrowserWindow } from 'electron'
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'fs'
import { extname, join } from 'path'
import { closeDb, getDb, getDbPath, initDb, SCHEMA_VERSION } from './db'

const BACKUP_FORMAT_VERSION = 1
const COVERS_DIR = 'library-covers'

type ManifestCover = {
  library_id: number
  archive_path: string
  original_path: string
}

type Manifest = {
  format_version: number
  app_version: string
  schema_version: number
  created_at: string
  covers: ManifestCover[]
}

function coversStorageDir(): string {
  return join(app.getPath('userData'), COVERS_DIR)
}

export async function exportBackup(win: BrowserWindow): Promise<{ canceled: boolean; path?: string }> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const defaultName = `mindex-backup-${stamp}.mindex`

  const result = await dialog.showSaveDialog(win, {
    title: 'Export Mindex Backup',
    defaultPath: defaultName,
    filters: [{ name: 'Mindex Backup', extensions: ['mindex'] }]
  })

  if (result.canceled || !result.filePath) return { canceled: true }

  const db = getDb()

  // VACUUM INTO produces a clean, checkpointed copy with no WAL/SHM sidecar files.
  const tempDbPath = join(app.getPath('temp'), `mindex-export-${Date.now()}.db`)
  if (existsSync(tempDbPath)) unlinkSync(tempDbPath)
  db.prepare('VACUUM INTO ?').run(tempDbPath)

  try {
    const libraries = db
      .prepare('SELECT id, image_path FROM library WHERE image_path IS NOT NULL')
      .all() as Array<{ id: number; image_path: string }>

    const zip = new AdmZip()
    const covers: ManifestCover[] = []

    for (const lib of libraries) {
      if (!existsSync(lib.image_path)) continue
      const ext = extname(lib.image_path) || '.img'
      const archivePath = `${COVERS_DIR}/library-${lib.id}${ext}`
      zip.addFile(archivePath, readFileSync(lib.image_path))
      covers.push({
        library_id: lib.id,
        archive_path: archivePath,
        original_path: lib.image_path
      })
    }

    const manifest: Manifest = {
      format_version: BACKUP_FORMAT_VERSION,
      app_version: app.getVersion(),
      schema_version: SCHEMA_VERSION,
      created_at: new Date().toISOString(),
      covers
    }

    zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'))
    zip.addLocalFile(tempDbPath, '', 'mindex.db')

    zip.writeZip(result.filePath)

    return { canceled: false, path: result.filePath }
  } finally {
    if (existsSync(tempDbPath)) unlinkSync(tempDbPath)
  }
}

export async function importBackup(
  win: BrowserWindow
): Promise<{ canceled: boolean; error?: string }> {
  const result = await dialog.showOpenDialog(win, {
    title: 'Import Mindex Backup',
    properties: ['openFile'],
    filters: [
      { name: 'Mindex Backup', extensions: ['mindex'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) return { canceled: true }
  const backupPath = result.filePaths[0]

  let zip: AdmZip
  try {
    zip = new AdmZip(backupPath)
  } catch (err) {
    return { canceled: false, error: `Could not read backup file: ${String(err)}` }
  }

  const manifestEntry = zip.getEntry('manifest.json')
  const dbEntry = zip.getEntry('mindex.db')
  if (!manifestEntry || !dbEntry) {
    return { canceled: false, error: 'Backup is missing manifest.json or mindex.db.' }
  }

  let manifest: Manifest
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf8')) as Manifest
  } catch (err) {
    return { canceled: false, error: `Manifest is not valid JSON: ${String(err)}` }
  }

  if (manifest.format_version !== BACKUP_FORMAT_VERSION) {
    return {
      canceled: false,
      error: `Unsupported backup format version ${manifest.format_version} (expected ${BACKUP_FORMAT_VERSION}).`
    }
  }

  if (manifest.schema_version > SCHEMA_VERSION) {
    return {
      canceled: false,
      error: `Backup was made with a newer app version (schema ${manifest.schema_version}, this app supports up to ${SCHEMA_VERSION}). Please update the app first.`
    }
  }

  const confirm = await dialog.showMessageBox(win, {
    type: 'warning',
    title: 'Replace All Data',
    message: 'Importing this backup will replace all current libraries, comics, tags, and settings.',
    detail: 'This cannot be undone. Continue?',
    buttons: ['Cancel', 'Replace'],
    defaultId: 0,
    cancelId: 0
  })
  if (confirm.response !== 1) return { canceled: true }

  const dbPath = getDbPath()
  const walPath = `${dbPath}-wal`
  const shmPath = `${dbPath}-shm`
  const coversDir = coversStorageDir()

  // Close current DB before swapping the file.
  closeDb()

  try {
    if (existsSync(walPath)) unlinkSync(walPath)
    if (existsSync(shmPath)) unlinkSync(shmPath)
    writeFileSync(dbPath, dbEntry.getData())

    if (existsSync(coversDir)) rmSync(coversDir, { recursive: true, force: true })
    mkdirSync(coversDir, { recursive: true })

    const coverPathByLibrary = new Map<number, string>()
    for (const cover of manifest.covers ?? []) {
      const entry = zip.getEntry(cover.archive_path)
      if (!entry) continue
      const ext = extname(cover.archive_path) || '.img'
      const destPath = join(coversDir, `library-${cover.library_id}${ext}`)
      writeFileSync(destPath, entry.getData())
      coverPathByLibrary.set(cover.library_id, destPath)
    }

    // Reopen DB; initDb will run any migrations needed to bring an older backup up to current schema.
    initDb()
    const db = getDb()

    // Rewrite library.image_path to the freshly extracted cover locations, and clear stale paths.
    const updateStmt = db.prepare('UPDATE library SET image_path = ? WHERE id = ?')
    const rewriteAll = db.transaction(() => {
      const libs = db
        .prepare('SELECT id FROM library WHERE image_path IS NOT NULL')
        .all() as Array<{ id: number }>
      for (const lib of libs) {
        const newPath = coverPathByLibrary.get(lib.id) ?? null
        updateStmt.run(newPath, lib.id)
      }
    })
    rewriteAll()
  } catch (err) {
    // Try to reopen the DB so the app stays functional even if write failed mid-way.
    try {
      initDb()
    } catch {
      // ignore — primary error is more informative
    }
    return { canceled: false, error: `Import failed: ${String(err)}` }
  }

  return { canceled: false }
}
