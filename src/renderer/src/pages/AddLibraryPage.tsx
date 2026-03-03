import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'

export default function AddLibraryPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mediaType] = useState('comics')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [isHidden, setIsHidden] = useState(false)
  const [sourcePaths, setSourcePaths] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handlePickImage = async (): Promise<void> => {
    const path = await api.pickLibraryImage()
    if (path) setImagePath(path)
  }

  const handleAddSource = async (): Promise<void> => {
    const path = await api.pickSourceDirectory()
    if (path && !sourcePaths.includes(path)) {
      setSourcePaths((prev) => [...prev, path])
    }
  }

  const handleRemoveSource = (path: string): void => {
    setSourcePaths((prev) => prev.filter((p) => p !== path))
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim() || submitting) return

    setSubmitting(true)
    try {
      const result = await api.createLibrary(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          mediaType,
          imagePath: imagePath ?? undefined,
          isHidden
        },
        sourcePaths.length > 0 ? sourcePaths : undefined
      )
      navigate(`/library/${result.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-xl mx-auto">
        <Link
          to="/"
          className="inline-block mb-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Back to libraries
        </Link>

        <h1 className="text-2xl font-bold mb-6">Add Library</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Display</h2>
            <div className="space-y-5">
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
            </div>
          </section>

          <hr className="border-[var(--border)]" />

          <section>
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Media Type</label>
                <select
                  value={mediaType}
                  disabled
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] opacity-60"
                >
                  <option value="comics">Comics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sources</label>
                {sourcePaths.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {sourcePaths.map((path) => (
                      <div
                        key={path}
                        className="flex items-center justify-between p-2 rounded-md border border-[var(--border)] bg-[var(--card)]"
                      >
                        <p className="text-sm font-mono truncate mr-3" title={path}>{path}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(path)}
                          className="shrink-0 text-sm text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAddSource}
                  className="px-3 py-2 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                >
                  Add Directory
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
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="px-4 py-2 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? (sourcePaths.length > 0 ? 'Creating & Importing...' : 'Creating...') : 'Create Library'}
            </button>
            <Link
              to="/"
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
