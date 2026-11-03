import { MAX_WEB_HTML_LENGTH } from './limits'
import { safeImageSource, safeLinkURL } from './urls'

/** Elements that run code, load other documents, or change how the rest is read. */
const REMOVED_TAGS = [
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'portal',
  'base',
  'link',
  'meta',
  'noscript',
  'template',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'foreignobject',
  // MathML and its table-breaking leaves are where re-parsing turns style text into elements.
  'math',
  'mglyph',
  'malignmark'
]

/** Attributes that name URLs; each keeps only what `safeLinkURL` or `safeImageSource` allow. */
const LINK_ATTRIBUTES = new Set(['href', 'xlink:href', 'action', 'formaction', 'cite'])
const IMAGE_ATTRIBUTES = new Set(['src', 'poster', 'background'])
/** Attributes dropped outright: inline documents, pings, and alternate image candidates. */
const REMOVED_ATTRIBUTES = new Set(['srcdoc', 'ping', 'srcset', 'http-equiv', 'imagesrcset'])

const CSS_IMPORT = /@import[^;]*;?/gi

/**
 * Parses of the output a sanitize may take. Serialized HTML can parse into a different tree
 * (mutation XSS), so each pass reads the previous output; HTML that has not settled by the last
 * pass is refused.
 */
const MAX_SANITIZE_PASSES = 4

export interface SanitizeWebHTMLOptions {
  /** The parser to read the HTML with; the global `DOMParser` by default. */
  parser?: Pick<DOMParser, 'parseFromString'>
  /** The address relative links and images resolve against. */
  baseURL?: string
}

/** Sets an attribute to a cleaned value, or removes it; true when that changed it. */
function replaceAttribute(element: Element, name: string, value: string, url: string | null) {
  if (url === value) return false
  if (url) element.setAttribute(name, url)
  else element.removeAttribute(name)
  return true
}

/** Cleans an element's attributes; true when any was removed or rewritten. */
function cleanAttributes(element: Element, baseURL: string | undefined): boolean {
  let changed = false
  // A copy, since removing attributes changes the live list.
  for (const { name, value } of Array.from(element.attributes)) {
    const lower = name.toLowerCase()
    if (lower.startsWith('on') || REMOVED_ATTRIBUTES.has(lower)) {
      element.removeAttribute(name)
      changed = true
    } else if (LINK_ATTRIBUTES.has(lower)) {
      changed = replaceAttribute(element, name, value, safeLinkURL(value, baseURL)) || changed
    } else if (IMAGE_ATTRIBUTES.has(lower)) {
      changed = replaceAttribute(element, name, value, safeImageSource(value, baseURL)) || changed
    }
  }
  return changed
}

/** One parse of the HTML, cleaned and serialized, and whether cleaning changed anything. */
function sanitizePass(
  html: string,
  parser: Pick<DOMParser, 'parseFromString'>,
  baseURL: string | undefined
): { html: string; changed: boolean } {
  const document = parser.parseFromString(html, 'text/html')
  const removed = [...document.querySelectorAll(REMOVED_TAGS.join(','))]
  for (const element of removed) element.remove()
  let changed = removed.length > 0
  for (const element of document.querySelectorAll('*')) {
    changed = cleanAttributes(element, baseURL) || changed
  }
  const styles = [...document.querySelectorAll('style')].map((style) => {
    const css = style.textContent.replaceAll(CSS_IMPORT, '')
    if (css !== style.textContent) {
      style.textContent = css
      changed = true
    }
    // Styles in the head would be lost with it; the importer reads them from the body.
    return document.body.contains(style) ? '' : style.outerHTML
  })
  return { html: `${styles.join('')}${document.body.innerHTML}`, changed }
}

/**
 * HTML from outside, such as a web page's clipboard fragment, made safe to style in the app's
 * own document: no scripts, event handlers, frames, MathML, or script URLs, and no stylesheets
 * loaded from elsewhere. The parser builds an inert document, so nothing runs while it is
 * cleaned. The result is a fixed point: parsing it again finds nothing to clean and serializes
 * to the same HTML, so a later parse cannot grow elements the cleaning never saw. Returns an
 * empty string for HTML above `MAX_WEB_HTML_LENGTH`, HTML that never settles, or without a
 * parser.
 */
export function sanitizeWebHTML(html: string, options: SanitizeWebHTMLOptions = {}): string {
  if (html.length > MAX_WEB_HTML_LENGTH) return ''
  const parser = options.parser ?? (typeof DOMParser === 'undefined' ? undefined : new DOMParser())
  if (!parser) return ''
  let current = html
  for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass++) {
    const next = sanitizePass(current, parser, options.baseURL)
    if (!next.changed && next.html === current) return current
    current = next.html
  }
  return ''
}

/** Whether HTML draws anything: text other than whitespace, or an image. */
export function hasWebContent(html: string, options: Pick<SanitizeWebHTMLOptions, 'parser'> = {}) {
  const parser = options.parser ?? (typeof DOMParser === 'undefined' ? undefined : new DOMParser())
  if (!parser) return false
  const document = parser.parseFromString(html, 'text/html')
  return (
    document.body.textContent.trim().length > 0 ||
    document.body.querySelector('img, svg, picture, video, canvas') !== null
  )
}
