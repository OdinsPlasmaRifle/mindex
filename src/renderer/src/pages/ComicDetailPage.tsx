import { useState, useEffect } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'
import ImageLightbox from '../components/ImageLightbox'
import TagPool from '../components/TagPool'
import type { ComicWithVolumes, VolumeWithChapters } from '../types'

function HeartIcon({ filled, onClick }: { filled: boolean; onClick: (e: React.MouseEvent) => void }): React.JSX.Element {
  return (
    <svg
      className="w-4 h-4 cursor-pointer hover:opacity-75 transition-opacity"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      onClick={onClick}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  )
}

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
  const [chapterFavorites, setChapterFavorites] = useState<Record<number, number>>(
    () => Object.fromEntries(vol.chapters.map((ch) => [ch.id, ch.favorite]))
  )

  const chapters = vol.chapters.filter((c) => c.type === 'chapter')
  const extras = vol.chapters.filter((c) => c.type === 'extra')

  const handleOpen = async (filePath: string): Promise<void> => {
    await api.openFile(filePath)
  }

  const handleOpenChapter = (chId: number, filePath: string): void => {
    markChapterRead(chId)
    api.openFile(filePath)
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
          <HeartIcon filled={volFavorite === 1} onClick={handleToggleVolFavorite} />
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
          <svg
            className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
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
                      <HeartIcon filled={chapterFavorites[ch.id] === 1} onClick={(e) => handleToggleChFavorite(e, ch.id)} />
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
                      <HeartIcon filled={chapterFavorites[ex.id] === 1} onClick={(e) => handleToggleChFavorite(e, ex.id)} />
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
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                  Random again
                </button>
              )}
              {comic.volumes.length > 0 && comic.volumes[0].file && (
                <button
                  onClick={() => api.openFile(comic.volumes[0].file!)}
                  className="px-3 py-1 text-sm rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
                >
                  Start reading
                </button>
              )}
              <button
                onClick={handleToggleFavorite}
                className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
              >
                <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" viewBox="0 0 24 24" fill={comic.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                {comic.favorite ? 'Remove from favorites' : 'Add to favorites'}
              </button>
              <button
                onClick={() => navigate(`/comic/${comic.id}/edit`)}
                title="Edit comic"
                className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
