import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'
import type { TagLevel, TagResource, TagWithSource } from '../types'

interface TagPoolProps {
  level: TagLevel
  entityId: number
  resource: TagResource
  size?: 'normal' | 'compact'
  className?: string
  libraryIsHidden?: boolean
}

async function fetchTags(level: TagLevel, entityId: number): Promise<TagWithSource[]> {
  if (level === 'comic') return api.getComicTags(entityId)
  if (level === 'volume') return api.getVolumeTags(entityId)
  return api.getChapterTags(entityId)
}

function HiddenIcon({ className = 'w-3 h-3' }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function TagPool({
  level,
  entityId,
  resource,
  size = 'normal',
  className = '',
  libraryIsHidden = false
}: TagPoolProps): React.JSX.Element {
  const [tags, setTags] = useState<TagWithSource[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: number; name: string; is_hidden: number }>>([])
  const [createHidden, setCreateHidden] = useState(libraryIsHidden)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const load = useCallback(async () => {
    const t = await fetchTags(level, entityId)
    setTags(t)
  }, [level, entityId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => api.onTagsUpdated(() => load()), [load])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!pickerOpen) return
    let cancelled = false
    api.listTags(resource, debouncedQuery, 20, libraryIsHidden).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [pickerOpen, debouncedQuery, resource, libraryIsHidden])

  useEffect(() => {
    if (!pickerOpen) return
    const onMouseDown = (e: MouseEvent): void => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  useEffect(() => {
    if (pickerOpen) {
      setQuery('')
      setDebouncedQuery('')
      setCreateHidden(libraryIsHidden)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [pickerOpen, libraryIsHidden])

  const directIds = new Set(tags.filter((t) => t.direct === 1).map((t) => t.id))
  const trimmed = query.trim()
  const filteredResults = results.filter((r) => !directIds.has(r.id))
  const exactMatch = filteredResults.some((r) => r.name.toLowerCase() === trimmed.toLowerCase())
  const showCreate = trimmed.length > 0 && !exactMatch

  const compact = size === 'compact'
  const chipBase = compact
    ? 'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full border'
    : 'inline-flex items-center gap-1.5 text-sm px-2 py-0.5 rounded-full border'

  const handleDetach = async (tagId: number): Promise<void> => {
    await api.detachTag(level, entityId, tagId)
  }

  const handleAttach = async (tagId: number): Promise<void> => {
    await api.attachTag(level, entityId, tagId)
    setPickerOpen(false)
  }

  const handleCreate = async (): Promise<void> => {
    if (!trimmed) return
    const created = await api.createTag(trimmed, resource, createHidden)
    await api.attachTag(level, entityId, created.id)
    setPickerOpen(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return
    const onlyResult = filteredResults.length === 1 && !showCreate
    const onlyCreate = filteredResults.length === 0 && showCreate
    if (onlyResult) {
      e.preventDefault()
      handleAttach(filteredResults[0].id)
    } else if (onlyCreate) {
      e.preventDefault()
      handleCreate()
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {tags.map((tag) => {
        const isHidden = tag.is_hidden === 1
        const label = (
          <>
            {isHidden && <HiddenIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
            <span>{tag.name}</span>
            {tag.count > 1 && <span className="text-[var(--muted-foreground)]">({tag.count})</span>}
          </>
        )
        return tag.direct === 1 ? (
          <span
            key={tag.id}
            className={`${chipBase} border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)]`}
            title={isHidden ? 'Hidden tag' : undefined}
          >
            {label}
            <button
              type="button"
              onClick={() => handleDetach(tag.id)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors leading-none"
              aria-label={`Remove tag ${tag.name}`}
            >
              <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ) : (
          <span
            key={tag.id}
            className={`${chipBase} border-[var(--border)] text-[var(--foreground)]`}
            title={isHidden ? 'Hidden tag · inherited from a lower level' : 'Inherited from a lower level'}
          >
            {label}
          </span>
        )
      })}

      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={`${chipBase} border-dashed border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)] transition-colors cursor-pointer`}
          aria-label="Add tag"
        >
          <svg className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {!compact && <span>Tag</span>}
        </button>

        {pickerOpen && (
          <div className="absolute z-20 left-0 top-full mt-1 w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden">
            <div className="p-2 border-b border-[var(--border)]">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search or create..."
                className="w-full text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              />
              {showCreate && (
                <label className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createHidden}
                    onChange={(e) => setCreateHidden(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <HiddenIcon className="w-3 h-3" />
                  <span>Hidden tag</span>
                </label>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleAttach(r.id)}
                  className="w-full text-left text-sm px-3 py-1.5 hover:bg-[var(--secondary)] transition-colors flex items-center gap-1.5"
                >
                  {r.is_hidden === 1 && <HiddenIcon className="w-3 h-3 text-[var(--muted-foreground)]" />}
                  <span>{r.name}</span>
                </button>
              ))}
              {filteredResults.length === 0 && !showCreate && (
                <div className="px-3 py-2 text-xs text-[var(--muted-foreground)]">No tags found</div>
              )}
              {showCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full text-left text-sm px-3 py-1.5 hover:bg-[var(--secondary)] transition-colors border-t border-[var(--border)] flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {createHidden && <HiddenIcon className="w-3 h-3" />}
                  Create &ldquo;{trimmed}&rdquo;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
