import type * as HappyDOM from 'happy-dom'
import { toUint8Array } from 'js-base64'
import type { svg2pdf } from 'svg2pdf.js'

import { IS_BROWSER } from '#core/constants'

/** A page's SVG markup as the element svg2pdf draws, or null when it does not parse. */
export type SVGPageParser = (svg: string) => Element | null

interface SVGParser {
  parseFromString(
    svg: string,
    type: 'image/svg+xml'
  ): {
    querySelector(selectors: string): unknown
    documentElement: unknown
  }
}

/** The pixel size a data URI's image holds, as svg2pdf asks an `Image` for it. */
function imageSize(source: string): [number, number] {
  const comma = source.indexOf(',')
  if (comma === -1 || !source.slice(0, comma).includes(';base64')) {
    throw new Error('Not a base64 data URI')
  }
  const bytes = toUint8Array(source.slice(comma + 1))
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const starts = (text: string, at = 0) =>
    Array.from(text, (character, index) => bytes[at + index] === character.charCodeAt(0)).every(
      Boolean
    )
  if (starts('\x89PNG')) return [view.getUint32(16), view.getUint32(20)]
  if (starts('GIF8')) return [view.getUint16(6, true), view.getUint16(8, true)]
  if (starts('RIFF') && starts('WEBP', 8)) {
    const kind = String.fromCharCode(...bytes.subarray(12, 16))
    if (kind === 'VP8X') {
      return [
        1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16))
      ]
    }
    if (kind === 'VP8 ')
      return [view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff]
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let at = 2; at + 9 < bytes.length;) {
      if (bytes[at] !== 0xff) {
        at++
        continue
      }
      const marker = bytes[at + 1]
      const length = view.getUint16(at + 2)
      // Start-of-frame markers carry the image's size; C4, C8, and CC are other segments.
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return [view.getUint16(at + 7), view.getUint16(at + 5)]
      }
      at += 2 + length
    }
  }
  throw new Error('Unsupported image data')
}

/**
 * The `Image` svg2pdf asks for an image's size by name, for a host without one: it decodes only a
 * base64 data URI's header, which is all the size needs.
 */
class HeadlessImage {
  width = 0
  height = 0
  onload: (() => void) | null = null
  onerror: ((error: unknown) => void) | null = null

  set src(value: string) {
    try {
      const [width, height] = imageSize(value)
      this.width = width
      this.height = height
      queueMicrotask(() => this.onload?.())
    } catch (error) {
      queueMicrotask(() => this.onerror?.(error))
    }
  }
}

/**
 * The globals svg2pdf reads: it parses a page's stylesheets in a document it makes, and keeps the
 * rules that are instances of the CSSOM classes.
 */
interface SVG2PDFGlobals {
  document?: unknown
  CSSStyleSheet?: unknown
  CSSStyleRule?: unknown
  Image?: unknown
}

const SVG2PDF_GLOBALS = ['document', 'CSSStyleSheet', 'CSSStyleRule'] as const

type SVG2PDFGlobal = (typeof SVG2PDF_GLOBALS)[number] | 'Image'

function removeGlobal(scope: SVG2PDFGlobals, name: SVG2PDFGlobal): void {
  if (name === 'document') delete scope.document
  else if (name === 'CSSStyleSheet') delete scope.CSSStyleSheet
  else if (name === 'Image') delete scope.Image
  else delete scope.CSSStyleRule
}

/**
 * Kept out of the browser bundle: a browser has a DOM of its own, and happy-dom is only loaded
 * where there is none.
 */
const HAPPY_DOM = 'happy-dom'

let exporting: Promise<unknown> = Promise.resolve()

function isElement(value: unknown): value is Element {
  return typeof value === 'object' && value !== null && 'tagName' in value
}

