import { Link } from 'react-router-dom'
import { localFileUrl } from '../lib/api'
import { generateIdenticon } from '../lib/identicon'
import type { LibraryWithCount } from '../types'
import { CogIcon, HiddenIcon, WarningIcon } from './icons'

interface LibraryCardProps {
  library: LibraryWithCount
  sourceMissing?: boolean
}

export default function LibraryCard({ library, sourceMissing }: LibraryCardProps): React.JSX.Element {
  return (
    <Link
      to={`/library/${library.id}`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-[3/4] bg-[var(--muted)] flex items-center justify-center overflow-hidden relative">
        <img
          src={library.image_path ? localFileUrl(library.image_path) : generateIdenticon(library.name)}
          alt={library.name}
          className={`w-full h-full object-cover${sourceMissing ? ' grayscale opacity-50' : ''}`}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          {sourceMissing && (
            <Link
              to={`/library/${library.id}/edit`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              title="Sources cannot be found"
            >
              <WarningIcon className="w-4 h-4 text-red-500" />
            </Link>
          )}
          {library.is_hidden === 1 && (
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60">
              <HiddenIcon className="w-4 h-4 text-white" />
            </div>
          )}
          <Link
            to={`/library/${library.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
          >
            <CogIcon className="w-4 h-4 text-white" />
          </Link>
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-medium rounded bg-black/60 text-white uppercase tracking-wider">
          {library.media_type}
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm truncate text-[var(--card-foreground)]">
          {library.name}
        </h3>
        {library.description && (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-0.5">
            {library.description}
          </p>
        )}
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          {library.comic_count} comic{library.comic_count !== 1 ? 's' : ''}
        </p>
      </div>
    </Link>
  )
}
