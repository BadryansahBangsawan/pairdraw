import { MAX_CAPTURE_DEPTH } from '#web-capture/limits'
import { CAPTURED_STYLE_PROPERTIES, withoutImpliedValues } from '#web-capture/styles'
import type { WebCaptureBox, WebCaptureElement, WebCaptureNode } from '#web-capture/types'

import type { FontCollector } from './fonts'
import type { CaptureWindow, ImageInliner } from './images'
import { standaloneSVGMarkup } from './svg'

/** What a walk shares: the page, where the root sits, its budget, and work left to finish. */
export interface WalkContext {
  view: CaptureWindow
  origin: Pick<WebCaptureBox, 'x' | 'y'>
  maxElements: number
  elements: number
  truncated: boolean
  images: ImageInliner
  fonts: FontCollector
  /** Images still being read, each writing its element's source when done. */
  pending: Promise<void>[]
}

/** Elements that never draw, or draw another document a page cannot read. */
const SKIPPED_TAGS = new Set([
  'script',
  'style',
  'link',
  'meta',
  'head',
  'title',
  'template',
  'noscript',
  'base',
  'iframe',
  'frame',
  'object',
  'embed',
  'source',
  'track',
  'param'
])

const KEPT_ATTRIBUTES = ['id', 'class', 'alt', 'title', 'role', 'aria-label', 'lang', 'dir']

/** Input types whose value is text a person reads in the field. */
const TEXT_INPUT_TYPES = new Set([
  '',
  'text',
  'email',
  'search',
  'url',
  'tel',
  'number',
  'password'
])

const BACKGROUND_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/

function boxOf(element: Element, origin: WalkContext['origin']): WebCaptureBox {
  const rect = element.getBoundingClientRect()
  return {
    x: rect.left - origin.x,
    y: rect.top - origin.y,
    width: rect.width,
    height: rect.height
  }
}

function attributesOf(element: Element, view: CaptureWindow): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const name of KEPT_ATTRIBUTES) {
    const value = element.getAttribute(name)
    if (value !== null && value !== '') attrs[name] = value
  }
  // The resolved address, not the attribute as written, which may be relative.
  if (element instanceof view.HTMLAnchorElement && element.hasAttribute('href') && element.href) {
    attrs.href = element.href
  }
  return attrs
}

function readStyle(style: CSSStyleDeclaration): Record<string, string> {
  const computed: Record<string, string> = {}
  for (const property of CAPTURED_STYLE_PROPERTIES) {
    const value = style.getPropertyValue(property)
    if (value) computed[property] = value
  }
  // A hidden box keeps its room but draws nothing, as a transparent layer does.
  const visibility = style.getPropertyValue('visibility')
  if (visibility === 'hidden' || visibility === 'collapse') computed.opacity = '0'
  return withoutImpliedValues(computed)
}

function hasDirectText(element: Element): boolean {
  return [...element.childNodes].some(
    (child) => child.nodeType === 3 && (child.textContent ?? '').trim().length > 0
  )
}

/** The nodes an element draws: its shadow tree with slots filled when it has an open one. */
function renderedChildren(element: Element, view: CaptureWindow): Node[] {
  const source = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes
  return [...source].flatMap((child) => {
    if (child instanceof view.HTMLSlotElement) {
      const assigned = child.assignedNodes({ flatten: true })
      return assigned.length > 0 ? assigned : [...child.childNodes]
    }
    return [child]
  })
}

function controlText(element: Element, view: CaptureWindow): string | null {
  if (element instanceof view.HTMLTextAreaElement) {
    return element.value || element.placeholder || null
  }
  if (element instanceof view.HTMLSelectElement) {
    return element.selectedOptions.item(0)?.text ?? null
  }
  if (element instanceof view.HTMLInputElement) {
    if (!TEXT_INPUT_TYPES.has(element.type)) {
      return element.type === 'button' || element.type === 'submit' ? element.value : null
    }
    if (element.type === 'password' && element.value) return '•'.repeat(element.value.length)
    return element.value || element.placeholder || null
  }
  return null
}

/** Reads an image in the background and writes it as the element's source. */
function inlineSource(
  context: WalkContext,
  node: WebCaptureElement,
  read: () => Promise<string | null>
): void {
  context.pending.push(
    read().then((source) => {
      if (source) node.attrs.src = source
      return undefined
    })
  )
}

function imageSize(box: WebCaptureBox) {
  return { width: Math.round(box.width), height: Math.round(box.height) }
}

