import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose(): void
  title: string
  description?: string
  children: React.ReactNode
  /** Rendered in the footer, right-aligned. */
  footer?: React.ReactNode
}

/** Centered dialog with a dimmed backdrop, Escape-to-close and click-outside-to-close. */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer
}: ModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-[23rem] rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
      >
        <h2 className="text-base font-semibold mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-[var(--muted-foreground)] mb-5">{description}</p>
        )}
        {children}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
