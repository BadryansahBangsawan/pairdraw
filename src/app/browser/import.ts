import type { Editor } from '@open-pencil/core'
import { readWebCaptureClipboard } from '@open-pencil/web-capture'

import { pasteWebClipboardHTML } from '@/app/editor/clipboard/paste/web'

/**
 * Imports a page or element the browser window captured. Only the capture envelope is accepted:
 * other HTML is not styled into a second importer. A real capture is the web paste the clipboard
 * already uses.
 */
export function importBrowserCapture(
  editor: Pick<Editor, 'pasteStyledDocument'>,
  html: string
): Promise<boolean> {
  if (!readWebCaptureClipboard(html)) return Promise.resolve(false)
  return pasteWebClipboardHTML(editor, html)
}
