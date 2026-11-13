import { browserState, openBrowserWindow, readBrowserPageText } from '@/app/browser'
import { IS_TAURI } from '@/constants'

import type { ResearchWindow } from './tools'

/**
 * The desktop app's built-in browser window. `desktop`, `open`, and `url` are read when a tool
 * runs, so a page opened a moment earlier is the one that is cited. A test passes its own window.
 */
export function desktopResearchWindow(): ResearchWindow {
  return {
    get desktop() {
      return IS_TAURI
    },
    get open() {
      return browserState.open
    },
    get url() {
      return browserState.url
    },
    openPage(url) {
      return openBrowserWindow(url)
    },
    read() {
      return readBrowserPageText()
    }
  }
}
