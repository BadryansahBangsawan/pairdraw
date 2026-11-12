import { reactive } from 'vue'

/** A device size the browser can emulate: the window's content size and the pixel density. */
export interface BrowserDevice {
  id: string
  width: number
  height: number
  /** Device pixel ratio the page is told it has. */
  scale: number
}

/** The presets the toolbar offers. `desktop` is the browser's own size, so it has no dimensions. */
export const BROWSER_DEVICES: BrowserDevice[] = [
  { id: 'desktop', width: 0, height: 0, scale: 0 },
  { id: 'iphone-14', width: 390, height: 844, scale: 3 },
  { id: 'pixel-7', width: 412, height: 915, scale: 2.625 },
  { id: 'ipad-air', width: 820, height: 1180, scale: 2 }
]

/** The zoom range the toolbar allows, in percent. */
export const BROWSER_ZOOM_MIN = 25
export const BROWSER_ZOOM_MAX = 400

/** What the toolbar and the MCP tools read. Only the browser window's own reports change it. */
export interface BrowserSessionState {
  open: boolean
  /** The URL the page was last asked to load, or null while nothing is open. */
  url: string | null
  title: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  /** Zoom in percent, as the toolbar shows it. */
  zoom: number
  device: string
}

export const browserState = reactive<BrowserSessionState>({
  open: false,
  url: null,
  title: '',
  loading: false,
  canGoBack: false,
  canGoForward: false,
  zoom: 100,
  device: 'desktop'
})

/** What the browser window reports after it loads a page. Every field is the window's own account. */
export interface BrowserPageReport {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
}

/** Applies a navigation the window accepted. */
export function markNavigating(url: string): void {
  browserState.open = true
  browserState.url = url
  browserState.title = ''
  browserState.loading = true
}

/** Applies what the window reports once a page is shown. */
export function markPageLoaded(report: BrowserPageReport): void {
  browserState.open = true
  browserState.url = report.url
  browserState.title = report.title
  browserState.loading = false
  browserState.canGoBack = report.canGoBack
  browserState.canGoForward = report.canGoForward
}

/** The page failed to load: the address stays, and the toolbar stops showing progress. */
export function markLoadFailed(): void {
  browserState.loading = false
}

/** Zoom is clamped to the range the toolbar offers, so a persisted or reported value cannot exceed it. */
export function normalizeZoom(percent: number): number {
  if (!Number.isFinite(percent)) return 100
  return Math.min(BROWSER_ZOOM_MAX, Math.max(BROWSER_ZOOM_MIN, Math.round(percent)))
}

export function setZoom(percent: number): void {
  browserState.zoom = normalizeZoom(percent)
}

/** An unknown preset id falls back to `desktop` rather than leaving the browser in no size at all. */
export function setDevice(id: string): void {
  browserState.device = BROWSER_DEVICES.some((device) => device.id === id) ? id : 'desktop'
}

/** The preset the toolbar has selected. */
export function currentDevice(state: BrowserSessionState = browserState): BrowserDevice {
  return BROWSER_DEVICES.find((device) => device.id === state.device) ?? BROWSER_DEVICES[0]
}

/** The browser closed, however it closed: nothing about the page survives into the next session. */
export function markClosed(): void {
  browserState.open = false
  browserState.url = null
  browserState.title = ''
  browserState.loading = false
  browserState.canGoBack = false
  browserState.canGoForward = false
}
