import { useSyncExternalStore } from 'react'
import { CheckIcon, SpinnerIcon, WarningIcon } from './icons'

type Variant = 'progress' | 'success' | 'error'
type Status = { message: string; variant: Variant } | null

/** How long a self-dismissing toast stays up, per variant. */
const AUTO_DISMISS_MS: Record<Exclude<Variant, 'progress'>, number> = {
  success: 3000,
  error: 6000
}

let current: Status = null
let autoDismissTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of [...listeners]) listener()
}

function clearAutoDismiss(): void {
  if (autoDismissTimer !== null) {
    clearTimeout(autoDismissTimer)
    autoDismissTimer = null
  }
}

function show(message: string, variant: Variant): void {
  clearAutoDismiss()
  current = { message, variant }
  notify()
}

/** Clears the toast only if `message` is still the one on screen. */
function dismissIfCurrent(message: string): void {
  if (current?.message === message) {
    current = null
    notify()
  }
}

/**
 * Shows an in-progress toast with a spinner. Returns a dismiss function the
 * caller must invoke when the work finishes — use `showSuccess`/`showError` for
 * anything already complete.
 */
export function showStatus(message: string): () => void {
  show(message, 'progress')
  return () => dismissIfCurrent(message)
}

/**
 * Reports a finished action and clears itself. Callers hold no handle, which is
 * what distinguishes these from `showStatus`: an outcome has no duration to
 * track, so pairing it with a manual timeout only invited spinner-after-the-fact.
 */
function showOutcome(message: string, variant: Exclude<Variant, 'progress'>): void {
  show(message, variant)
  autoDismissTimer = setTimeout(() => {
    autoDismissTimer = null
    dismissIfCurrent(message)
  }, AUTO_DISMISS_MS[variant])
}

export function showSuccess(message: string): void {
  showOutcome(message, 'success')
}

export function showError(message: string): void {
  showOutcome(message, 'error')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Status {
  return current
}

const BORDER: Record<Variant, string> = {
  progress: 'border-[var(--border)]',
  success: 'border-[var(--border)]',
  error: 'border-red-500'
}

export default function StatusToast(): React.JSX.Element | null {
  const status = useSyncExternalStore(subscribe, getSnapshot)

  if (!status) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--card)] border shadow-lg text-sm text-[var(--foreground)] ${BORDER[status.variant]}`}
    >
      {status.variant === 'error' && <WarningIcon className="w-4 h-4 shrink-0 text-red-500" />}
      {status.variant === 'success' && <CheckIcon className="w-4 h-4 shrink-0 text-green-500" />}
      {status.variant === 'progress' && (
        <SpinnerIcon className="w-4 h-4 shrink-0 text-[var(--primary)]" />
      )}
      {status.message}
    </div>
  )
}
