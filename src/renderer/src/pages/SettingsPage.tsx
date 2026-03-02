import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { showStatus } from '../components/StatusToast'

export default function SettingsPage(): React.JSX.Element {
  const [hiddenEnabled, setHiddenEnabled] = useState(false)
  const [clearAllConfirm, setClearAllConfirm] = useState(false)
  const [clearAllText, setClearAllText] = useState('')

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
                Show hidden libraries and allow filtering by visibility.
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
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Data</h2>

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
