import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { openFile } from '../lib/openFile'
import TagPool from '../components/TagPool'
import type { VolumeWithChapters } from '../types'
import { BookmarkToggle, HeartToggle } from '../components/icons'
import PageMessage from '../components/PageMessage'

export default function VolumePage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [volume, setVolume] = useState<VolumeWithChapters | null>(null)
  const [loading, setLoading] = useState(true)
  const [volFavorite, setVolFavorite] = useState(0)
  const [volBookmark, setVolBookmark] = useState(0)
  const [chapterFavorites, setChapterFavorites] = useState<Record<number, number>>({})
  const [chapterBookmarks, setChapterBookmarks] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!id) return
    api.getVolume(parseInt(id, 10)).then((result) => {
      setVolume(result)
      if (result) {
        setVolFavorite(result.favorite)
        setVolBookmark(result.bookmark)
        setChapterFavorites(Object.fromEntries(result.chapters.map((ch) => [ch.id, ch.favorite])))
        setChapterBookmarks(Object.fromEntries(result.chapters.map((ch) => [ch.id, ch.bookmark])))
      }
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return <PageMessage>Loading...</PageMessage>
  }

  if (!volume) {
    return <PageMessage>Volume not found.</PageMessage>
  }

  const chapters = volume.chapters.filter((c) => c.type === 'chapter')
  const extras = volume.chapters.filter((c) => c.type === 'extra')

  const handleOpen = async (filePath: string): Promise<void> => {
    await openFile(filePath)
  }

  const handleToggleVolFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleVolumeFavorite(volume.id)
    if (result !== null) setVolFavorite(result ? 1 : 0)
  }

  const handleToggleChFavorite = async (e: React.MouseEvent, chId: number): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleChapterFavorite(chId)
    if (result !== null) setChapterFavorites((prev) => ({ ...prev, [chId]: result ? 1 : 0 }))
  }

  const handleToggleVolBookmark = async (e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleVolumeBookmark(volume.id)
    if (result !== null) setVolBookmark(result ? 1 : 0)
  }

  const handleToggleChBookmark = async (e: React.MouseEvent, chId: number): Promise<void> => {
    e.stopPropagation()
    const result = await api.toggleChapterBookmark(chId)
    if (result !== null) setChapterBookmarks((prev) => ({ ...prev, [chId]: result ? 1 : 0 }))
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <Link
          to={`/comic/${volume.comic_id}`}
          className="inline-block mb-6 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          &larr; Back to comic
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Volume {volume.number}</h1>
          <div className="flex items-center gap-2 mt-2">
            {volume.file && (
              <button
                onClick={() => handleOpen(volume.file!)}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Read Full Volume
              </button>
            )}
            <BookmarkToggle filled={volBookmark === 1} onClick={handleToggleVolBookmark} />
            <HeartToggle filled={volFavorite === 1} onClick={handleToggleVolFavorite} />
          </div>
          <div className="mt-3">
            <TagPool level="volume" entityId={volume.id} resource="comics" libraryIsHidden={volume.library_is_hidden === 1} />
          </div>
        </div>

        {chapters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Chapters</h2>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className="font-medium">Chapter {ch.number}{ch.increment}</span>
                    <TagPool level="chapter" entityId={ch.id} resource="comics" size="compact" libraryIsHidden={volume.library_is_hidden === 1} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BookmarkToggle filled={chapterBookmarks[ch.id] === 1} onClick={(e) => handleToggleChBookmark(e, ch.id)} />
                    <HeartToggle filled={chapterFavorites[ch.id] === 1} onClick={(e) => handleToggleChFavorite(e, ch.id)} />
                    <button
                      onClick={() => handleOpen(ch.file)}
                      className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                      Read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {extras.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Extras</h2>
            <div className="space-y-2">
              {extras.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className="font-medium">Extra {ex.number}</span>
                    <TagPool level="chapter" entityId={ex.id} resource="comics" size="compact" libraryIsHidden={volume.library_is_hidden === 1} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BookmarkToggle filled={chapterBookmarks[ex.id] === 1} onClick={(e) => handleToggleChBookmark(e, ex.id)} />
                    <HeartToggle filled={chapterFavorites[ex.id] === 1} onClick={(e) => handleToggleChFavorite(e, ex.id)} />
                    <button
                      onClick={() => handleOpen(ex.file)}
                      className="px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                    >
                      Read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {chapters.length === 0 && extras.length === 0 && (
          <div className="text-center py-10 text-[var(--muted-foreground)]">
            No chapters or extras found in this volume.
          </div>
        )}
      </div>
    </div>
  )
}
