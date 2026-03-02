import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'
import { showStatus } from '../components/StatusToast'
import type { LibraryWithCount, SourceWithStatus } from '../types'

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
  const [submitting, setSubmitting] = useState(false)

  const [sources, setSources] = useState<SourceWithStatus[]>([])
  const [refreshingSourceId, setRefreshingSourceId] = useState<number | null>(null)
  const [clearingSourceId, setClearingSourceId] = useState<number | null>(null)
  const [addingSource, setAddingSource] = useState(false)

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

  const handlePickImage = async (): Promise<void> => {
    const path = await api.pickLibraryImage()
    if (path) setImagePath(path)
  }

  const handleAddSource = async (): Promise<void> => {
    const path = await api.pickSourceDirectory()
    if (!path) return

    setAddingSource(true)
    try {
      const result = await api.addSource(path, libraryId)
      const dismiss = showStatus(`Imported ${result.imported}, updated ${result.updated}`)
      setTimeout(dismiss, 3000)
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
        const dismiss = showStatus(`Refreshed: ${result.imported} imported, ${result.updated} updated`)
        setTimeout(dismiss, 3000)
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
    const success = await api.updateSourcePath(sourceId)
    if (success) {
      const dismiss = showStatus('Source path updated')
      setTimeout(dismiss, 3000)
      await loadSources()
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || submitting) return

    setSubmitting(true)
    try {
      await api.updateLibrary(libraryId, {
        name: name.trim(),
        description: description.trim() || '',
        imagePath,
        isHidden
      })
      navigate(`/library/${libraryId}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Loading...
      </div>
    )
  }

  if (!library) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Library not found.
      </div>
    )
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="My Library"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-vertical"
              placeholder="Optional description..."
            />
          </div>

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
                  onClick={() => setImagePath(null)}
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Remove
                </button>
              )}
            </div>
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
              onChange={(e) => setIsHidden(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            <label htmlFor="is-hidden" className="text-sm">Hidden library</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-4 py-2 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              to={`/library/${libraryId}`}
              className="px-4 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
