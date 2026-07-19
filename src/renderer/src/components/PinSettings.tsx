import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import PinInput, { PIN_LENGTH } from './PinInput'
import Modal from './Modal'
import { EyeIcon, EyeOffIcon } from './icons'

type Mode = 'set' | 'change' | 'remove'
/** set: new → confirm.  change: current → new → confirm.  remove: current. */
type Step = 'current' | 'new' | 'confirm'

function RevealToggle({
  revealed,
  onToggle
}: {
  revealed: boolean
  onToggle(): void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={revealed}
      title={revealed ? 'Hide PIN' : 'Show PIN'}
      aria-label={revealed ? 'Hide PIN' : 'Show PIN'}
      className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
    >
      {revealed ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
    </button>
  )
}

function ImportantNote(): React.JSX.Element {
  return (
    <div className="mt-4 p-3 rounded-md border border-amber-500/30 bg-amber-500/5">
      <p className="text-xs font-medium text-amber-500 mb-1">Important</p>
      <p className="text-xs text-[var(--muted-foreground)]">
        Your PIN cannot be recovered or reset if you forget it. It is not included in backups, and
        the only way to clear a forgotten PIN is to erase all data. Keep it somewhere safe.
      </p>
    </div>
  )
}

const BUTTON =
  'px-3 py-1.5 text-sm rounded-md border border-[var(--border)] hover:bg-[var(--secondary)] transition-colors'
const PRIMARY =
  'px-3 py-1.5 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-50 transition-colors'
const DANGER =
  'px-3 py-1.5 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors'

/**
 * PIN management for hidden content. Settings shows only the entry buttons —
 * the whole set/change/remove flow runs inside a single stepped modal.
 */
export default function PinSettings(): React.JSX.Element {
  const [hasPin, setHasPin] = useState(false)
  const [mode, setMode] = useState<Mode | null>(null)
  const [step, setStep] = useState<Step>('new')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setHasPin(await api.hasHiddenContentPin())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const open = (next: Mode): void => {
    setMode(next)
    setStep(next === 'set' ? 'new' : 'current')
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setRevealed(false)
    setError(null)
    setNotice(null)
  }

  const close = (): void => {
    if (busy) return
    setMode(null)
    setCurrentPin('')
    setNewPin('')
    setConfirmPin('')
    setRevealed(false)
    setError(null)
  }

  // These take the value explicitly: when called from onComplete the matching
  // state has not re-rendered yet, so reading it here would be one digit stale.

  /** Step 1 of the change flow: prove access before revealing the rest. */
  const verifyCurrent = async (pin?: string): Promise<void> => {
    const candidate = pin ?? currentPin
    if (candidate.length !== PIN_LENGTH) return
    setBusy(true)
    const result = await api.verifyHiddenContentPin(candidate)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Current PIN is incorrect.')
      setCurrentPin('')
      return
    }
    setError(null)
    setStep('new')
  }

  const goToConfirm = (pin?: string): void => {
    if ((pin ?? newPin).length !== PIN_LENGTH) {
      setError(`PIN must be exactly ${PIN_LENGTH} digits.`)
      return
    }
    setError(null)
    setConfirmPin('')
    setStep('confirm')
  }

  const handleSave = async (candidate: string): Promise<void> => {
    if (candidate !== newPin) {
      setError('PINs do not match.')
      setConfirmPin('')
      return
    }
    setBusy(true)
    const result = await api.setHiddenContentPin(mode === 'change' ? currentPin : null, newPin)
    setBusy(false)
    if (!result.ok) {
      // The current PIN was accepted earlier but rejected now (changed
      // elsewhere, or a lockout kicked in) — send them back to prove it again.
      setStep(mode === 'change' ? 'current' : 'new')
      setCurrentPin('')
      setConfirmPin('')
      setError(result.error ?? 'Could not save PIN.')
      return
    }
    const wasChange = mode === 'change'
    close()
    await refresh()
    setNotice(wasChange ? 'PIN changed.' : 'PIN set.')
  }

  const handleRemove = async (): Promise<void> => {
    setBusy(true)
    const result = await api.clearHiddenContentPin(currentPin)
    setBusy(false)
    if (!result.ok) {
      setCurrentPin('')
      setError(result.error ?? 'Could not remove PIN.')
      return
    }
    close()
    await refresh()
    setNotice('PIN removed.')
  }

  const reveal = <RevealToggle revealed={revealed} onToggle={() => setRevealed((r) => !r)} />

  const title =
    step === 'confirm'
      ? 'Confirm your PIN'
      : mode === 'remove'
        ? 'Remove PIN'
        : mode === 'change'
          ? step === 'current'
            ? 'Change PIN'
            : 'New PIN'
          : 'Set PIN'

  const description =
    step === 'confirm'
      ? 'Re-enter the PIN to make sure it was typed correctly.'
      : step === 'current'
        ? mode === 'remove'
          ? 'Enter your current PIN to stop requiring it for hidden content.'
          : 'Enter your current PIN to continue.'
        : `Choose a ${PIN_LENGTH}-digit PIN. You will need it every time you show hidden content.`

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium">PIN</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            {hasPin
              ? 'A PIN is required to show hidden content.'
              : `Set a ${PIN_LENGTH}-digit PIN to require it before showing hidden content.`}
          </p>
          {notice && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{notice}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button" className={BUTTON} onClick={() => open(hasPin ? 'change' : 'set')}>
            {hasPin ? 'Change PIN' : 'Set PIN'}
          </button>
          {hasPin && (
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded-md text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-colors"
              onClick={() => open('remove')}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <Modal
        open={mode !== null}
        onClose={close}
        title={title}
        description={description}
        footer={
          <>
            {/* Back returns to the previous step; on a first step it cancels. */}
            {step === 'current' || (step === 'new' && mode === 'set') ? (
              <button type="button" onClick={close} disabled={busy} className={BUTTON}>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStep(step === 'confirm' ? 'new' : 'current')
                  setError(null)
                }}
                disabled={busy}
                className={BUTTON}
              >
                Back
              </button>
            )}

            {step === 'current' && mode === 'remove' && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={currentPin.length !== PIN_LENGTH || busy}
                className={DANGER}
              >
                {busy ? 'Removing...' : 'Remove PIN'}
              </button>
            )}

            {step === 'current' && mode === 'change' && (
              <button
                type="button"
                onClick={() => verifyCurrent()}
                disabled={currentPin.length !== PIN_LENGTH || busy}
                className={PRIMARY}
              >
                {busy ? 'Checking...' : 'Continue'}
              </button>
            )}

            {step === 'new' && (
              <button
                type="button"
                onClick={() => goToConfirm()}
                disabled={newPin.length !== PIN_LENGTH || busy}
                className={PRIMARY}
              >
                Continue
              </button>
            )}

            {step === 'confirm' && (
              <button
                type="button"
                onClick={() => handleSave(confirmPin)}
                disabled={confirmPin.length !== PIN_LENGTH || busy}
                className={PRIMARY}
              >
                {busy ? 'Saving...' : mode === 'change' ? 'Change PIN' : 'Set PIN'}
              </button>
            )}
          </>
        }
      >
        {step === 'current' ? (
          <PinInput
            key="current"
            label="Current PIN"
            value={currentPin}
            onChange={(v) => {
              setCurrentPin(v)
              setError(null)
            }}
            // Auto-advance on change, but never auto-trigger the destructive removal.
            onComplete={mode === 'change' ? verifyCurrent : undefined}
            autoFocus
            disabled={busy}
            invalid={error !== null}
            reveal={revealed}
            action={reveal}
          />
        ) : step === 'new' ? (
          <PinInput
            key="new"
            label={mode === 'change' ? 'New PIN' : 'PIN'}
            value={newPin}
            onChange={(v) => {
              setNewPin(v)
              setError(null)
            }}
            onComplete={goToConfirm}
            autoFocus
            disabled={busy}
            invalid={error !== null}
            reveal={revealed}
            action={reveal}
          />
        ) : (
          <PinInput
            key="confirm"
            label="Confirm PIN"
            value={confirmPin}
            onChange={(v) => {
              setConfirmPin(v)
              setError(null)
            }}
            onComplete={handleSave}
            autoFocus
            disabled={busy}
            invalid={error !== null}
            reveal={revealed}
            action={reveal}
          />
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {mode !== 'remove' && step !== 'current' && <ImportantNote />}
      </Modal>
    </div>
  )
}
