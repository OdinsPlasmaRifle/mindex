import { useState, useEffect } from 'react'
import { api } from './api'

interface HiddenContentState {
  /** The persisted "Enable Hidden Content" setting. */
  enabled: boolean
  /** Session-only reveal state. Always false when `enabled` is false. */
  visible: boolean
}

export function useHiddenContent(): HiddenContentState {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    api.getHiddenContentEnabled().then(setEnabled)
    api.getHiddenContentVisible().then(setVisible)
  }, [])

  useEffect(() => api.onHiddenContentToggled(setEnabled), [])
  useEffect(() => api.onHiddenContentVisibilityChanged(setVisible), [])

  // Deliberately no toggle helper: revealing must go through the PIN check in
  // HiddenContentToggle, so callers can't bypass it.
  return { enabled, visible }
}
