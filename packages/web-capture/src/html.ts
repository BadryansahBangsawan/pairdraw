import { escapeAttribute, escapeText } from 'entities'

import {
  webCaptureDesignDocument,
  type WebCaptureDesignElement,
  type WebCaptureDesignNode
} from './design-document'
import type { WebCapture } from './format'
import { ownValue } from './record'

const VOID_TAGS = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'source', 'wbr'])

/** Tags whose start ends an open `<p>` when HTML is parsed, which would lift them out of it. */
const CLOSES_PARAGRAPH = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'main',
  'menu',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul'
])

/**
 * The tag an element is written with. A script can put a block inside a `<p>`, as the capture's
 * own spacers around a margined box do, but parsing would end the paragraph there; a `<div>`
 * holds it in place, and the element's styles say how it lays out either way.
 */
function writtenTag(element: WebCaptureDesignElement): string {
  const holdsBlock = element.children.some(
    (child) => child.type === 'element' && CLOSES_PARAGRAPH.has(child.tagName)
  )
  return element.tagName === 'p' && holdsBlock ? 'div' : element.tagName
}

export interface WebCaptureHTMLOptions {
  /** Keep inlined images; without them an image keeps only its size and description. */
  images?: boolean
}

function styleAttribute(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ')
}

function attributes(element: WebCaptureDesignElement, options: WebCaptureHTMLOptions): string {
  const attrs: Record<string, string> = { ...element.attrs }
  if (options.images === false && ownValue(attrs, 'src')?.startsWith('data:')) delete attrs.src
  const style = styleAttribute(element.computedStyle)
  if (style) attrs.style = style
  return Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('')
}

function serialize(node: WebCaptureDesignNode, options: WebCaptureHTMLOptions): string {
  if (node.type === 'text') return escapeText(node.text)
  const tag = writtenTag(node)
  const open = `<${tag}${attributes(node, options)}>`
  if (VOID_TAGS.has(tag)) return open
  const children = node.children.map((child) => serialize(child, options)).join('')
  return `${open}${children}</${tag}>`
}

/**
 * The capture as static HTML whose elements carry their styles inline, for applications that
 * read clipboard HTML but not the capture itself, and for importing it as HTML. It is the styled
 * DOM a paste builds layers from, so the HTML importer reads the capture as the paste does.
 */
export function webCaptureToHTML(capture: WebCapture, options: WebCaptureHTMLOptions = {}): string {
  return webCaptureDesignDocument(capture)
    .children.map((node) => serialize(node, options))
    .join('')
}
