import { toUint8Array } from 'js-base64'

import {
  markClosed,
  markLoadFailed,
  markNavigating,
  markPageLoaded,
  type BrowserPageReport
} from './state'

/**
 * The desktop shell owns the browser window: the page must load in a webview our commands cannot
 * be reached from, so every move is a command to Rust and every report comes back as an event.
 * Nothing here runs in the browser build, and Tauri is loaded lazily so that build never sees it.
 *
 * A refused address arrives as the Rust error string, which the caller shows; the session keeps
 * the address it had.
 */

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>

let bridge: Promise<{
  invoke: Invoke
  listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>
}> | null = null

function tauri() {
  bridge ??= Promise.all([import('@tauri-apps/api/core'), import('@tauri-apps/api/event')]).then(
    ([core, event]) => ({
      invoke: core.invoke as Invoke,
      listen: (name: string, handler: (event: { payload: unknown }) => void) =>
        event.listen(name, handler)
    })
  )
  return bridge
}

/** Opens `url` in the browser window, or moves the open one there. */
export async function openBrowserWindow(url: string): Promise<void> {
  const { invoke } = await tauri()
  markNavigating(url)
  try {
    await invoke('browser_open', { url })
  } catch (error) {
    markLoadFailed()
    throw error
  }
}

/** Loads another address in the open window; the window reports the page it ends on. */
export async function navigateBrowserWindow(url: string): Promise<void> {
  const { invoke } = await tauri()
  markNavigating(url)
  try {
    await invoke('browser_navigate', { url })
  } catch (error) {
    markLoadFailed()
    throw error
  }
}

/** The page's history moves, which the window keeps and never reports. */
export async function goBack(): Promise<void> {
  await (await tauri()).invoke('browser_back')
}

export async function goForward(): Promise<void> {
  await (await tauri()).invoke('browser_forward')
}

export async function reloadBrowserWindow(): Promise<void> {
  await (await tauri()).invoke('browser_reload')
}

/** Zoom in percent; the window keeps it across navigations. */
export async function zoomBrowserWindow(percent: number): Promise<void> {
  await (await tauri()).invoke('browser_set_zoom', { percent })
}

/** Emulates a device by resizing the window's content; width and height 0 restore the desktop size. */
export async function sizeBrowserWindow(width: number, height: number): Promise<void> {
  await (await tauri()).invoke('browser_set_device', { width, height })
}

export async function closeBrowserWindow(): Promise<void> {
  await (await tauri()).invoke('browser_close')
}

/**
 * Clipboard HTML of the open page. Rust reads the page and hands the envelope back; the page
 * cannot call this, and the editor imports the result with the web paste it already has.
 */
export async function captureBrowserPage(): Promise<string> {
  const html = await (await tauri()).invoke('browser_capture_page')
  if (typeof html !== 'string' || html === '') throw new Error('The page returned no capture')
  return html
}

export type BrowserShotKind = 'visible' | 'full' | 'element'

/** PNG bytes of the open page. `element` waits for a click in that page. */
export async function screenshotBrowser(kind: BrowserShotKind): Promise<Uint8Array> {
  const encoded = await (await tauri()).invoke('browser_screenshot', { kind })
  if (typeof encoded !== 'string' || encoded === '') throw new Error('The page returned no picture')
  const png = toUint8Array(encoded)
  if (png.byteLength < 8) throw new Error('The page returned no picture')
  return png
}

/** The page's JSON for one selector. The caller checks it; this does not import a layer. */
export async function readBrowserElement(selector: string): Promise<string> {
  const value = await (await tauri()).invoke('browser_read_element', { selector })
  if (typeof value !== 'string' || value === '')
    throw new Error('The page returned nothing we can read.')
  return value
}

/**
 * Draws or removes the hover outline. An empty selector removes it. The caller decides when the
 * open page is the one the chip stored.
 */
/** Runs one page change. The caller checks the JSON; a refused change throws its sentence. */
export async function actInBrowser(input: {
  kind: string
  selector: string
  text: string
  key: string
  dx: number
  dy: number
}): Promise<string> {
  const value = await (await tauri()).invoke('browser_act', { ...input })
  if (typeof value !== 'string' || value === '') throw new Error('The action timed out.')
  return value
}

export async function markBrowserElement(selector: string): Promise<void> {
  const value = await (await tauri()).invoke('browser_mark_element', { selector })
  if (typeof value !== 'string' || value === '') throw new Error('The page did not answer in time.')
}

/** The page's JSON outline. The caller checks it; this does not import a layer. */
export async function readBrowserOutline(): Promise<string> {
  const value = await (await tauri()).invoke('browser_read_outline')
  if (typeof value !== 'string' || value === '')
    throw new Error('The page returned nothing we can read.')
  return value
}

/** Clipboard HTML of one element the user clicks in the open page. A cancel rejects. */
export async function captureBrowserElement(): Promise<string> {
  const html = await (await tauri()).invoke('browser_capture_element')
  if (typeof html !== 'string' || html === '') throw new Error('The page returned no capture')
  return html
}

/** The next `browser:page` report. The caller unsubscribes; this does not change session state. */
export async function listenForBrowserPage(
  handler: (payload: unknown) => void
): Promise<() => void> {
  const { listen } = await tauri()
  return listen('browser:page', (event) => {
    handler(event.payload)
  })
}

/**
 * Follows the window for as long as the caller is mounted: the page it shows, and the window
 * going away however the user closed it. Returns the unsubscribe.
 */
export async function watchBrowserWindow(): Promise<() => void> {
  const { listen } = await tauri()
  const stops = await Promise.all([
    listen('browser:page', (event) => {
      markPageLoaded(event.payload as BrowserPageReport)
    }),
    listen('browser:closed', () => {
      markClosed()
    })
  ])
  return () => {
    for (const stop of stops) stop()
  }
}
