import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'
import { openFile } from '../lib/openFile'
import { showError, showSuccess } from '../components/StatusToast'
import type { LibraryWithCount, SourceWithStatus } from '../types'
import PageMessage from '../components/PageMessage'

export default function EditLibraryPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const libraryId = parseInt(id!, 10)
  const navigate = useNavigate()

  const [library, setLibrary] = useState<LibraryWithCount | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [isHidden, setIsHidden] = useState(false)

  const [sources, setSources] = useState<SourceWithStatus[]>([])
  const [refreshingSourceId, setRefreshingSourceId] = useState<number | null>(null)
  const [clearingSourceId, setClearingSourceId] = useState<number | null>(null)
  const [addingSource, setAddingSource] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmDeleteText, setConfirmDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const loadSources = async (): Promise<void> => {
    const result = await api.checkLibrarySourcesExist(libraryId)
    setSources(result)
  }

  useEffect(() => {
    api.getLibrary(libraryId).then((lib) => {
      setLibrary(lib)
      if (lib) {
        setName(lib.name)
        setDescription(lib.description ?? '')
        setImagePath(lib.image_path)
        setIsHidden(lib.is_hidden === 1)
      }
      setLoading(false)
    })
    loadSources()
  }, [libraryId])

  const saveField = (opts: Parameters<typeof api.updateLibrary>[1]): void => {
    api.updateLibrary(libraryId, opts)
  }

  const handlePickImage = async (): Promise<void> => {
    const path = await api.pickLibraryImage()
    if (path) {
      setImagePath(path)
      saveField({ imagePath: path })
    }
  }

  const handleAddSource = async (): Promise<void> => {
    const path = await api.pickSourceDirectory()
    if (!path) return

    setAddingSource(true)
    try {
      const result = await api.addSource(path, libraryId)
      showSuccess(`Imported ${result.imported}, updated ${result.updated}`)
      await loadSources()
    } finally {
      setAddingSource(false)
    }
  }

  const handleRefreshSource = async (sourceId: number): Promise<void> => {
    setRefreshingSourceId(sourceId)
    try {
      const result = await api.refreshSource(sourceId)
      if (result) {
        showSuccess(`Refreshed: ${result.imported} imported, ${result.updated} updated`)
      }
      await loadSources()
    } finally {
      setRefreshingSourceId(null)
    }
  }

  const handleClearSource = async (sourceId: number): Promise<void> => {
    await api.clearSource(sourceId)
    setClearingSourceId(null)
    await loadSources()
  }

  const handleUpdateSource = async (sourceId: number): Promise<void> => {
    const result = await api.updateSourcePath(sourceId)
    if (result.ok) {
      showSuccess('Source path updated')
      await loadSources()
    } else if (result.error) {
      // Silent on cancel; anything else is a real failure worth reporting.
      showError(result.error)
    }
  }

  if (loading) {
    return <PageMessage>Loading...</PageMessage>
  }

  if (!library) {
    return <PageMessage>Library not found.</PageMessage>
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-xl mx-auto">
        <Link
          to={`/library/${libraryId}`}
          className="inline-block mb-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Back to library
        </Link>

        <h1 className="text-2xl font-bold mb-6">Edit Library</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Display</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => { if (name.trim() && name.trim() !== library.name) saveField({ name: name.trim() }) }}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="My Library"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => { if (description.trim() !== (library.description ?? '')) saveField({ description: description.trim() }) }}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-vertical"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image</label>
                <div className="flex items-center gap-4">
                  {imagePath && (
                    <div className="w-20 h-20 rounded overflow-hidden bg-[var(--muted)]">
                      <img src={localFileUrl(imagePath)} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handlePickImage}
                    className="px-3 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                  >
                    {imagePath ? 'Change Image' : 'Choose Image'}
                  </button>
                  {imagePath && (
                    <button
                      type="button"
                      onClick={() => { setImagePath(null); saveField({ imagePath: null }) }}
                      className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <hr className="border-[var(--border)]" />

          <section>
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Media Type</label>
                <select
                  value={library.media_type}
                  disabled
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] opacity-60"
                >
                  <option value="comics">Comics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sources</label>
                {sources.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {sources.map((source) => (
                      <div
                        key={source.id}
                        className="p-3 rounded-md border border-[var(--border)] bg-[var(--card)]"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-mono truncate flex-1" title={source.path}>{source.path}</p>
                          {!source.exists && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-500/20 text-red-400">
                              Not found
                            </span>
                          )}
                          {source.exists && (
                            <button
                              type="button"
                              onClick={() => void openFile(source.path)}
                              className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                              title="Open in file explorer"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {clearingSourceId === source.id ? (
                            <>
                              <span className="text-sm text-[var(--muted-foreground)]">
                                Clear all comics from this source?
                              </span>
                              <button
                                type="button"
                                onClick={() => handleClearSource(source.id)}
                                className="px-3 py-1 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setClearingSourceId(null)}
                                className="px-3 py-1 text-sm rounded-md bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateSource(source.id)}
                                disabled={refreshingSourceId !== null || clearingSourceId !== null}
                                className="px-3 py-1 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRefreshSource(source.id)}
                                disabled={refreshingSourceId !== null || clearingSourceId !== null || !source.exists}
                                className="px-3 py-1 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
                              >
                                {refreshingSourceId === source.id ? 'Refreshing...' : 'Refresh'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setClearingSourceId(source.id)}
                                disabled={refreshingSourceId !== null || clearingSourceId !== null}
                                className="px-3 py-1 text-sm rounded-md border border-[var(--border)] text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                              >
                                Clear
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddSource}
                  disabled={addingSource}
                  className="px-3 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
                >
                  {addingSource ? 'Adding...' : 'Add Source'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-hidden"
                  checked={isHidden}
                  onChange={(e) => { setIsHidden(e.target.checked); saveField({ isHidden: e.target.checked }) }}
                  className="rounded border-[var(--border)]"
                />
                <label htmlFor="is-hidden" className="text-sm">Hidden library</label>
              </div>
            </div>
          </section>

        </div>

        <hr className="border-[var(--border)] my-6" />

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-red-500">Danger Zone</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Permanently delete this library and all its content (comics, volumes, chapters, and sources).
            This action cannot be undone.
          </p>
          {confirmingDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-red-400">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="w-48 px-3 py-1.5 text-sm rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="DELETE"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleting || confirmDeleteText !== 'DELETE'}
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      await api.deleteLibrary(libraryId)
                      navigate('/')
                    } finally {
                      setDeleting(false)
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirmingDelete(false); setConfirmDeleteText('') }}
                  className="px-3 py-1.5 text-sm rounded-md bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="px-4 py-2 text-sm rounded-md border border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
            >
              Delete Library
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
