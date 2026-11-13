import type { Editor } from '@open-pencil/core'

import { IS_TAURI } from '@/constants'

import { browserState } from '../state'
import { listenForBrowserPage, navigateBrowserWindow, screenshotBrowser } from '../window'
import { createBrowserNodeFromPage, refreshBrowserNodeFromPage } from './apply'
import { BROWSER_SNAPSHOT_LOAD_MS, waitForBrowserPage } from './load'
import type { BrowserNodeSession } from './session'

/** The window session this build has now. A browser tab reports that it is not the desktop app. */
export function browserNodeSession(): BrowserNodeSession {
  return {
    desktop: IS_TAURI,
    open: browserState.open,
    url: browserState.url,
    preset: browserState.device
  }
}

/**
 * A snapshot of the page the built-in window is showing. Outside the desktop app this refuses
 * and creates nothing. It does not open a window, and nothing calls it when a file opens.
 */
export function createBrowserNode(editor: Editor) {
  return createBrowserNodeFromPage(
    editor,
    browserNodeSession(),
    { screenshot: () => screenshotBrowser('visible') },
    new Date().toISOString()
  )
}

/**
 * A new picture of the snapshot's stored page. Outside the desktop app, or when the window is
 * closed, the layer stays as it was. A closed window is not opened.
 */
export function refreshBrowserNode(editor: Editor, nodeId: string) {
  return refreshBrowserNodeFromPage(
    editor,
    nodeId,
    browserNodeSession(),
    {
      screenshot: () => screenshotBrowser('visible'),
      navigate: (url) => navigateBrowserWindow(url),
      waitForLoad: () =>
        waitForBrowserPage({
          listen: listenForBrowserPage,
          deadlineMs: BROWSER_SNAPSHOT_LOAD_MS
        })
    },
    new Date().toISOString()
  )
}
