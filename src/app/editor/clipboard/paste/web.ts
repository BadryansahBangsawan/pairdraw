import type { Editor } from '@open-pencil/core'
import type { HTMLStyler } from '@open-pencil/core/io/formats/html/layers'
import type { Vector } from '@open-pencil/scene-graph/primitives'
import { filesMessages } from '@open-pencil/vue/i18n'
import {
  hasWebContent,
  readWebCaptureClipboard,
  sanitizeWebHTML,
  webCaptureDesignDocument,
  type WebCaptureReadError
} from '@open-pencil/web-capture'

import { styleHTMLInBrowser } from '@/app/code/html-styler'
import { toast } from '@/app/shell/ui'

type WebPasteEditor = Pick<Editor, 'pasteStyledDocument'>

function captureErrorMessage(error: WebCaptureReadError): string {
  const messages = filesMessages.get()
  return error === 'unsupported-version' ? messages.webCaptureNewer : messages.webCaptureUnreadable
}

/**
 * Pastes HTML copied from the web as styled layers: a capture from the Pairdraw extension or a
 * capturer SDK as it was captured, or any other page's clipboard fragment, sanitized and styled
 * by the browser. False when the HTML draws nothing, so other paste handlers may try it.
 */
export async function pasteWebClipboardHTML(
  editor: WebPasteEditor,
  html: string,
  cursorPos?: Vector,
  style: HTMLStyler = styleHTMLInBrowser
): Promise<boolean> {
  try {
    // Inside the try: the payload comes from any page, so a reader failure must still toast.
    const captured = readWebCaptureClipboard(html)
    if (captured && !captured.ok) {
      toast.error(captureErrorMessage(captured.error))
      return true
    }
    if (captured) {
      const { capture } = captured
      const created = await editor.pasteStyledDocument(
        webCaptureDesignDocument(capture),
        cursorPos,
        {
          name: capture.source.title
        }
      )
      if (capture.truncated && created.length > 0)
        toast.warning(filesMessages.get().webCaptureTruncated)
      return created.length > 0
    }
    const sanitized = sanitizeWebHTML(html)
    if (!sanitized || !hasWebContent(sanitized)) return false
    const styled = await style(sanitized, {})
    return (await editor.pasteStyledDocument(styled, cursorPos)).length > 0
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    toast.error(filesMessages.get().webPasteFailed({ error: reason }))
    return true
  }
}
