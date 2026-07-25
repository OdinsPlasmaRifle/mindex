import { BrowserWindow } from 'electron'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDb } from './db'

// Rebuilding the application menu is owned by the main entry point; this module
// only needs to ask for it after state changes that the menu reflects.
let onMenuRebuild: (() => void) | null = null

export function setMenuRebuildCallback(cb: () => void): void {
  onMenuRebuild = cb
}

export function getHiddenContentEnabled(): boolean {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'hidden_content_enabled'").get() as
    | { value: string }
    | undefined
  return row?.value === '1'
}

export function setHiddenContentEnabled(enabled: boolean): void {
  const db = getDb()
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('hidden_content_enabled', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(enabled ? '1' : '0')
  // Turning the feature off always collapses hidden content back out of view.
  if (!enabled) hiddenContentVisible = false
}

// Session-only: whether hidden content is currently revealed. Never persisted —
// it resets to false every time the app starts.
let hiddenContentVisible = false

export function getHiddenContentVisible(): boolean {
  return getHiddenContentEnabled() && hiddenContentVisible
}

export function setHiddenContentVisible(visible: boolean): void {
  hiddenContentVisible = visible && getHiddenContentEnabled()
}

// --- Hidden content PIN -----------------------------------------------------
// The PIN is stored only as a salted scrypt hash and is verified here in the
// main process; the renderer never receives the hash and cannot bypass a check.

export const PIN_LENGTH = 5

const PIN_PATTERN = new RegExp(`^\\d{${PIN_LENGTH}}$`)

function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_PATTERN.test(pin)
}

function readPinRecord(): { salt: Buffer; hash: Buffer } | null {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'hidden_content_pin'").get() as
    | { value: string }
    | undefined
  if (!row?.value) return null
  const [scheme, saltHex, hashHex] = row.value.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return null
  return { salt: Buffer.from(saltHex, 'hex'), hash: Buffer.from(hashHex, 'hex') }
}

function writePinRecord(pin: string): void {
  const salt = randomBytes(16)
  const hash = scryptSync(pin, salt, 32)
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES ('hidden_content_pin', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(`scrypt$${salt.toString('hex')}$${hash.toString('hex')}`)
}

export function hasHiddenContentPin(): boolean {
  return readPinRecord() !== null
}

// Escalating delay after consecutive wrong PINs, so a 5-digit space isn't
// trivially brute-forceable. Resets on success and on app restart.
let failedPinAttempts = 0
let pinLockedUntil = 0

function pinLockRemainingMs(): number {
  return Math.max(0, pinLockedUntil - Date.now())
}

export function verifyHiddenContentPin(pin: unknown): boolean {
  const record = readPinRecord()
  if (!record) return true // no PIN configured — nothing to check
  if (pinLockRemainingMs() > 0) return false
  if (!isValidPinFormat(pin)) return false

  const candidate = scryptSync(pin, record.salt, record.hash.length)
  const ok = candidate.length === record.hash.length && timingSafeEqual(candidate, record.hash)

  if (ok) {
    failedPinAttempts = 0
    pinLockedUntil = 0
  } else {
    failedPinAttempts += 1
    if (failedPinAttempts >= 3) {
      pinLockedUntil = Date.now() + Math.min(30_000, 2 ** (failedPinAttempts - 3) * 1000)
    }
  }
  return ok
}

/** Error text for a rejected PIN, accounting for an active lockout. */
export function pinFailureMessage(): string {
  const wait = pinLockRemainingMs()
  return wait > 0
    ? `Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.`
    : 'Current PIN is incorrect.'
}

export function setHiddenContentPin(
  currentPin: unknown,
  newPin: unknown
): { ok: true } | { ok: false; error: string } {
  if (hasHiddenContentPin() && !verifyHiddenContentPin(currentPin)) {
    return { ok: false, error: pinFailureMessage() }
  }
  if (!isValidPinFormat(newPin)) {
    return { ok: false, error: `PIN must be exactly ${PIN_LENGTH} digits.` }
  }
  writePinRecord(newPin)
  return { ok: true }
}

export function clearHiddenContentPin(currentPin: unknown): { ok: true } | { ok: false; error: string } {
  if (!hasHiddenContentPin()) return { ok: true }
  if (!verifyHiddenContentPin(currentPin)) {
    return { ok: false, error: pinFailureMessage() }
  }
  getDb().prepare("DELETE FROM settings WHERE key = 'hidden_content_pin'").run()
  return { ok: true }
}

/**
 * Reveal hidden content, prompting for the PIN first when one is configured.
 * Used by both the menu item and the renderer's toggle button.
 */
export function requestShowHiddenContent(): void {
  if (hasHiddenContentPin()) {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send('hidden-content-pin-required')
    }
    // Revert the menu checkbox — nothing is revealed until the PIN is accepted.
    if (onMenuRebuild) onMenuRebuild()
    return
  }
  setHiddenContentVisible(true)
  broadcastHiddenContentState()
}

/** Push the current enabled/visible pair to every window and rebuild the menu. */
export function broadcastHiddenContentState(): void {
  const enabled = getHiddenContentEnabled()
  const visible = getHiddenContentVisible()
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send('hidden-content-toggled', enabled)
    w.webContents.send('hidden-content-visibility-changed', visible)
  }
  if (onMenuRebuild) onMenuRebuild()
}
