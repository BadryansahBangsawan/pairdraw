import * as v from 'valibot'

import type { WebCapture, WebCaptureReadResult } from './format'
import {
  MAX_CAPTURE_DEPTH,
  MAX_CAPTURE_ELEMENTS,
  MAX_CAPTURE_JSON_LENGTH,
  WEB_CAPTURE_FORMAT,
  WEB_CAPTURE_VERSION
} from './limits'
import { webCaptureSchema } from './schema'
import { isCapturedStyleProperty } from './styles'
import type { WebCaptureElement, WebCaptureNode } from './types'
import { safeImageSource, safeLinkURL } from './urls'

/** Read first, so a capture from a newer capturer is told apart from a damaged one. */
const captureHeaderSchema = v.looseObject({
  format: v.literal(WEB_CAPTURE_FORMAT),
  version: v.number()
})

/** Attributes a layer can use: names, links, images, control kinds, and accessible labels. */
const KEPT_ATTRIBUTES = new Set([
  'id',
  'class',
  'href',
  'src',
  'alt',
  'title',
  'type',
  'role',
  'aria-label',
  'lang',
  'dir'
])

/** Elements that never draw, whatever a capture claims. */
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'link',
  'meta',
  'head',
  'title',
  'template',
  'noscript',
  'iframe',
  'frame',
  'object',
  'embed',
  'base'
])

/**
 * JSON nesting a capture within `MAX_CAPTURE_DEPTH` takes: an object and a `children` array per
 * element, the capture around the root, and the records of the deepest element, with room to
 * spare. Deeper values are refused before validation, whose recursion they could overflow.
 */
const MAX_JSON_NESTING = 2 * MAX_CAPTURE_DEPTH + 16

/** Whether a value nests deeper than `limit`, walked without recursion; a cycle counts as deep. */
function nestsDeeperThan(value: unknown, limit: number): boolean {
  const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }]
  for (let next = pending.pop(); next; next = pending.pop()) {
    if (typeof next.value !== 'object' || next.value === null) continue
    if (next.depth >= limit) return true
    const depth = next.depth + 1
    for (const child of Object.values(next.value)) pending.push({ value: child, depth })
  }
  return false
}

interface Budget {
  elements: number
  truncated: boolean
}

function keptAttributes(
  attrs: Record<string, string>,
  base: string | undefined
): Record<string, string> {
  const kept: Record<string, string> = {}
  for (const [name, value] of Object.entries(attrs)) {
    if (!KEPT_ATTRIBUTES.has(name)) continue
    if (name === 'href') {
      const href = safeLinkURL(value, base)
      if (href) kept.href = href
    } else if (name === 'src') {
      const src = safeImageSource(value, base)
      if (src) kept.src = src
    } else {
      kept[name] = value
    }
  }
  return kept
}

/** The `url(...)` sources of a value, with the spans they occupy. */
const BACKGROUND_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/g

/**
 * A `background-image` list with every `url(...)` source limited to what an image layer may
 * keep; a layer whose source is unsafe is dropped, and a list left empty paints nothing.
 * Gradient layers carry no address and pass through as written.
 */
function keptBackgroundImage(value: string, base: string | undefined): string | null {
  const layers: string[] = []
  let cursor = 0
  let dropped = false
  for (const match of value.matchAll(BACKGROUND_URL)) {
    const source = safeImageSource(match[2], base)
    if (source) layers.push(value.slice(cursor, match.index) + `url("${source}")`)
    else dropped = true
    cursor = match.index + match[0].length
  }
  if (cursor === 0 && !dropped) return value
  layers.push(value.slice(cursor))
  // Split at top-level commas only: a gradient's own commas stay inside its parentheses.
  const kept: string[] = []
  let depth = 0
  let current = ''
  for (const character of layers.join('')) {
    if (character === '(') depth++
    else if (character === ')') depth--
    if (character === ',' && depth === 0) {
      kept.push(current)
      current = ''
      continue
    }
    current += character
  }
  kept.push(current)
  const painted = kept
    .map((layer) => layer.trim())
    .filter((layer) => layer.length > 0 && layer !== 'none')
  return painted.length > 0 ? painted.join(', ') : null
}

function keptStyle(
  style: Record<string, string>,
  base: string | undefined
): Record<string, string> {
  const kept: Record<string, string> = {}
  for (const [property, value] of Object.entries(style)) {
    if (!isCapturedStyleProperty(property)) continue
    if (property === 'background-image') {
      const image = keptBackgroundImage(value, base)
      if (image) kept[property] = image
      continue
    }
    kept[property] = value
  }
  return kept
}

function normalizeElement(
  element: WebCaptureElement,
  base: string | undefined,
  depth: number,
  budget: Budget
): WebCaptureElement {
  const children: WebCaptureNode[] = []
  for (const child of element.children) {
    if (child.type === 'text') {
      children.push(child)
      continue
    }
    if (DROPPED_TAGS.has(child.tagName)) continue
    if (depth + 1 > MAX_CAPTURE_DEPTH || budget.elements >= MAX_CAPTURE_ELEMENTS) {
      budget.truncated = true
      continue
    }
    budget.elements++
    children.push(normalizeElement(child, base, depth + 1, budget))
  }
  return {
    type: 'element',
    tagName: element.tagName,
    attrs: keptAttributes(element.attrs, base),
    ...(element.box ? { box: element.box } : {}),
    computedStyle: keptStyle(element.computedStyle, base),
    children
  }
}

/**
 * A capture as an import may use it: only the attributes and properties layers read, links
 * limited to http, https, and mailto, images limited to raster data URLs and http(s) addresses,
 * and at most `MAX_CAPTURE_ELEMENTS` elements. Captures come from any page, so every reader
 * goes through this.
 */
export function normalizeWebCapture(capture: WebCapture): WebCapture {
  const budget: Budget = { elements: 1, truncated: false }
  const base = capture.source.url
  const root = normalizeElement(capture.root, base, 0, budget)
  return { ...capture, root, truncated: capture.truncated || budget.truncated }
}

/** Reads a capture that is already a value, such as one a capturer handed over. */
export function readWebCapture(value: unknown): WebCaptureReadResult {
  if (nestsDeeperThan(value, MAX_JSON_NESTING)) return { ok: false, error: 'invalid' }
  const header = v.safeParse(captureHeaderSchema, value)
  if (!header.success) return { ok: false, error: 'invalid' }
  if (header.output.version !== WEB_CAPTURE_VERSION) {
    return { ok: false, error: 'unsupported-version' }
  }
  const parsed = v.safeParse(webCaptureSchema, value)
  if (!parsed.success) return { ok: false, error: 'invalid' }
  return { ok: true, capture: normalizeWebCapture(parsed.output) }
}

/** Reads a capture serialized as JSON, as files and clipboard payloads hold it. */
export function parseWebCapture(text: string): WebCaptureReadResult {
  if (text.length > MAX_CAPTURE_JSON_LENGTH) return { ok: false, error: 'too-large' }
  const json = v.safeParse(v.pipe(v.string(), v.parseJson()), text)
  if (!json.success) return { ok: false, error: 'invalid' }
  return readWebCapture(json.output)
}
