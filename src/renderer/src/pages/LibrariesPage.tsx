import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { LibraryWithCount } from '../types'
import LibraryCard from '../components/LibraryCard'
import SearchBar from '../components/SearchBar'
import { useHiddenContent } from '../lib/useHiddenContent'

type HiddenFilter = 'hide' | 'include' | 'only'

// Null means "the user hasn't picked one this session", so revealing hidden
// content defaults to 'include'. Module-level, so it resets on app restart.
let savedHiddenFilter: HiddenFilter | null = null

export default function LibrariesPage(): React.JSX.Element {
  const [libraries, setLibraries] = useState<LibraryWithCount[]>([])
  const [search, setSearch] = useState('')
  const { visible: hiddenVisible } = useHiddenContent()
  const [hiddenFilter, setHiddenFilter] = useState<HiddenFilter | null>(savedHiddenFilter)
  const [missingSourceLibraryIds, setMissingSourceLibraryIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    savedHiddenFilter = hiddenFilter
  }, [hiddenFilter])

  // Concealing hidden content clears the choice so the next reveal starts at 'include'.
  useEffect(() => {
    if (!hiddenVisible) setHiddenFilter(null)
  }, [hiddenVisible])

  const activeHiddenFilter: HiddenFilter = hiddenVisible ? (hiddenFilter ?? 'include') : 'hide'

  const loadLibraries = useCallback(async () => {
    const result = await api.getLibraries(search || undefined, activeHiddenFilter)
    setLibraries(result)

    const sources = await api.checkAllSourcesExist()
    const missing = new Set<number>()
    for (const source of sources) {
      if (!source.exists && source.library_id !== null) {
        missing.add(source.library_id)
      }
    }
    setMissingSourceLibraryIds(missing)
  }, [search, activeHiddenFilter])

  useEffect(() => {
    loadLibraries()
  }, [loadLibraries])

  useEffect(() => {
    return api.onComicsUpdated(() => {
      loadLibraries()
    })
  }, [loadLibraries])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const filterButton = (value: HiddenFilter, label: string): React.JSX.Element => (
    <button
      onClick={() => setHiddenFilter(value)}
      className={`px-3 py-1 text-sm rounded border transition-colors ${activeHiddenFilter === value ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]' : 'border-[var(--border)] hover:bg-[var(--secondary)]'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold">Libraries</h1>
          <Link
            to="/library/new"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title="Add library"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mb-4">{libraries.length} {libraries.length === 1 ? 'library' : 'libraries'}</p>

        <div className="mb-6">
          <SearchBar value={search} onChange={handleSearch} placeholder="Search by name..." />
        </div>

        {hiddenVisible && (
          <div className="flex gap-2 mb-4">
            {filterButton('hide', 'Exclude hidden')}
            {filterButton('include', 'Include hidden')}
            {filterButton('only', 'Only hidden')}
          </div>
        )}

        {libraries.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            {search ? 'No libraries found matching your search.' : 'No libraries yet. Use File \u2192 Add Library to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {libraries.map((library) => (
              <LibraryCard key={library.id} library={library} sourceMissing={missingSourceLibraryIds.has(library.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
