import { api } from './api'

type Unsubscribe = () => void

/**
 * Wraps a preload `on*` subscription so that N renderer subscribers share a
 * single underlying ipcRenderer listener.
 *
 * Subscribing directly instead adds one listener per component instance, and a
 * page rendering a TagPool per chapter blows past Node's 10-listener default —
 * which surfaces as MaxListenersExceededWarning, not as a real leak, but the
 * warning is indistinguishable from one. The underlying listener is attached on
 * the first subscriber and detached when the last one leaves, so an idle app
 * holds none.
 */
function shared<T>(subscribe: (cb: (value: T) => void) => Unsubscribe) {
  const subscribers = new Set<(value: T) => void>()
  let detach: Unsubscribe | null = null

  return (callback: (value: T) => void): Unsubscribe => {
    subscribers.add(callback)
    if (!detach) {
      // Iterate a copy: a subscriber may unsubscribe (or subscribe) while notifying.
      detach = subscribe((value) => {
        for (const subscriber of [...subscribers]) subscriber(value)
      })
    }
    return () => {
      subscribers.delete(callback)
      if (subscribers.size === 0 && detach) {
        detach()
        detach = null
      }
    }
  }
}

export const onComicsUpdated = shared<void>((cb) => api.onComicsUpdated(cb))
export const onTagsUpdated = shared<void>((cb) => api.onTagsUpdated(cb))
export const onImportStarted = shared<void>((cb) => api.onImportStarted(cb))
export const onImportFinished = shared<void>((cb) => api.onImportFinished(cb))
export const onHiddenContentToggled = shared<boolean>((cb) => api.onHiddenContentToggled(cb))
export const onHiddenContentVisibilityChanged = shared<boolean>((cb) =>
  api.onHiddenContentVisibilityChanged(cb)
)
export const onHiddenContentPinRequired = shared<void>((cb) => api.onHiddenContentPinRequired(cb))
