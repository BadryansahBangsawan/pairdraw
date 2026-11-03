import { encodeWebCaptureClipboard, type WebCaptureClipboardPayload } from '#web-capture/clipboard'
import type { WebCapture } from '#web-capture/format'

/** The part of the asynchronous clipboard a capture write uses. */
export type CaptureClipboard = Pick<Clipboard, 'write'>

export interface WriteCaptureClipboardOptions {
  /** The clipboard to write; the page's own by default. */
  clipboard?: CaptureClipboard
  /** Builds a clipboard item; the page's `ClipboardItem` by default. */
  createItem?: (items: Record<string, Promise<Blob>>) => ClipboardItem
}

/** Thrown when the page has no asynchronous clipboard, which only secure pages offer. */
export class CaptureClipboardUnavailableError extends Error {
  constructor() {
    super('Copying a capture needs a page served over HTTPS')
    this.name = 'CaptureClipboardUnavailableError'
  }
}

function isPayload(
  value: WebCapture | WebCaptureClipboardPayload
): value is WebCaptureClipboardPayload {
  return 'html' in value && 'text' in value
}

/**
 * Copies a capture so it pastes into a Pairdraw canvas, as HTML for Pairdraw and other
 * applications and as the page's title and address for plain text. Pass the capture's promise
 * straight from the click that asked for it: the write starts inside that click and resolves
 * its data later, so a capture that takes a while still counts as the click's own.
 */
export async function writeWebCaptureClipboard(
  capture:
    | WebCapture
    | WebCaptureClipboardPayload
    | Promise<WebCapture | WebCaptureClipboardPayload>,
  options: WriteCaptureClipboardOptions = {}
): Promise<void> {
  const clipboard =
    options.clipboard ?? (typeof navigator === 'undefined' ? undefined : navigator.clipboard)
  const createItem =
    options.createItem ??
    (typeof ClipboardItem === 'undefined'
      ? undefined
      : (items: Record<string, Promise<Blob>>) => new ClipboardItem(items))
  // `navigator.clipboard` is missing outside secure contexts.
  if (!clipboard || !createItem) throw new CaptureClipboardUnavailableError()
  const payload = Promise.resolve(capture).then((value) =>
    isPayload(value) ? value : encodeWebCaptureClipboard(value)
  )
  await clipboard.write([
    createItem({
      'text/html': payload.then((value) => new Blob([value.html], { type: 'text/html' })),
      'text/plain': payload.then((value) => new Blob([value.text], { type: 'text/plain' }))
    })
  ])
}
