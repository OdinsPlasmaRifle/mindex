import { useState, useRef, useEffect } from 'react'
import type { ComicSort, ComicSortBy, SortDir } from '../types'
import { ArrowDownIcon, ArrowUpIcon, SortIcon } from './icons'

interface SortOption {
  by: ComicSortBy
  label: string
}

const OPTIONS: SortOption[] = [
  { by: 'added', label: 'Added' },
  { by: 'name', label: 'Name' },
  { by: 'author', label: 'Author' }
]

function ArrowIcon({ dir }: { dir: SortDir }): React.JSX.Element {
  return dir === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />
}

interface SortMenuProps {
  value: ComicSort
  onChange: (next: ComicSort) => void
  /** Restrict the menu to a subset of the sort keys. */
  options?: ComicSortBy[]
}

export default function SortMenu({ value, onChange, options }: SortMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Dismiss on outside click or Escape, so the popover behaves like a menu.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent): void => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const shown = options ? OPTIONS.filter((o) => options.includes(o.by)) : OPTIONS
  const activeLabel = shown.find((o) => o.by === value.by)?.label ?? shown[0].label

  // Picking a different key starts at descending; picking the active key flips it.
  const select = (by: ComicSortBy): void => {
    onChange(by === value.by ? { by, dir: value.dir === 'desc' ? 'asc' : 'desc' } : { by, dir: 'desc' })
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded border transition-colors ${
          open
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
            : 'border-[var(--border)] hover:bg-[var(--secondary)]'
        }`}
      >
        <SortIcon />
        {activeLabel}
        <ArrowIcon dir={value.dir} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 z-20 min-w-[11rem] p-1 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg"
        >
          {shown.map((option) => {
            const active = option.by === value.by
            return (
              <button
                key={option.by}
                type="button"
                role="menuitem"
                onClick={() => select(option.by)}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
                  active
                    ? 'bg-[var(--secondary)] font-medium'
                    : 'hover:bg-[var(--secondary)] text-[var(--muted-foreground)]'
                }`}
              >
                {option.label}
                {active && <ArrowIcon dir={value.dir} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
