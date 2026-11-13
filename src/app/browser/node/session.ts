/**
 * What create and refresh read about the built-in window. Tests pass a fake. The desktop command
 * reads the live session. A closed window and a browser-tab build both stay in this shape, so the
 * caller can refuse before it asks the window for a picture.
 */
export interface BrowserNodeSession {
  /** This build can open the window. */
  desktop: boolean
  /** The window session is open. */
  open: boolean
  /** The address the window is showing, or null when it has none. */
  url: string | null
  /** Toolbar preset id, such as `desktop` or `iphone-14`. */
  preset: string
}

/** A picture of the open page. */
export interface BrowserNodeActions {
  screenshot(): Promise<Uint8Array>
}

/** A refresh may also move the window that is already open. It never opens a closed one. */
export interface BrowserNodeRefreshActions extends BrowserNodeActions {
  navigate(url: string): Promise<void>
}

export type BrowserNodeOutcome = { ok: true; id: string } | { ok: false; error: string }