function parseSVGPage(parser: SVGParser): SVGPageParser {
  return (svg) => {
    const parsed = parser.parseFromString(svg, 'image/svg+xml')
    if (parsed.querySelector('parsererror')) return null
    return isElement(parsed.documentElement) ? parsed.documentElement : null
  }
}

/**
 * Runs `draw` with a parser for page SVG and the DOM svg2pdf draws it through. A browser has both.
 * Elsewhere, as in the CLI, happy-dom stands in: svg2pdf reads its DOM as globals, so they are set
 * only while `draw` runs, one export at a time, and restored after.
 */
export function withPDFDOM<T>(draw: (parse: SVGPageParser) => Promise<T>): Promise<T> {
  if (IS_BROWSER) return draw(parseSVGPage(new DOMParser()))
  const run = exporting.then(() => withHappyDOM(draw))
  exporting = run.catch(() => undefined)
  return run
}

async function withHappyDOM<T>(draw: (parse: SVGPageParser) => Promise<T>): Promise<T> {
  const { Window } = (await import(/* @vite-ignore */ HAPPY_DOM)) as typeof HappyDOM
  const dom = new Window()
  const scope: SVG2PDFGlobals = globalThis
  const values: Record<SVG2PDFGlobal, unknown> = {
    document: dom.document,
    CSSStyleSheet: dom.CSSStyleSheet,
    CSSStyleRule: dom.CSSStyleRule,
    Image: HeadlessImage
  }
  // Each global replaced, with its descriptor before, so an accessor a host defines comes back as
  // one and a global that could not be replaced is left as it was.
  const replaced: Array<[SVG2PDFGlobal, PropertyDescriptor | undefined]> = []
  let replacedImage: PropertyDescriptor | undefined
  let hadImage = false
  try {
    // svg2pdf reads an image's size through a browser `Image`, which a CLI host lacks.
    if (!('Image' in globalThis)) {
      replacedImage = Object.getOwnPropertyDescriptor(globalThis, 'Image')
      hadImage = false
      Object.defineProperty(globalThis, 'Image', {
        value: HeadlessImage,
        configurable: true,
        writable: true
      })
    } else {
      hadImage = true
    }
    for (const name of SVG2PDF_GLOBALS) {
      const previous = Object.getOwnPropertyDescriptor(globalThis, name)
      Object.defineProperty(globalThis, name, {
        value: values[name],
        configurable: true,
        writable: true
      })
      replaced.push([name, previous])
    }
    return await draw(parseSVGPage(new dom.DOMParser()))
  } finally {
    // What is replaced is configurable, so putting it back does not throw.
    for (const [name, previous] of replaced) {
      if (previous) Object.defineProperty(globalThis, name, previous)
      else removeGlobal(scope, name)
    }
    if (!hadImage) {
      if (replacedImage) Object.defineProperty(globalThis, 'Image', replacedImage)
      else removeGlobal(scope, 'Image')
    }
    await dom.happyDOM.close()
  }
}

/**
 * Loads `svg2pdf.js`. Its package publishes a UMD build only, whose factory reads jsPDF from the
 * global `jspdf` and, with no CommonJS `exports`, writes the function to the global `svg2pdf`; a
 * bundler supplies both, a bare Node install supplies neither, and the module then fails on load.
 * The two globals exist only while the import evaluates, and the function the module made keeps
 * the jsPDF it read, so the rest of the export needs nothing from them.
 */
/**
 * svg2pdf.js's `main` is a UMD build in a `"type": "module"` package with no `exports`, so Node
 * loads it as ESM and it throws for want of a global jsPDF. Its ES build, the `module` file
 * bundlers and Bun already pick, loads everywhere.
 */
export async function loadSVG2PDF(): Promise<typeof svg2pdf> {
  const module = (await import('svg2pdf.js/dist/svg2pdf.es.min.js')) as {
    svg2pdf?: typeof svg2pdf
  }
  if (!module.svg2pdf) throw new Error('svg2pdf.js exported no svg2pdf function')
  return module.svg2pdf
}
