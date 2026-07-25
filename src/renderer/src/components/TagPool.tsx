import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { onHiddenContentVisibilityChanged, onTagsUpdated } from '../lib/ipcEvents'
import type { TagLevel, TagResource, TagWithSource } from '../types'
import { useHiddenContent } from '../lib/useHiddenContent'
import { CloseIcon, HiddenIcon, PlusIcon } from './icons'

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
  const { enabled: hiddenEnabled, visible: hiddenVisible } = useHiddenContent()
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  // The menu is portalled to <body> so surrounding cards with `overflow-hidden`
  // cannot clip it; that means we position it ourselves against the button.
  const [menuPos, setMenuPos] = useState<{
    left: number
    top?: number
    bottom?: number
    maxHeight: number
  } | null>(null)

  const load = useCallback(async () => {
    const t = await fetchTags(level, entityId)
    setTags(t)
  }, [level, entityId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => onTagsUpdated(() => load()), [load])

  // Hidden tags appear/disappear from the attached list when the toggle flips.
  useEffect(() => onHiddenContentVisibilityChanged(() => load()), [load])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!pickerOpen) return
    let cancelled = false
    api.listTags(resource, debouncedQuery, 20, hiddenVisible).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [pickerOpen, debouncedQuery, resource, hiddenVisible])

  useEffect(() => {
    if (!pickerOpen) return
    const onMouseDown = (e: MouseEvent): void => {
      const target = e.target as Node
      if (pickerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setPickerOpen(false)
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

  const MENU_WIDTH = 256 // matches w-64
  const MENU_MARGIN = 8

  useLayoutEffect(() => {
    if (!pickerOpen) {
      setMenuPos(null)
      return
    }
    const reposition = (): void => {
      const anchor = pickerRef.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const spaceBelow = vh - rect.bottom - MENU_MARGIN
      const spaceAbove = rect.top - MENU_MARGIN
      // Flip above the button when the space below is too cramped to be usable.
      const flip = spaceBelow < 180 && spaceAbove > spaceBelow
      const maxHeight = Math.max(120, flip ? spaceAbove : spaceBelow)
      const left = Math.min(Math.max(MENU_MARGIN, rect.left), vw - MENU_WIDTH - MENU_MARGIN)
      // Anchoring by `bottom` when flipped means we never need to know the menu's height.
      setMenuPos(
        flip
          ? { left, bottom: vh - rect.top + 4, maxHeight }
          : { left, top: rect.bottom + 4, maxHeight }
      )
    }
    reposition()
    window.addEventListener('resize', reposition)
    // Capture phase so scrolling in any ancestor container keeps the menu anchored.
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
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
    const created = await api.createTag(trimmed, resource, hiddenEnabled && createHidden)
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
            className={`${chipBase} border-[var(--border)] text-[var(--foreground)]`}
            title={isHidden ? 'Hidden tag' : undefined}
          >
            {label}
            <button
              type="button"
              onClick={() => handleDetach(tag.id)}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors leading-none"
              aria-label={`Remove tag ${tag.name}`}
            >
              <CloseIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            </button>
          </span>
        ) : (
          <span
            key={tag.id}
            className={`${chipBase} border-[var(--border)] bg-[var(--secondary)] text-[var(--secondary-foreground)]`}
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
          <PlusIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          {!compact && <span>Tag</span>}
        </button>

        {pickerOpen &&
          menuPos &&
          createPortal(
            <div
              ref={menuRef}
              className="fixed z-50 w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg overflow-hidden flex flex-col"
              style={{
                left: menuPos.left,
                top: menuPos.top,
                bottom: menuPos.bottom,
                maxHeight: menuPos.maxHeight
              }}
            >
            <div className="p-2 border-b border-[var(--border)] shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search or create..."
                className="w-full text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
              />
              {showCreate && hiddenEnabled && (
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
            <div className="flex-1 min-h-0 max-h-48 overflow-y-auto">
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
                  <PlusIcon className="w-3.5 h-3.5" />
                  {createHidden && <HiddenIcon className="w-3 h-3" />}
                  Create &ldquo;{trimmed}&rdquo;
                </button>
              )}
            </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  )
}
