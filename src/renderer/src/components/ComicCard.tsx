import { Link } from 'react-router-dom'
import { api, localFileUrl } from '../lib/api'
import type { Comic } from '../types'
import { HeartIcon, WarningIcon } from './icons'

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
              <WarningIcon className="w-4 h-4 text-red-500" />
            </div>
          )}
          <button
            onClick={handleToggleFavorite}
            className={`w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors${sourceMissing ? ' pointer-events-none opacity-50' : ''}`}
          >
          <HeartIcon filled={comic.favorite === 1} fillColor="#f43f5e" stroke="white" />
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
