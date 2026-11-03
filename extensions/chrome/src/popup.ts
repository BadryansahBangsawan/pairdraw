import * as v from 'valibot'

import {
  CaptureClipboardUnavailableError,
  writeWebCaptureClipboard
} from '@open-pencil/web-capture/capturer'

import { isMessageKey, t } from './i18n'
import { ALL_SITES } from './messages'
import { captureResponseSchema } from './schema'

function required<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id)
  if (!(element instanceof type)) throw new Error(`The popup has no #${id}`)
  return element
}

const copyPageButton = required('copy-page', HTMLButtonElement)
const pickElementButton = required('pick-element', HTMLButtonElement)
const imagesToggle = required('images', HTMLInputElement)
const status = required('status', HTMLParagraphElement)

function translate() {
  document.documentElement.lang = chrome.i18n.getUILanguage()
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n
    if (key && isMessageKey(key)) element.textContent = t(key)
  }
}

function showStatus(text: string, tone: 'info' | 'error' = 'info') {
  status.textContent = text
  status.dataset.tone = tone
}

async function activeTabId(): Promise<number> {
  const tab = (await chrome.tabs.query({ active: true, currentWindow: true })).at(0)
  if (tab?.id === undefined) throw new Error('unavailable')
  return tab.id
}

/** Puts the capture script in the active tab; pages the browser protects refuse it. */
async function injectCapture(): Promise<number> {
  const tabId = await activeTabId()
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] })
  } catch {
    throw new Error('unavailable')
  }
  return tabId
}

function failure(error: unknown): string {
  if (error instanceof CaptureClipboardUnavailableError) return t('statusNeedsSecurePage')
  const message = error instanceof Error ? error.message : String(error)
  if (message === 'unavailable') return t('statusUnavailable')
  return t('statusFailed', message)
}

copyPageButton.addEventListener('click', () => {
  showStatus(t('statusCopying'))
  copyPageButton.disabled = true
  const payload = (async () => {
    const tabId = await injectCapture()
    const response = v.parse(
      captureResponseSchema,
      await chrome.tabs.sendMessage(tabId, { type: 'capture-page', images: imagesToggle.checked })
    )
    if (!response.ok) throw new Error(response.error)
    return response
  })()
  // The write starts inside this click, while the popup has the user's activation.
  const writing = writeWebCaptureClipboard(payload)
  void (async () => {
    try {
      await writing
      showStatus(t('statusCopied'))
    } catch (error) {
      showStatus(failure(error), 'error')
    } finally {
      copyPageButton.disabled = false
    }
  })()
})

pickElementButton.addEventListener('click', () => {
  void (async () => {
    try {
      const tabId = await injectCapture()
      await chrome.tabs.sendMessage(tabId, { type: 'pick-element', images: imagesToggle.checked })
      // The page needs the pointer; the capture script tells the person when it has copied.
      window.close()
    } catch (error) {
      showStatus(failure(error), 'error')
    }
  })()
})

imagesToggle.addEventListener('change', () => {
  void (async () => {
    if (imagesToggle.checked) imagesToggle.checked = await chrome.permissions.request(ALL_SITES)
    else await chrome.permissions.remove(ALL_SITES)
  })()
})

translate()
void chrome.permissions.contains(ALL_SITES).then((granted) => {
  imagesToggle.checked = granted
  return undefined
})
