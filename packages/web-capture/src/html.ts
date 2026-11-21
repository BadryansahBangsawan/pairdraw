import { escapeAttribute, escapeText } from 'entities'

import {
  webCaptureDesignDocument,
  type WebCaptureDesignElement,
  type WebCaptureDesignNode
} from './design-document'
import type { WebCapture } from './format'
import { ownValue } from './record'

const VOID_TAGS = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'source', 'wbr'])

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
  const open = `<${node.tagName}${attributes(node, options)}>`
  if (VOID_TAGS.has(node.tagName)) return open
  const children = node.children.map((child) => serialize(child, options)).join('')
  return `${open}${children}</${node.tagName}>`
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