/** What a canvas shows, or null when it drew another site's image, which taints it. */
function canvasDataURL(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function captureReplaced(element: Element, node: WebCaptureElement, context: WalkContext): boolean {
  const { view } = context
  const box = node.box ?? { x: 0, y: 0, width: 0, height: 0 }
  if (element instanceof view.SVGSVGElement) {
    node.tagName = 'img'
    if (box.width > 0 && box.height > 0) {
      const markup = standaloneSVGMarkup(view, element, imageSize(box))
      inlineSource(context, node, () => context.images.rasterizeSVG(markup, imageSize(box)))
    }
    return true
  }
  if (element instanceof view.HTMLImageElement) {
    const source = element.currentSrc || element.src
    if (source) {
      // The address stays when the image cannot be inlined; the importer records it.
      node.attrs.src = source
      inlineSource(context, node, () => context.images.inline(source, imageSize(box)))
    }
    return true
  }
  if (element instanceof view.HTMLCanvasElement) {
    node.tagName = 'img'
    const drawn = canvasDataURL(element)
    const source = drawn && context.images.accept(drawn)
    if (source) node.attrs.src = source
    return true
  }
  if (element instanceof view.HTMLVideoElement) {
    node.tagName = 'img'
    const poster = element.poster
    if (poster) inlineSource(context, node, () => context.images.inline(poster, imageSize(box)))
    return true
  }
  const text = controlText(element, view)
  if (text !== null) {
    node.children = [{ type: 'text', text }]
    return true
  }
  return false
}

/**
 * A background image becomes an image: the element itself when it holds nothing else, or an
 * image layer behind its content otherwise, since layers have no background images.
 */
function captureBackground(
  style: CSSStyleDeclaration,
  node: WebCaptureElement,
  context: WalkContext
) {
  const match = BACKGROUND_URL.exec(style.getPropertyValue('background-image'))
  const url = match?.[2]
  const box = node.box
  if (!url || !box || box.width <= 0 || box.height <= 0) return
  const fit = style.getPropertyValue('background-size') === 'contain' ? 'contain' : 'cover'
  if (node.tagName !== 'img' && node.children.length === 0) {
    node.tagName = 'img'
    node.computedStyle['object-fit'] = fit
    inlineSource(context, node, () => context.images.inline(url))
    return
  }
  if (node.tagName === 'img') return
  const radii = Object.fromEntries(
    Object.entries(node.computedStyle).filter(([property]) => property.endsWith('-radius'))
  )
  const image: WebCaptureElement = {
    type: 'element',
    tagName: 'img',
    attrs: {},
    computedStyle: {
      ...radii,
      display: 'block',
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: `${box.width}px`,
      height: `${box.height}px`,
      'object-fit': fit
    },
    box,
    children: []
  }
  inlineSource(context, image, () => context.images.inline(url))
  node.children.unshift(image)
}

function captureChildren(element: Element, context: WalkContext, depth: number): WebCaptureNode[] {
  return renderedChildren(element, context.view).flatMap((child) => {
    if (child.nodeType === 3) {
      const text = child.textContent ?? ''
      return text.length > 0 ? [{ type: 'text' as const, text }] : []
    }
    return child instanceof context.view.Element ? walkElement(child, context, depth + 1) : []
  })
}

/**
 * The element as a capture holds it, with its descendants; several nodes when it has no box
 * of its own (`display: contents`) and none when it is not displayed.
 */
export function walkElement(element: Element, context: WalkContext, depth = 0): WebCaptureNode[] {
  const tagName = element.localName.toLowerCase()
  if (SKIPPED_TAGS.has(tagName)) return []
  const style = context.view.getComputedStyle(element)
  const display = style.getPropertyValue('display')
  if (display === 'none') return []
  if (display === 'contents') return captureChildren(element, context, depth)
  if (depth > MAX_CAPTURE_DEPTH || context.elements >= context.maxElements) {
    context.truncated = true
    return []
  }
  context.elements++
  const node: WebCaptureElement = {
    type: 'element',
    tagName,
    attrs: attributesOf(element, context.view),
    computedStyle: readStyle(style),
    box: boxOf(element, context.origin),
    children: []
  }
  if (!captureReplaced(element, node, context)) {
    node.children = captureChildren(element, context, depth)
  }
  if (hasDirectText(element) || node.children.some((child) => child.type === 'text')) {
    context.fonts.add(style)
  }
  captureBackground(style, node, context)
  return [node]
}
