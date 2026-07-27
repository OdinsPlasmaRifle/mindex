import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'
import { openFile } from '../lib/openFile'
import ImageLightbox from '../components/ImageLightbox'
import TagPool from '../components/TagPool'
import type { ComicWithVolumes, VolumeWithChapters } from '../types'
import {
  BookmarkIcon,
  BookmarkToggle,
  ChevronDownIcon,
  CogIcon,
  HeartIcon,
  HeartToggle,
  ShuffleIcon
} from '../components/icons'
import PageMessage from '../components/PageMessage'

function VolumeAccordion({
  vol,
  defaultOpen = false,
  libraryIsHidden,
  readChapterIds,
  markChapterRead
}: {
  vol: VolumeWithChapters
  defaultOpen?: boolean
  libraryIsHidden: boolean
  readChapterIds: Set<number>
  markChapterRead: (id: number) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const [volFavorite, setVolFavorite] = useState(vol.favorite)
  const [volBookmark, setVolBookmark] = useState(vol.bookmark)
  const [chapterFavorites, setChapterFavorites] = useState<Record<number, number>>(
    () => Object.fromEntries(vol.chapters.map((ch) => [ch.id, ch.favorite]))
  )
  const [chapterBookmarks, setChapterBookmarks] = useState<Record<number, number>>(
    () => Object.fromEntries(vol.chapters.map((ch) => [ch.id, ch.bookmark]))
  )

  const chapters = vol.chapters.filter((c) => c.type === 'chapter')
  const extras = vol.chapters.filter((c) => c.type === 'extra')

  const handleOpen = async (filePath: string): Promise<void> => {
    await openFile(filePath)
  }

  const handleOpenChapter = (chId: number, filePath: string): void => {
    markChapterRead(chId)
    void openFile(filePath)
  }

  const handleToggleVolFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleVolumeFavorite(vol.id)
    if (result !== null) setVolFavorite(result ? 1 : 0)
  }

  const handleToggleChFavorite = async (e: React.MouseEvent, chId: number): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleChapterFavorite(chId)
    if (result !== null) setChapterFavorites((prev) => ({ ...prev, [chId]: result ? 1 : 0 }))
  }

  const handleToggleVolBookmark = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleVolumeBookmark(vol.id)
    if (result !== null) setVolBookmark(result ? 1 : 0)
  }

  const handleToggleChBookmark = async (e: React.MouseEvent, chId: number): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleChapterBookmark(chId)
    if (result !== null) setChapterBookmarks((prev) => ({ ...prev, [chId]: result ? 1 : 0 }))
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(!open)
          }
        }}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--secondary)] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span
            className={`font-medium ${vol.file ? 'hover:underline' : ''}`}
            onClick={vol.file ? (e) => { e.stopPropagation(); handleOpen(vol.file!) } : undefined}
          >
            Volume {vol.number}
          </span>
          <div onClick={(e) => e.stopPropagation()}>
            <TagPool level="volume" entityId={vol.id} resource="comics" size="compact" libraryIsHidden={libraryIsHidden} />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BookmarkToggle filled={volBookmark === 1} onClick={handleToggleVolBookmark} />
          <HeartToggle filled={volFavorite === 1} onClick={handleToggleVolFavorite} />
          {vol.file && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                handleOpen(vol.file!)
              }}
              className="px-3 py-1 text-xs font-medium rounded border border-[var(--border)] hover:bg-[var(--card)] transition-colors"
            >
              Read
            </span>
          )}
          <span className="text-xs text-[var(--muted-foreground)]">
            {chapters.length} ch{extras.length > 0 ? ` + ${extras.length} extra` : ''}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--border)]">
          {chapters.length > 0 && (
            <div>
              {chapters.map((ch) => {
                const isRead = readChapterIds.has(ch.id)
                return (
                  <div
                    key={ch.id}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 transition-colors ${isRead ? 'bg-[var(--secondary)]/40' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-wrap">
                      <span
                        onClick={() => handleOpenChapter(ch.id, ch.file)}
                        className="text-sm cursor-pointer hover:underline"
                      >
                        Chapter {ch.number}{ch.increment}
                      </span>
                      <TagPool level="chapter" entityId={ch.id} resource="comics" size="compact" libraryIsHidden={libraryIsHidden} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <BookmarkToggle filled={chapterBookmarks[ch.id] === 1} onClick={(e) => handleToggleChBookmark(e, ch.id)} />
                      <HeartToggle filled={chapterFavorites[ch.id] === 1} onClick={(e) => handleToggleChFavorite(e, ch.id)} />
                      <button
                        onClick={() => handleOpenChapter(ch.id, ch.file)}
                        className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                      >
                        Read
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {extras.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--secondary)] border-b border-[var(--border)]">
                Extras
              </div>
              {extras.map((ex) => {
                const isRead = readChapterIds.has(ex.id)
                return (
                  <div
                    key={ex.id}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 transition-colors ${isRead ? 'bg-[var(--secondary)]/40' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-wrap">
                      <span
                        onClick={() => handleOpenChapter(ex.id, ex.file)}
                        className="text-sm cursor-pointer hover:underline"
                      >
                        Extra {ex.number}
                      </span>
                      <TagPool level="chapter" entityId={ex.id} resource="comics" size="compact" libraryIsHidden={libraryIsHidden} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <BookmarkToggle filled={chapterBookmarks[ex.id] === 1} onClick={(e) => handleToggleChBookmark(e, ex.id)} />
                      <HeartToggle filled={chapterFavorites[ex.id] === 1} onClick={(e) => handleToggleChFavorite(e, ex.id)} />
                      <button
                        onClick={() => handleOpenChapter(ex.id, ex.file)}
                        className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                      >
                        Read
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {chapters.length === 0 && extras.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
              No chapters found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ComicDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromRandom = searchParams.get('from') === 'random'
  const randomKey = searchParams.get('t') || ''
  const [comic, setComic] = useState<ComicWithVolumes | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [randomFlash, setRandomFlash] = useState(false)
  const [readChapterIds, setReadChapterIds] = useState<Set<number>>(new Set())

  const markChapterRead = (chId: number): void => {
    setReadChapterIds((prev) => {
      if (prev.has(chId)) return prev
      const next = new Set(prev)
      next.add(chId)
      return next
    })
  }

  const loadComic = async (): Promise<void> => {
    if (!id) return
    const result = await api.getComic(parseInt(id, 10))
    setComic(result)
    setLoading(false)
  }

  useEffect(() => {
    loadComic()
    setReadChapterIds(new Set())
  }, [id, randomKey])

  useEffect(() => {
    if (fromRandom) {
      setRandomFlash(true)
      const timer = setTimeout(() => setRandomFlash(false), 800)
      return () => clearTimeout(timer)
    }
  }, [id, randomKey])

  const handleRandomAgain = async (): Promise<void> => {
    if (!comic) return
    const result = await api.getRandomComic(comic.library_id)
    if (result) {
      navigate(`/comic/${result.id}?from=random&t=${Date.now()}`)
    }
  }

  const handleToggleFavorite = async (): Promise<void> => {
    if (!comic) return
    const result = await api.toggleFavorite(comic.id)
    if (result !== null) {
      setComic({ ...comic, favorite: result ? 1 : 0 })
    }
  }

  const handleToggleBookmark = async (): Promise<void> => {
    if (!comic) return
    const result = await api.toggleBookmark(comic.id)
    if (result !== null) {
      setComic({ ...comic, bookmark: result ? 1 : 0 })
    }
  }

  if (loading) {
    return <PageMessage>Loading...</PageMessage>
  }

  if (!comic) {
    return <PageMessage>Comic not found.</PageMessage>
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          to={`/library/${comic.library_id}`}
          className="inline-block mb-6 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Back to library
        </Link>

        <div className="flex gap-6 mb-8">
          <div className="w-64 shrink-0">
            <div
              className={`aspect-[3/4] rounded-lg bg-[var(--muted)] flex items-center justify-center overflow-hidden${comic.image_path ? ' cursor-pointer' : ''}`}
              onClick={comic.image_path ? () => setLightboxOpen(true) : undefined}
            >
              {comic.image_path ? (
                <img
                  src={localFileUrl(comic.image_path)}
                  alt={comic.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl text-[var(--muted-foreground)]">
                  {comic.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{comic.name}</h1>
            </div>
            <p className="text-lg text-[var(--muted-foreground)]">{comic.author}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              {comic.volumes.length} volume{comic.volumes.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2 mt-3">
              {fromRandom && (
                <button
                  onClick={handleRandomAgain}
                  className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors${randomFlash ? ' animate-flash' : ''}`}
                >
                  <ShuffleIcon />
                  Random again
                </button>
              )}
              {comic.volumes.length > 0 && comic.volumes[0].file && (
                <button
                  onClick={() => void openFile(comic.volumes[0].file)}
                  className="px-3 py-1 text-sm rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                >
                  Start reading
                </button>
              )}
              <button
                onClick={handleToggleFavorite}
                className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
              >
                <HeartIcon className="w-4 h-4 inline-block mr-1 -mt-0.5" filled={comic.favorite === 1} />
                {comic.favorite ? 'Remove from favorites' : 'Add to favorites'}
              </button>
              <button
                onClick={handleToggleBookmark}
                className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
              >
                <BookmarkIcon className="w-4 h-4 inline-block mr-1 -mt-0.5" filled={comic.bookmark === 1} />
                {comic.bookmark ? 'Remove bookmark' : 'Bookmark'}
              </button>
              <button
                onClick={() => navigate(`/comic/${comic.id}/edit`)}
                title="Edit comic"
                className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
              >
                <CogIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3">
              <TagPool level="comic" entityId={comic.id} resource="comics" libraryIsHidden={comic.library_is_hidden === 1} />
            </div>
          </div>
        </div>

        {comic.volumes.length === 0 ? (
          <div className="text-center py-10 text-[var(--muted-foreground)]">
            No volumes found.
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-4">Volumes</h2>
            <div className="space-y-2">
              {comic.volumes.map((vol, i) => (
                <VolumeAccordion
                  key={vol.id}
                  vol={vol}
                  defaultOpen={i === 0}
                  libraryIsHidden={comic.library_is_hidden === 1}
                  readChapterIds={readChapterIds}
                  markChapterRead={markChapterRead}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {lightboxOpen && comic.image_path && (
        <ImageLightbox
          src={localFileUrl(comic.image_path)}
          alt={comic.name}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
