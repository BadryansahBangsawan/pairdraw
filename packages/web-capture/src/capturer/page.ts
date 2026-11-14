import { encodeWebCaptureClipboard } from '#web-capture/clipboard'

import { captureElement, capturePage } from './index'

/**
 * The page script the desktop browser evals. It only reads the DOM and returns the clipboard HTML
 * the editor already imports. Images stay as addresses: inlining them makes the reply too large
 * for one evaluation, and a page that blocks them still imports.
 */
const CAPTURE_OPTIONS = { inlineImages: false } as const

/** Clipboard HTML of the whole page, the same envelope a copied capture uses. */
export async function capturePageHTML(document: Document = globalThis.document): Promise<string> {
  return encodeWebCaptureClipboard(await capturePage(document, CAPTURE_OPTIONS)).html
}

/** Clipboard HTML of one element. An unknown element is an empty string, which imports nothing. */
export async function captureElementHTML(
  element: Element | null,
  document: Document = globalThis.document
): Promise<string> {
  if (!element || element.ownerDocument !== document) return ''
  return encodeWebCaptureClipboard(await captureElement(element, CAPTURE_OPTIONS)).html
}

/** A failed read comes back as text. The window command turns the prefix into its error. */
function captureFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `pairdraw-capture-error:${message}`
}

const pageWindow = globalThis as typeof globalThis & {
  __pairdrawCapturePage?: () => Promise<string>
  __pairdrawCaptureElement?: (selector: string) => Promise<string>
}

pageWindow.__pairdrawCapturePage = async () => {
  try {
    return await capturePageHTML(document)
  } catch (error) {
    return captureFailure(error)
  }
}

pageWindow.__pairdrawCaptureElement = async (selector: string) => {
  try {
    return await captureElementHTML(document.querySelector(selector), document)
  } catch (error) {
    return captureFailure(error)
  }
}
