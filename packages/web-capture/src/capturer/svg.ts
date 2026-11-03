import type { CaptureWindow, ImageSize } from './images'

/**
 * Presentation properties an icon usually takes from the page's stylesheets or `currentColor`,
 * which a standalone SVG loses. They are written onto the copy as inline styles.
 */
const PRESENTATION_PROPERTIES = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'opacity',
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'display',
  'visibility'
]

/** Elements whose styles are copied; very large drawings keep the rest as they are. */
const MAX_STYLED_ELEMENTS = 4000

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

function inlineStyles(view: CaptureWindow, original: Element, copy: Element): void {
  const style = view.getComputedStyle(original)
  const declarations = PRESENTATION_PROPERTIES.flatMap((property) => {
    const value = style.getPropertyValue(property)
    return value ? [`${property}:${value}`] : []
  })
  if (declarations.length > 0) copy.setAttribute('style', declarations.join(';'))
}

/** A `<use>` pointing at an icon sprite elsewhere in the page needs that sprite in the copy. */
function referencedSymbols(svg: SVGSVGElement, document: Document): Element[] {
  const symbols = new Set<Element>()
  for (const use of svg.querySelectorAll('use')) {
    const reference = use.getAttribute('href') ?? use.getAttribute('xlink:href') ?? ''
    if (!reference.startsWith('#')) continue
    const target = document.getElementById(reference.slice(1))
    if (target && !svg.contains(target)) symbols.add(target)
  }
  return [...symbols]
}

/**
 * The SVG as standalone markup that draws as it did on the page: its computed presentation
 * styles inlined, sprites it references copied in, and its drawn size set.
 */
export function standaloneSVGMarkup(
  view: CaptureWindow,
  svg: SVGSVGElement,
  size: ImageSize
): string {
  const copy = svg.cloneNode(true)
  if (!(copy instanceof view.SVGSVGElement)) return ''
  const originals = [svg, ...svg.querySelectorAll('*')]
  const copies = [copy, ...copy.querySelectorAll('*')]
  for (const [index, original] of originals.slice(0, MAX_STYLED_ELEMENTS).entries()) {
    const target = copies.at(index)
    if (target) inlineStyles(view, original, target)
  }
  const symbols = referencedSymbols(svg, svg.ownerDocument)
  if (symbols.length > 0) {
    const defs = svg.ownerDocument.createElementNS(SVG_NAMESPACE, 'defs')
    for (const symbol of symbols) defs.append(symbol.cloneNode(true))
    copy.prepend(defs)
  }
  copy.setAttribute('xmlns', SVG_NAMESPACE)
  copy.setAttribute('width', String(size.width))
  copy.setAttribute('height', String(size.height))
  return new view.XMLSerializer().serializeToString(copy)
}
