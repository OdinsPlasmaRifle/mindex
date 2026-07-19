import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import PinInput, { PIN_LENGTH } from './PinInput'
import Modal from './Modal'

interface PinPromptModalProps {
  open: boolean
  onCancel(): void
  onSuccess(): void
}

/** Modal asking for the hidden-content PIN before revealing hidden content. */
export default function PinPromptModal({
  open,
  onCancel,
  onSuccess
}: PinPromptModalProps): React.JSX.Element | null {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setPin('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  const submit = useCallback(
    async (candidate: string) => {
      if (candidate.length !== PIN_LENGTH || busy) return
      setBusy(true)
      const result = await api.setHiddenContentVisible(true, candidate)
      setBusy(false)
      if (result.ok) {
        onSuccess()
      } else {
        setError(result.error ?? 'Incorrect PIN.')
        setPin('')
      }
    },
    [busy, onSuccess]
  )

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Enter PIN"
      description="Your PIN is required to show hidden content."
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => submit(pin)}
            disabled={pin.length !== PIN_LENGTH || busy}
            className="px-3 py-1.5 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-50 transition-colors"
          >
            {busy ? 'Checking...' : 'Unlock'}
          </button>
        </>
      }
    >
      <PinInput
        value={pin}
        onChange={(v) => {
          setPin(v)
          setError(null)
        }}
        onComplete={submit}
        autoFocus
        disabled={busy}
        invalid={error !== null}
      />
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </Modal>
  )
}
