import { BROWSER_DEVICES, normalizeZoom, type BrowserDevice } from './state'
import { browserURLPolicy, type BrowserURLRejection } from './url'

/** Why the toolbar will not ask the window to move. `desktop` means this build has no window. */
export type BrowserToolbarRefusal = BrowserURLRejection | 'desktop'

export type BrowserToolbarDecision<T> =
  | { ok: true; value: T }
  | { ok: false; reason: BrowserToolbarRefusal }

/**
 * The address the toolbar may hand to the window. The browser build has no window, so it refuses
 * before the policy runs. A bare host is normalized here; Rust only accepts a full http(s) URL.
 */
export function browserAddressRequest(
  input: string,
  desktop: boolean
): BrowserToolbarDecision<string> {
  if (!desktop) return { ok: false, reason: 'desktop' }
  const policy = browserURLPolicy(input)
  if (!policy.ok) return { ok: false, reason: policy.reason }
  return { ok: true, value: policy.url }
}

/** Zoom the toolbar may store, clamped to the offered range. The browser build cannot apply it. */
export function browserZoomRequest(
  percent: number,
  desktop: boolean
): BrowserToolbarDecision<number> {
  if (!desktop) return { ok: false, reason: 'desktop' }
  return { ok: true, value: normalizeZoom(percent) }
}

/** The window says this when the user leaves an element pick without choosing. */
export const BROWSER_PICK_CANCELLED = 'The pick was cancelled'

/** A capture failure, or a quiet cancel the toolbar should not treat as a crash. */
export function browserCaptureFailure(
  error: unknown
): { cancelled: true } | { cancelled: false; detail: string } {
  const detail = error instanceof Error ? error.message : String(error)
  if (detail === BROWSER_PICK_CANCELLED) return { cancelled: true }
  return { cancelled: false, detail }
}

/** The device preset the toolbar may apply. An unknown id is the desktop size. */
export function browserDeviceRequest(
  id: string,
  desktop: boolean
): BrowserToolbarDecision<BrowserDevice> {
  if (!desktop) return { ok: false, reason: 'desktop' }
  const device = BROWSER_DEVICES.find((entry) => entry.id === id) ?? BROWSER_DEVICES[0]
  return { ok: true, value: device }
}
