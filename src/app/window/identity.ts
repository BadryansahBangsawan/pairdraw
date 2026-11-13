import { IS_TAURI } from '@/constants'

/**
 * Every editor window is its own JavaScript realm, so module state is already per-window; what
 * module state cannot know is *which* window it is. The Tauri window label (`main`, `editor-2`, …)
 * is that identity, and it is the one name the native side, the MCP bridge and the tab strip can
 * all agree on. The browser build has one window and reports `main`.
 */
let label = 'main'

/** The label of this window: ready before anything creates a tab. */
export function windowLabel(): string {
  return label
}

/**
 * A document id that means the same thing inside and outside this realm. Tab ids stay local
 * (`tab-1` in every window); the id that leaves the window prefixes them with its label.
 */
export function windowDocumentId(tabId: string): string {
  return `${label}:${tabId}`
}

/** Splits `windowLabel:tabId`; null when the id carries no window, as a bare tab id does. */
export function parseWindowDocumentId(id: string): { window: string; tabId: string } | null {
  const separator = id.indexOf(':')
  if (separator <= 0 || separator === id.length - 1) return null
  return { window: id.slice(0, separator), tabId: id.slice(separator + 1) }
}

/**
 * The tab id an id from outside names in *this* window. A bare id means this window, because the
 * caller reached this realm; an id naming another window is not ours to answer for.
 */
export function localDocumentId(id: string): string | null {
  const parsed = parseWindowDocumentId(id)
  if (!parsed) return id
  return parsed.window === label ? parsed.tabId : null
}

/** Reads the label from the shell; null in the browser build, which has no shell to ask. */
async function readWindowLabel(): Promise<string | null> {
  if (!IS_TAURI) return null
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow().label
}

/**
 * Names this window, before the UI mounts so that no tab is created under the placeholder label.
 * `readLabel` exists for tests; the shell reader is the only production caller.
 */
export async function installWindowIdentity(
  readLabel: () => Promise<string | null> = readWindowLabel
): Promise<void> {
  const next = await readLabel()
  if (next) label = next
}
