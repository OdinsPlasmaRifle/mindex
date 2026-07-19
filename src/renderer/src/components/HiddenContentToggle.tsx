import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useHiddenContent } from '../lib/useHiddenContent'
import PinPromptModal from './PinPromptModal'
import { EyeIcon, EyeOffIcon } from './icons'

/**
 * Floating top-right control that reveals or conceals hidden content for the
 * session. Renders nothing unless hidden content is enabled in Settings.
 */
export default function HiddenContentToggle(): React.JSX.Element | null {
  const { enabled, visible } = useHiddenContent()
  const [pinPromptOpen, setPinPromptOpen] = useState(false)

  // The Preferences menu item asks the renderer to collect the PIN.
  useEffect(() => api.onHiddenContentPinRequired(() => setPinPromptOpen(true)), [])

  const handleClick = async (): Promise<void> => {
    if (visible) {
      // Concealing never requires a PIN.
      await api.setHiddenContentVisible(false)
      return
    }
    if (await api.hasHiddenContentPin()) {
      setPinPromptOpen(true)
      return
    }
    await api.setHiddenContentVisible(true)
  }

  if (!enabled) return null

  return (
    <>
      <PinPromptModal
        open={pinPromptOpen}
        onCancel={() => setPinPromptOpen(false)}
        onSuccess={() => setPinPromptOpen(false)}
      />
      <button
        type="button"
        onClick={handleClick}
        title={visible ? 'Hide hidden content' : 'Show hidden content'}
        aria-label={visible ? 'Hide hidden content' : 'Show hidden content'}
        aria-pressed={visible}
        className={`fixed top-5 right-6 z-30 p-1.5 rounded-md border transition-colors ${
          visible
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
            : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]'
        }`}
      >
        {visible ? <EyeIcon /> : <EyeOffIcon />}
      </button>
    </>
  )
}
