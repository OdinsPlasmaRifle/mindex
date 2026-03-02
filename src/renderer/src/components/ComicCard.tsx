import { Link } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'
import type { Comic } from '../types'

interface ComicCardProps {
  comic: Comic
  onFavoriteToggle: (id: number, favorite: boolean) => void
  sourceMissing?: boolean
  libraryId?: number
}

export default function ComicCard({ comic, onFavoriteToggle, sourceMissing, libraryId }: ComicCardProps): React.JSX.Element {
  const handleToggleFavorite = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (sourceMissing) return
    const result = await api.toggleFavorite(comic.id)
    if (result !== null) {
      onFavoriteToggle(comic.id, result)
    }
  }

  const cardLink = sourceMissing && libraryId ? `/library/${libraryId}/edit` : `/comic/${comic.id}`

  return (
    <Link
      to={cardLink}
      className="block rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-[3/4] bg-[var(--muted)] flex items-center justify-center overflow-hidden relative">
        {sourceMissing ? (
          <span className="text-4xl text-[var(--muted-foreground)] opacity-50">
            {comic.name.charAt(0).toUpperCase()}
          </span>
        ) : comic.image_path ? (
          <img
            src={localFileUrl(comic.image_path)}
            alt={comic.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl text-[var(--muted-foreground)]">
            {comic.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {sourceMissing && (
            <div
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60"
              title="Source directory not found"
            >
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          )}
          <button
            onClick={handleToggleFavorite}
            className={`w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors${sourceMissing ? ' pointer-events-none opacity-50' : ''}`}
          >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={comic.favorite ? '#f43f5e' : 'none'}
            stroke="white"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate text-[var(--card-foreground)]">
          {comic.name}
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] truncate">{comic.author}</p>
      </div>
    </Link>
  )
}
