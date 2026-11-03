import { isValid, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import {
  CaptureClipboardUnavailableError,
  captureElement,
  capturePage,
  writeWebCaptureClipboard,
  type CaptureImageFetcher,
  type CaptureOptions
} from '@open-pencil/web-capture/capturer'

import { t } from './i18n'
import type { CaptureResponse } from './messages'
import { showNotice } from './notice'
import { pageCapturePayload } from './payload'
import { startPicker } from './picker'
import { captureRequestSchema, imageResponseSchema } from './schema'

/** Set once the script listens, since the popup injects it again on every use. */
const INSTALLED = Symbol.for('pairdraw.webCapture.installed')

const DATA_URL = /^data:([^;,]+);base64,(.*)$/s

/** The image a data URL holds, decoded here rather than fetched, which a page's CSP may block. */
function dataURLBlob(dataURL: string): Blob | null {
  const match = DATA_URL.exec(dataURL)
  const type = match?.[1]
  const encoded = match?.[2]
  if (!type || encoded === undefined || !isValid(encoded)) return null
  return new Blob([Uint8Array.from(toUint8Array(encoded))], { type })
}

/** Images the page cannot read, fetched by the service worker with the optional permission. */
const fetchThroughWorker: CaptureImageFetcher = async (url) => {
  const response = v.safeParse(
    imageResponseSchema,
    await chrome.runtime.sendMessage({ type: 'fetch-image', url })
  )
  if (!response.success || !response.output.ok) return null
  return dataURLBlob(response.output.dataURL)
}

function captureOptions(images: boolean): CaptureOptions {
  return images ? { fetchImage: fetchThroughWorker } : {}
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function copyPage(images: boolean): Promise<CaptureResponse> {
  try {
    // The popup writes the clipboard, so the payload must fit in one message to it.
    const { html, text } = await pageCapturePayload(
      (options) => capturePage(document, options),
      captureOptions(images)
    )
    return { ok: true, html, text }
  } catch (error) {
    return { ok: false, error: errorMessage(error) }
  }
}

function pickElement(images: boolean) {
  startPicker(document, t('pickerHint'), {
    onPick(element) {
      const update = showNotice(document, t('statusCopying'))
      writeWebCaptureClipboard(captureElement(element, captureOptions(images)))
        .then(() => update(t('statusCopied')))
        .catch((error: unknown) => {
          update(
            error instanceof CaptureClipboardUnavailableError
              ? t('statusNeedsSecurePage')
              : t('statusFailed', errorMessage(error))
          )
        })
    }
  })
}

if (!Reflect.get(globalThis, INSTALLED)) {
  Reflect.set(globalThis, INSTALLED, true)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id) return undefined
    const request = v.safeParse(captureRequestSchema, message)
    if (!request.success) return undefined
    if (request.output.type === 'capture-page') {
      void copyPage(request.output.images).then(sendResponse)
      // Keeps the channel open for the asynchronous response.
      return true
    }
    pickElement(request.output.images)
    sendResponse({ ok: true })
    return undefined
  })
}
