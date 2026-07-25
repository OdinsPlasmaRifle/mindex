import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { onComicsUpdated, onTagsUpdated } from '../lib/ipcEvents'
import type { Comic, ComicSort, LibraryWithCount, TagFilterState } from '../types'
import { DEFAULT_COMIC_SORT } from '../types'
import ComicCard from '../components/ComicCard'
import SearchBar from '../components/SearchBar'
import SortMenu from '../components/SortMenu'
import Pagination from '../components/Pagination'
import TagFilterPool from '../components/TagFilterPool'
import { CogIcon, HeartIcon, HiddenIcon, ShuffleIcon, TagIcon } from '../components/icons'

const PAGE_SIZE = 20

interface ViewState {
  page: number
  search: string
  favoritesOnly: boolean
  tagFilters: Record<number, TagFilterState>
  tagsPanelOpen: boolean
  sort: ComicSort
}

const DEFAULT_VIEW: ViewState = {
  page: 1,
  search: '',
  favoritesOnly: false,
  tagFilters: {},
  tagsPanelOpen: false,
  sort: DEFAULT_COMIC_SORT
}

// Browsing state per library, kept at module level so navigating into a comic and
// back restores the same page, filters and sort. Deliberately not persisted — it
// resets when the app does.
const savedViews: Record<number, ViewState> = {}

export default function LibraryComicsPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const libraryId = parseInt(id!, 10)
  const navigate = useNavigate()

  const saved = savedViews[libraryId] ?? DEFAULT_VIEW

  const [library, setLibrary] = useState<LibraryWithCount | null>(null)
  const [comics, setComics] = useState<Comic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(saved.page)
  const [search, setSearch] = useState(saved.search)
  const [favoritesOnly, setFavoritesOnly] = useState(saved.favoritesOnly)
  const [tagFilters, setTagFilters] = useState<Record<number, TagFilterState>>(saved.tagFilters)
  const [tagsPanelOpen, setTagsPanelOpen] = useState(saved.tagsPanelOpen)
  const [sort, setSort] = useState<ComicSort>(saved.sort)
  const [missingSourcePaths, setMissingSourcePaths] = useState<string[]>([])

  useEffect(() => {
    api.getLibrary(libraryId).then(setLibrary)
    api.getMissingSourcePaths(libraryId).then(setMissingSourcePaths)
  }, [libraryId])

  useEffect(() => {
    savedViews[libraryId] = { page, search, favoritesOnly, tagFilters, tagsPanelOpen, sort }
  }, [libraryId, page, search, favoritesOnly, tagFilters, tagsPanelOpen, sort])

  const loadComics = useCallback(async () => {
    const included = Object.entries(tagFilters)
      .filter(([, s]) => s === 'included')
      .map(([id]) => Number(id))
    const excluded = Object.entries(tagFilters)
      .filter(([, s]) => s === 'excluded')
      .map(([id]) => Number(id))
    const result = await api.getComics(
      libraryId,
      page,
      search,
      PAGE_SIZE,
      favoritesOnly,
      included,
      excluded,
      sort.by,
      sort.dir
    )
    setComics(result.comics)
    setTotal(result.total)
  }, [libraryId, page, search, favoritesOnly, tagFilters, sort])

  useEffect(() => {
    loadComics()
  }, [loadComics])

  useEffect(() => {
    return onComicsUpdated(() => {
      loadComics()
    })
  }, [loadComics])

  useEffect(() => {
    return onTagsUpdated(() => {
      loadComics()
    })
  }, [loadComics])

  const handleFavoriteToggle = useCallback((id: number, favorite: boolean) => {
    setComics((prev) =>
      prev.map((c) => (c.id === id ? { ...c, favorite: favorite ? 1 : 0 } : c))
    )
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleToggleFavorites = (): void => {
    setFavoritesOnly((prev) => !prev)
    setPage(1)
  }

  const handleSortChange = (next: ComicSort): void => {
    setSort(next)
    setPage(1)
  }

  const handleRandom = async (): Promise<void> => {
    const result = await api.getRandomComic(libraryId)
    if (result) {
      navigate(`/comic/${result.id}?from=random&t=${Date.now()}`)
    }
  }

  const isComicSourceMissing = useCallback(
    (comic: Comic): boolean =>
      missingSourcePaths.some(
        (p) => comic.directory === p || comic.directory.startsWith(p + '/') || comic.directory.startsWith(p + '\\')
      ),
    [missingSourcePaths]
  )

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/"
          className="inline-block mb-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Back to libraries
        </Link>

        {library && (
          <div className="flex items-center gap-2 mb-6">
            <h1 className="text-2xl font-bold">{library.name}</h1>
            {library.is_hidden === 1 && (
              <HiddenIcon className="w-5 h-5 text-[var(--muted-foreground)]" />
            )}
            <Link
              to={`/library/${libraryId}/edit`}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              title="Edit library"
            >
              <CogIcon className="w-5 h-5" />
            </Link>
          </div>
        )}

        {library?.description && (
          <p className="text-sm text-[var(--muted-foreground)] mb-3">{library.description}</p>
        )}
        {library && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4">{library.comic_count} comic{library.comic_count !== 1 ? 's' : ''}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <SearchBar value={search} onChange={handleSearch} collapsible />
          <button
            onClick={handleToggleFavorites}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded border transition-colors ${
              favoritesOnly
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                : 'border-[var(--border)] hover:bg-[var(--secondary)]'
            }`}
          >
            <HeartIcon filled={favoritesOnly} />
            Favourites
          </button>
          <button
            onClick={handleRandom}
            className="flex items-center gap-1.5 px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
          >
            <ShuffleIcon />
            Random
          </button>
          <button
            onClick={() => setTagsPanelOpen((o) => !o)}
            aria-expanded={tagsPanelOpen}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded border transition-colors ${
              tagsPanelOpen || Object.keys(tagFilters).length > 0
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                : 'border-[var(--border)] hover:bg-[var(--secondary)]'
            }`}
          >
            <TagIcon />
            Tags{Object.keys(tagFilters).length > 0 ? ` (${Object.keys(tagFilters).length})` : ''}
          </button>
          <SortMenu value={sort} onChange={handleSortChange} />
        </div>

        {tagsPanelOpen && (
          <div className="mb-6 p-3 rounded border border-[var(--border)] bg-[var(--card)]">
            <TagFilterPool
              libraryId={libraryId}
              value={tagFilters}
              onChange={(next) => {
                setTagFilters(next)
                setPage(1)
              }}
            />
          </div>
        )}

        {comics.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)]">
            {search
              ? 'No comics found matching your search.'
              : favoritesOnly
                ? 'No favourited comics in this library.'
                : 'No comics in this library yet. Edit this library to add sources.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {comics.map((comic) => (
                <ComicCard key={comic.id} comic={comic} onFavoriteToggle={handleFavoriteToggle} sourceMissing={isComicSourceMissing(comic)} libraryId={libraryId} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
