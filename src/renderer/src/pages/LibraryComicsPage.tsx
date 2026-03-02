import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { Comic, LibraryWithCount } from '../types'
import ComicCard from '../components/ComicCard'
import SearchBar from '../components/SearchBar'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 20

const savedPages: Record<number, number> = {}

export default function LibraryComicsPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const libraryId = parseInt(id!, 10)
  const navigate = useNavigate()

  const [library, setLibrary] = useState<LibraryWithCount | null>(null)
  const [comics, setComics] = useState<Comic[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(savedPages[libraryId] ?? 1)
  const [search, setSearch] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [missingSourcePaths, setMissingSourcePaths] = useState<string[]>([])

  useEffect(() => {
    api.getLibrary(libraryId).then(setLibrary)
    api.getMissingSourcePaths(libraryId).then(setMissingSourcePaths)
  }, [libraryId])

  useEffect(() => {
    savedPages[libraryId] = page
  }, [libraryId, page])

  const loadComics = useCallback(async () => {
    const result = await api.getComics(libraryId, page, search, PAGE_SIZE, favoritesOnly)
    setComics(result.comics)
    setTotal(result.total)
  }, [libraryId, page, search, favoritesOnly])

  useEffect(() => {
    loadComics()
  }, [loadComics])

  useEffect(() => {
    return api.onComicsUpdated(() => {
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

  const handleRandom = async (): Promise<void> => {
    const result = await api.getRandomComic(libraryId)
    if (result) {
      navigate(`/comic/${result.id}`)
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
              <svg className="w-5 h-5 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            )}
          </div>
        )}

        <div className="mb-4">
          <SearchBar value={search} onChange={handleSearch} />
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={handleToggleFavorites}
            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded border transition-colors ${
              favoritesOnly
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                : 'border-[var(--border)] hover:bg-[var(--secondary)]'
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill={favoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
            Favourites
          </button>
          <button
            onClick={handleRandom}
            className="flex items-center gap-1.5 px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
            Random
          </button>
        </div>

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
