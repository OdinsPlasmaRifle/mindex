import { useState, useEffect, useRef } from 'react'
import { CloseIcon, SearchIcon } from './icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /**
   * Render as a magnifying-glass button that expands into the full field on
   * click, so an unused search takes up no more room than its neighbours in a
   * button row. An active search keeps the field expanded.
   */
  collapsible?: boolean
}

export default function SearchBar({
  value,
  onChange,
  placeholder,
  collapsible = false
}: SearchBarProps): React.JSX.Element {
  const [local, setLocal] = useState(value)
  const [opened, setOpened] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local)
    }, 300)
    return () => clearTimeout(timer)
  }, [local, value, onChange])

  // A pending keystroke counts as active too, so the field never collapses out
  // from under someone mid-type while the debounce is still in flight.
  const expanded = !collapsible || opened || local !== '' || value !== ''

  const handleClear = (): void => {
    setLocal('')
    onChange('')
    setOpened(false)
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpened(true)
          // Focus after the input mounts.
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        title="Search"
        aria-label="Search"
        className="flex items-center gap-1.5 px-3 py-1 text-sm rounded border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
      >
        {/*
          h-5 reproduces the 20px line box that a text label would create. Without
          it the icon alone is only 16px tall, making this button 4px shorter than
          both its text siblings and the expanded field — so expanding the search
          reflowed everything below it.
        */}
        <span className="flex items-center h-5">
          <SearchIcon />
        </span>
      </button>
    )
  }

  return (
    <div className={`relative ${collapsible ? 'w-full max-w-xs' : 'w-full max-w-md'}`}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder ?? 'Search by name or author...'}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          // Collapse again once an empty field loses focus.
          if (collapsible && !local) setOpened(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            if (local) handleClear()
            else setOpened(false)
          }
        }}
        className={`w-full pl-10 pr-9 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] ${
          collapsible ? 'py-1 text-sm' : 'py-2'
        }`}
      />
      {local && (
        <button
          onClick={handleClear}
          title="Clear search"
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}
