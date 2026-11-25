import type { DesignDocument, DesignElement, DesignNode } from '#dom-css/types'

/**
 * What a styling sandbox inserts, with nothing the browser would execute: imported markup reaches
 * the frame as a design document, and an attribute such as `onerror` on an image runs there just as
 * it would on a page. The sandbox has no `allow-scripts`, so anything executable is blocked and
 * reported as a browser error; a layer keeps the fields that decide its layout.
 */

/** Elements that hold a document or code of their own, which the sandbox shows as a plain box. */
const CODE_TAGS: ReadonlySet<string> = new Set(['script', 'style'])

/** Elements that load another document; their fallback content stays, the element does not. */
const EMBEDDED_TAGS: ReadonlySet<string> = new Set([
  'applet',
  'embed',
  'frame',
  'frameset',
  'iframe',
  'object'
])

/** A URL a browser runs as script or reads as a document of its own. */
const EXECUTABLE_URL = /^\s*(?:javascript|vbscript|data:text\/html)/i

/** Whether the browser would run this attribute: an event handler or an executable URL. */
function executableAttribute(name: string, value: string): boolean {
  const attribute = name.toLowerCase()
  if (attribute.startsWith('on') || attribute === 'srcdoc') return true
  return EXECUTABLE_URL.test(value)
}

function sandboxedNode(node: DesignNode): DesignNode {
  if (node.type === 'text') return node
  const tagName = node.tagName.toLowerCase()
  const attrs = Object.fromEntries(
    Object.entries(node.attrs).filter(([name, value]) => !executableAttribute(name, value))
  )
  const element: DesignElement = {
    ...node,
    tagName: CODE_TAGS.has(tagName) || EMBEDDED_TAGS.has(tagName) ? 'div' : node.tagName,
    attrs,
    children: CODE_TAGS.has(tagName) ? [] : node.children.map(sandboxedNode)
  }
  return element
}

/**
 * `document` as the styling sandbox inserts it: the same layers, with every executable attribute,
 * embedded document, and code element replaced by something inert. Reading styles from it answers
 * the same question, since none of what goes changes a layer's box.
 */
export function sandboxedDesignDocument(document: DesignDocument): DesignDocument {
  return { ...document, children: document.children.map(sandboxedNode) }
}
