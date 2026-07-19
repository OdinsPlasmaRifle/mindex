import { useRef, useEffect } from 'react'

export const PIN_LENGTH = 5

interface PinInputProps {
  value: string
  onChange(next: string): void
  /** Fired when the last digit is filled in. */
  onComplete?(value: string): void
  autoFocus?: boolean
  disabled?: boolean
  invalid?: boolean
  label?: string
  /** Show the digits instead of masking them. */
  reveal?: boolean
  /** Rendered immediately to the right of the digit boxes, e.g. a show/hide toggle. */
  action?: React.ReactNode
}

/**
 * Segmented digit entry: one box per digit, auto-advancing, with backspace,
 * arrow-key and paste handling.
 */
export default function PinInput({
  value,
  onChange,
  onComplete,
  autoFocus = false,
  disabled = false,
  invalid = false,
  label,
  reveal = false,
  action
}: PinInputProps): React.JSX.Element {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus()
  }, [autoFocus])

  const commit = (next: string): void => {
    onChange(next)
    if (next.length === PIN_LENGTH) onComplete?.(next)
  }

  const focusBox = (index: number): void => {
    inputs.current[Math.max(0, Math.min(PIN_LENGTH - 1, index))]?.focus()
  }

  const handleChange = (index: number, raw: string): void => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return
    // Typing or pasting fills from the active box onward.
    const next = (value.slice(0, index) + digits).slice(0, PIN_LENGTH)
    commit(next)
    focusBox(next.length)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (value[index]) {
        commit(value.slice(0, index))
        focusBox(index)
      } else {
        commit(value.slice(0, Math.max(0, index - 1)))
        focusBox(index - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(index + 1)
    }
  }

  const boxes = Array.from({ length: PIN_LENGTH }, (_, i) => i)

  return (
    <div>
      {label && <div className="text-xs text-[var(--muted-foreground)] mb-1.5">{label}</div>}
      <div className="flex items-center gap-2">
        {boxes.map((i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            type={reveal ? 'text' : 'password'}
            inputMode="numeric"
            autoComplete="off"
            maxLength={1}
            disabled={disabled}
            value={value[i] ?? ''}
            aria-label={`${label ?? 'PIN'} digit ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-13 text-center text-xl font-semibold rounded-lg border bg-[var(--background)] text-[var(--foreground)] transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${
              invalid
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[var(--border)] focus:ring-[var(--ring)] focus:border-[var(--ring)]'
            }`}
            style={{ height: '3rem' }}
          />
        ))}
        {action && <div className="ml-1 shrink-0">{action}</div>}
      </div>
    </div>
  )
}
