import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import type { TagFilterState } from '../types'

interface TagFilterPoolProps {
  libraryId: number
  value: Record<number, TagFilterState>
  onChange(next: Record<number, TagFilterState>): void
}

export default function TagFilterPool({
  libraryId,
  value,
  onChange
}: TagFilterPoolProps): React.JSX.Element {
  const [tags, setTags] = useState<Array<{ id: number; name: string; is_hidden: number }>>([])

  const load = useCallback(async () => {
    const t = await api.getLibraryTags(libraryId)
    setTags(t)
  }, [libraryId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => api.onTagsUpdated(() => load()), [load])

  // Hidden tags enter/leave the filterable set when the toggle flips.
  useEffect(() => api.onHiddenContentVisibilityChanged(() => load()), [load])

  const cycle =(tagId: number): void => {
    const current = value[tagId]
    const next: Record<number, TagFilterState> = { ...value }
    if (current === undefined) {
      next[tagId] = 'included'
    } else if (current === 'included') {
      next[tagId] = 'excluded'
    } else {
      delete next[tagId]
    }
    onChange(next)
  }

  const handleClear = (): void => {
    onChange({})
  }

  const hasSelection = Object.keys(value).length > 0

  if (tags.length === 0) {
    return (
      <div className="text-sm text-[var(--muted-foreground)]">
        No tags yet. Add tags from a comic to filter by them.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => {
        const state = value[tag.id]
        let cls = 'border-[var(--border)] hover:bg-[var(--secondary)]'
        if (state === 'included') cls = 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
        else if (state === 'excluded') cls = 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => cycle(tag.id)}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${cls}`}
            title={tag.is_hidden === 1 ? 'Hidden tag' : undefined}
          >
            {tag.is_hidden === 1 && (
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            )}
            {tag.name}
          </button>
        )
      })}
      {hasSelection && (
        <button
          type="button"
          onClick={handleClear}
          className="ml-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
