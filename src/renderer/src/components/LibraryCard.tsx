import { Link } from 'react-router-dom'
import { localFileUrl } from '../lib/api'
import { generateIdenticon } from '../lib/identicon'
import type { LibraryWithCount } from '../types'

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
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </Link>
          )}
          {library.is_hidden === 1 && (
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            </div>
          )}
          <Link
            to={`/library/${library.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
