import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { VolumeWithChapters } from '../types'

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

export default function VolumePage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [volume, setVolume] = useState<VolumeWithChapters | null>(null)
  const [loading, setLoading] = useState(true)
  const [volFavorite, setVolFavorite] = useState(0)
  const [chapterFavorites, setChapterFavorites] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!id) return
    api.getVolume(parseInt(id, 10)).then((result) => {
      setVolume(result)
      if (result) {
        setVolFavorite(result.favorite)
        setChapterFavorites(Object.fromEntries(result.chapters.map((ch) => [ch.id, ch.favorite])))
      }
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Loading...
      </div>
    )
  }

  if (!volume) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted-foreground)]">
        Volume not found.
      </div>
    )
  }

  const chapters = volume.chapters.filter((c) => c.type === 'chapter')
  const extras = volume.chapters.filter((c) => c.type === 'extra')

  const handleOpen = async (filePath: string): Promise<void> => {
    await api.openFile(filePath)
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
            <HeartIcon filled={volFavorite === 1} onClick={handleToggleVolFavorite} />
          </div>
        </div>

        {chapters.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Chapters</h2>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <span className="font-medium">Chapter {ch.number}{ch.increment}</span>
                  <div className="flex items-center gap-2">
                    <HeartIcon filled={chapterFavorites[ch.id] === 1} onClick={(e) => handleToggleChFavorite(e, ch.id)} />
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
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <span className="font-medium">Extra {ex.number}</span>
                  <div className="flex items-center gap-2">
                    <HeartIcon filled={chapterFavorites[ex.id] === 1} onClick={(e) => handleToggleChFavorite(e, ex.id)} />
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
