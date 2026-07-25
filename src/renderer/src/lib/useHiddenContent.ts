import { useSyncExternalStore } from 'react'
import { api } from './api'
import { onHiddenContentToggled, onHiddenContentVisibilityChanged } from './ipcEvents'

interface HiddenContentState {
  /** The persisted "Enable Hidden Content" setting. */
  enabled: boolean
  /** Session-only reveal state. Always false when `enabled` is false. */
  visible: boolean
}

// One store for the whole app rather than per-hook state: a comic page renders a
// TagPool per chapter, and each consumer holding its own copy meant a pair of IPC
// round-trips and a pair of listeners per instance. This state is small and
// app-global, so it stays warm for the process lifetime instead of being torn
// down and re-fetched whenever the last consumer unmounts.
let state: HiddenContentState = { enabled: false, visible: false }
const listeners = new Set<() => void>()
let started = false

function update(patch: Partial<HiddenContentState>): void {
  const next = { ...state, ...patch }
  if (next.enabled === state.enabled && next.visible === state.visible) return
  state = next
  for (const listener of [...listeners]) listener()
}

function start(): void {
  if (started) return
  started = true
  api.getHiddenContentEnabled().then((enabled) => update({ enabled }))
  api.getHiddenContentVisible().then((visible) => update({ visible }))
  onHiddenContentToggled((enabled) => update({ enabled }))
  onHiddenContentVisibilityChanged((visible) => update({ visible }))
}

function subscribe(listener: () => void): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Identity stays stable while the values do, which is what useSyncExternalStore
// needs to avoid re-rendering on every store check.
function getSnapshot(): HiddenContentState {
  return state
}

// Deliberately no toggle helper: revealing must go through the PIN check in
// HiddenContentToggle, so callers can't bypass it.
export function useHiddenContent(): HiddenContentState {
  return useSyncExternalStore(subscribe, getSnapshot)
}
