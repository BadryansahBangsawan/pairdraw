import type { WebCapture } from '#web-capture/format'
import { MAX_CAPTURE_ELEMENTS, WEB_CAPTURE_FORMAT, WEB_CAPTURE_VERSION } from '#web-capture/limits'
import { normalizeWebCapture } from '#web-capture/parse'
import type { WebCaptureElement } from '#web-capture/types'

import { createFontCollector } from './fonts'
import {
  createImageInliner,
  type CaptureImageFetcher,
  type CaptureWindow,
  type ImageInliner
} from './images'
import { walkElement, type WalkContext } from './walk'

export {
  CaptureClipboardUnavailableError,
  writeWebCaptureClipboard,
  type CaptureClipboard,
  type WriteCaptureClipboardOptions
} from './clipboard'
export type { CaptureImageFetcher } from './images'

export interface CaptureOptions {
  /** Elements to capture at most; the capture is marked truncated when the page has more. */
  maxElements?: number
  /** Carry images inside the capture as data URLs (the default), or keep only their addresses. */
  inlineImages?: boolean
  /** Reads images the page cannot, such as another site's without CORS headers. */
  fetchImage?: CaptureImageFetcher
  /** Bytes one inlined image may take. */
  maxImageBytes?: number
  /** Bytes all inlined images may take together. */
  maxTotalImageBytes?: number
  signal?: AbortSignal
}

const NO_IMAGES: ImageInliner = {
  inline: async () => null,
  rasterizeSVG: async () => null,
  accept: () => null
}

function windowOf(document: Document): CaptureWindow {
  const view = document.defaultView
  if (!view) throw new TypeError('Capturing needs a document shown in a window')
  return view
}

function createContext(
  view: CaptureWindow,
  origin: WalkContext['origin'],
  options: CaptureOptions
): WalkContext {
  return {
    view,
    origin,
    maxElements: options.maxElements ?? MAX_CAPTURE_ELEMENTS,
    elements: 0,
    truncated: false,
    images:
      options.inlineImages === false
        ? NO_IMAGES
        : createImageInliner(view, {
            fetchImage: options.fetchImage,
            maxImageBytes: options.maxImageBytes,
            maxTotalBytes: options.maxTotalImageBytes,
            signal: options.signal
          }),
    fonts: createFontCollector(),
    pending: []
  }
}

async function finish(
  context: WalkContext,
  root: WebCaptureElement,
  scope: WebCapture['scope'],
  options: CaptureOptions
): Promise<WebCapture> {
  await Promise.all(context.pending)
  options.signal?.throwIfAborted()
  const { view } = context
  return normalizeWebCapture({
    format: WEB_CAPTURE_FORMAT,
    version: WEB_CAPTURE_VERSION,
    scope,
    source: { url: view.location.href || undefined, title: view.document.title || undefined },
    capturedAt: new Date().toISOString(),
    viewport: {
      width: view.innerWidth,
      height: view.innerHeight,
      devicePixelRatio: view.devicePixelRatio || 1
    },
    root,
    fonts: context.fonts.list(),
    truncated: context.truncated
  })
}

/** The single root a walk returns; an element without a box of its own gets one around it. */
function rootElement(element: Element, context: WalkContext): WebCaptureElement {
  const nodes = walkElement(element, context)
  const first = nodes.at(0)
  if (nodes.length === 1 && first?.type === 'element') return first
  if (nodes.length === 0) throw new Error('The element is not displayed')
  const rect = element.getBoundingClientRect()
  return {
    type: 'element',
    tagName: 'div',
    attrs: {},
    computedStyle: { display: 'block' },
    box: { x: 0, y: 0, width: rect.width, height: rect.height },
    children: nodes
  }
}

/**
 * Captures one element of a live page with the styles the browser computed for it, its
 * images inlined as data URLs. Runs in the page, as a content script or a capturer SDK does.
 */
export async function captureElement(
  element: Element,
  options: CaptureOptions = {}
): Promise<WebCapture> {
  options.signal?.throwIfAborted()
  const view = windowOf(element.ownerDocument)
  const rect = element.getBoundingClientRect()
  const context = createContext(view, { x: rect.left, y: rect.top }, options)
  return finish(context, rootElement(element, context), 'element', options)
}

function isTransparent(color: string): boolean {
  return color === '' || color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
}

/**
 * Captures a whole page: the body at the page's full scroll size, on the background the page
 * shows, with the body's margins kept as space around its content.
 */
export async function capturePage(
  document: Document = globalThis.document,
  options: CaptureOptions = {}
): Promise<WebCapture> {
  options.signal?.throwIfAborted()
  const view = windowOf(document)
  // lib.dom types both as always present, but a frameset page has no body and a document can
  // lack a root element.
  const body = document.body as HTMLElement | null
  const documentElement = document.documentElement as HTMLElement | null
  const target = body ?? documentElement
  if (!target) throw new Error('The page has nothing to capture')
  const page = documentElement ?? target
  const pageRect = page.getBoundingClientRect()
  const context = createContext(view, { x: pageRect.left, y: pageRect.top }, options)
  const root = rootElement(target, context)
  const bodyStyle = body ? view.getComputedStyle(body) : null
  const style = root.computedStyle
  if (bodyStyle) {
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      const margin = Number.parseFloat(bodyStyle.getPropertyValue(`margin-${side}`)) || 0
      const padding = Number.parseFloat(bodyStyle.getPropertyValue(`padding-${side}`)) || 0
      if (margin + padding > 0) style[`padding-${side}`] = `${margin + padding}px`
      delete style[`margin-${side}`]
    }
  }
  const background = [bodyStyle, view.getComputedStyle(page)]
    .map((computed) => computed?.getPropertyValue('background-color'))
    .find((color) => color !== undefined && !isTransparent(color))
  style['background-color'] = background ?? 'rgb(255, 255, 255)'
  // The page's size, not the body's, which may be shorter than the window.
  const width = page.clientWidth || pageRect.width
  const height = Math.max(page.scrollHeight, view.innerHeight)
  style.width = `${width}px`
  style.height = `${height}px`
  style['box-sizing'] = 'border-box'
  root.box = { x: 0, y: 0, width, height }
  return finish(context, root, 'page', options)
}
