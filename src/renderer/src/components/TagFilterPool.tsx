import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { onHiddenContentVisibilityChanged, onTagsUpdated } from '../lib/ipcEvents'
import type { TagFilterState } from '../types'
import { HiddenIcon } from './icons'

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

  useEffect(() => onTagsUpdated(() => load()), [load])

  // Hidden tags enter/leave the filterable set when the toggle flips.
  useEffect(() => onHiddenContentVisibilityChanged(() => load()), [load])

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
              <HiddenIcon className="w-3 h-3" />
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
