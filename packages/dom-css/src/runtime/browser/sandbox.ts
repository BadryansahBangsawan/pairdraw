import type { DesignDocument, DesignElement, DesignNode } from '#dom-css/types'

/**
 * What a styling sandbox inserts, with nothing the browser would execute: imported markup reaches
 * the frame as a design document, and an attribute such as `onerror` on an image runs there just as
 * it would on a page. A sandboxed iframe has no `allow-scripts`, so a script that got in is blocked
 * and reported; the shadow root is the app's own document, where it would really run.
 *
 * This is the executable-markup half of the sandbox copy. The network half, which rewrites fetchable
 * addresses so a sandbox never loads a remote resource, walks the same tree: when both are present
 * they are one pass over the nodes, and no pass may keep a `srcdoc`, which this one always drops.
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

/**
 * `value` without the characters a browser ignores inside a URL scheme: controls and space, so
 * `java\tscript:` runs as `javascript:`.
 */
function withoutSchemeNoise(value: string): string {
  let plain = ''
  for (const char of value) if (char.charCodeAt(0) > 0x20) plain += char
  return plain
}

/** A URL a browser runs as script or reads as a document of its own. */
const EXECUTABLE_URL = /^(?:javascript|vbscript|data:text\/html)/i

/** Whether the browser would run this attribute: an event handler or an executable URL. */
function executableAttribute(name: string, value: string): boolean {
  const attribute = name.toLowerCase()
  if (attribute.startsWith('on') || attribute === 'srcdoc') return true
  return EXECUTABLE_URL.test(withoutSchemeNoise(value))
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
 * embedded document, and code element replaced by something inert. A replaced element keeps the
 * attributes that decide its box where the browser draws one; a layer's own styles still come from
 * the captured stylesheet, so reading computed styles answers the same question.
 */
export function sandboxedDesignDocument(document: DesignDocument): DesignDocument {
  return { ...document, children: document.children.map(sandboxedNode) }
}
