import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { showStatus } from '../components/StatusToast'
import type { ComicWithVolumes } from '../types'

export default function EditComicPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const comicId = parseInt(id!, 10)
  const navigate = useNavigate()

  const [comic, setComic] = useState<ComicWithVolumes | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadComic = async (): Promise<void> => {
    const result = await api.getComic(comicId)
    setComic(result)
    setLoading(false)
  }

  useEffect(() => {
    loadComic()
  }, [comicId])

  const handleRefresh = async (): Promise<void> => {
    if (!comic) return
    setRefreshing(true)
    const dismiss = showStatus('Refreshing...')
    try {
      await api.refreshComic(comic.id)
      await loadComic()
    } finally {
      setRefreshing(false)
      dismiss()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Loading...
      </div>
    )
  }

  if (!comic) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Comic not found.
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-xl mx-auto">
        <Link
          to={`/comic/${comicId}`}
          className="inline-block mb-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Back to comic
        </Link>

        <h1 className="text-2xl font-bold mb-6">Edit Comic</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <div className="p-3 rounded-md border border-[var(--border)] bg-[var(--card)]">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-mono truncate flex-1" title={comic.directory}>{comic.directory}</p>
                    <button
                      type="button"
                      onClick={() => api.openFile(comic.directory)}
                      className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title="Open in file explorer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="px-3 py-1 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] disabled:opacity-50 transition-colors"
                    >
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <hr className="border-[var(--border)] my-6" />

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-red-500">Danger Zone</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Permanently delete this comic and all its content (volumes, chapters, and extras).
            This action cannot be undone.
          </p>
          {confirmingDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--muted-foreground)]">Are you sure?</span>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await api.deleteComic(comic.id)
                    navigate(`/library/${comic.library_id}`)
                  } finally {
                    setDeleting(false)
                  }
                }}
                className="px-3 py-1 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-1 text-sm rounded-md bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="px-4 py-2 text-sm rounded-md border border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
            >
              Delete Comic
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
