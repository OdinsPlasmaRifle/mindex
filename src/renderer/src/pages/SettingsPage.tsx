import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { showStatus } from '../components/StatusToast'
import PinSettings from '../components/PinSettings'

interface TagRow {
  id: number
  name: string
  resource: string
  is_hidden: number
  comic_count: number
}

function HiddenIcon({ className = 'w-3.5 h-3.5' }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function TagManagementSection({ hiddenEnabled }: { hiddenEnabled: boolean }): React.JSX.Element {
  const [tags, setTags] = useState<TagRow[]>([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const load = useCallback(async () => {
    const result = await api.getAllTags(search)
    setTags(result)
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  // Revealing/concealing hidden content changes which tags the query returns.
  useEffect(() => api.onHiddenContentVisibilityChanged(() => load()), [load])

  useEffect(() => api.onTagsUpdated(() => load()), [load])

  const beginEdit = (tag: TagRow): void => {
    setEditingId(tag.id)
    setEditName(tag.name)
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setEditName('')
  }

  const saveEdit = async (id: number): Promise<void> => {
    const trimmed = editName.trim()
    if (!trimmed) return
    await api.updateTag(id, { name: trimmed })
    setEditingId(null)
    setEditName('')
  }

  const toggleHidden = async (tag: TagRow): Promise<void> => {
    await api.updateTag(tag.id, { isHidden: tag.is_hidden !== 1 })
  }

  const handleDelete = async (id: number): Promise<void> => {
    await api.deleteTag(id)
    setConfirmDeleteId(null)
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold mb-3">Tags</h2>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="flex-1 text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          />
        </div>

        {tags.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
            {search ? 'No tags match your search.' : 'No tags yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {tags.map((tag) => {
              const isEditing = editingId === tag.id
              const isConfirming = confirmDeleteId === tag.id
              return (
                <li key={tag.id} className="flex items-center gap-2 py-2">
                  <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(tag.id)
                          else if (e.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                        className="text-sm px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                      />
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm">
                        {tag.is_hidden === 1 && <HiddenIcon className="w-3 h-3 text-[var(--muted-foreground)]" />}
                        {tag.name}
                      </span>
                    )}
                    <span className="text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)]">
                      {tag.resource}
                    </span>
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--border)] text-[var(--muted-foreground)]"
                      title={`${tag.comic_count} comic${tag.comic_count === 1 ? '' : 's'} tagged at the comic, volume or chapter level`}
                    >
                      {tag.comic_count} {tag.comic_count === 1 ? 'comic' : 'comics'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveEdit(tag.id)}
                          disabled={!editName.trim()}
                          className="px-2 py-0.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2 py-0.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {hiddenEnabled && (
                          <label className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tag.is_hidden === 1}
                              onChange={() => toggleHidden(tag)}
                              className="cursor-pointer"
                            />
                            Hidden
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => beginEdit(tag)}
                          className="px-2 py-0.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                        >
                          Edit
                        </button>
                        {isConfirming ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDelete(tag.id)}
                              className="px-2 py-0.5 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 text-xs rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tag.id)}
                            className="px-2 py-0.5 text-xs rounded text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default function SettingsPage(): React.JSX.Element {
  const [hiddenEnabled, setHiddenEnabled] = useState(false)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [clearAllText, setClearAllText] = useState('')
  const [backupBusy, setBackupBusy] = useState<'export' | 'import' | null>(null)

  const handleExport = async (): Promise<void> => {
    setBackupBusy('export')
    try {
      const result = await api.exportBackup()
      if (result.error) {
        const dismiss = showStatus(`Backup failed: ${result.error}`)
        setTimeout(dismiss, 5000)
      } else if (!result.canceled) {
        const dismiss = showStatus('Backup exported')
        setTimeout(dismiss, 3000)
      }
    } finally {
      setBackupBusy(null)
    }
  }

  const handleImport = async (): Promise<void> => {
    setBackupBusy('import')
    try {
      const result = await api.importBackup()
      if (result.error) {
        const dismiss = showStatus(`Import failed: ${result.error}`)
        setTimeout(dismiss, 5000)
      } else if (!result.canceled) {
        const dismiss = showStatus('Backup imported')
        setTimeout(dismiss, 3000)
      }
    } finally {
      setBackupBusy(null)
    }
  }

  useEffect(() => {
    api.getHiddenContentEnabled().then(setHiddenEnabled)
  }, [])

  useEffect(() => {
    return api.onHiddenContentToggled((enabled) => {
      setHiddenEnabled(enabled)
    })
  }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4 inline-block">
        &larr; Back
      </Link>

      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Display</h2>

        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Enable Hidden Content</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Enable support for hidden content, such as hiding/showing and setting content as
                hidden.
              </p>
            </div>
            <button
              onClick={async () => {
                const next = !hiddenEnabled
                await api.setHiddenContentEnabled(next)
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${hiddenEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${hiddenEnabled ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {hiddenEnabled && <PinSettings />}
        </div>
      </section>

      <TagManagementSection hiddenEnabled={hiddenEnabled} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Data</h2>

        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] mb-3">
          <h3 className="text-sm font-medium mb-1">Backup</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            Export all libraries, comics, tags, favorites, settings, and library cover images into a single <span className="font-mono">.mindex</span> file. Source manga files on disk are not included.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={backupBusy !== null}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
            >
              {backupBusy === 'export' ? 'Exporting...' : 'Export Backup'}
            </button>
            <button
              onClick={handleImport}
              disabled={backupBusy !== null}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
            >
              {backupBusy === 'import' ? 'Importing...' : 'Import Backup'}
            </button>
          </div>
          <div className="mt-3 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
            <p className="text-xs font-medium text-amber-500 mb-1">Backup files are not encrypted</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Anyone with the file can read its contents, so store it somewhere you trust. Your
              hidden content PIN is <span className="font-medium">not</span> included in the backup
              and stays on this device — after importing on another device you will need to set a
              new PIN there.
            </p>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            Importing replaces all current data with the contents of the backup file. Your PIN on
            this device is kept.
          </p>
        </div>

        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <h3 className="text-sm font-medium mb-1">Clear All Data</h3>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">
            Permanently remove all libraries, comics, volumes, chapters, sources, and settings. This cannot be undone.
          </p>

          {!clearAllConfirm ? (
            <button
              onClick={() => setClearAllConfirm(true)}
              className="px-3 py-1.5 text-sm rounded-md text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors"
            >
              Clear All Data
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-400">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={clearAllText}
                onChange={(e) => setClearAllText(e.target.value)}
                className="w-48 px-3 py-1.5 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="DELETE"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await api.clearAllData()
                    setClearAllConfirm(false)
                    setClearAllText('')
                    const dismiss = showStatus('All data cleared')
                    setTimeout(dismiss, 3000)
                  }}
                  disabled={clearAllText !== 'DELETE'}
                  className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setClearAllConfirm(false); setClearAllText('') }}
                  className="px-3 py-1.5 text-sm rounded-md bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
