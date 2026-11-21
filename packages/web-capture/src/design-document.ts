import { omit } from 'es-toolkit'

import type { WebCapture } from './format'
import { ownValue } from './record'
import type { WebCaptureBox, WebCaptureElement, WebCaptureNode, WebCaptureText } from './types'

/**
 * An element of the styled DOM `@pairdraw/dom-css` builds layers from. The shape matches its
 * `DesignElement`, so a capture imports through `sceneGraphFromStyledHTML` without a CSS runtime.
 */
export interface WebCaptureDesignElement {
  type: 'element'
  tagName: string
  attrs: Record<string, string>
  computedStyle: Record<string, string>
  children: WebCaptureDesignNode[]
}

export type WebCaptureDesignNode = WebCaptureDesignElement | WebCaptureText

/** The styled DOM of a capture, matching `@pairdraw/dom-css`'s `DesignDocument`. */
export interface WebCaptureDesignDocument {
  type: 'document'
  children: WebCaptureDesignNode[]
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const
type Side = (typeof SIDES)[number]

/**
 * Displays the importer has no layout for, mapped to the closest one it has. A grid of
 * fixed-size cells wraps as a row of them does, and a table row is a row of its cells.
 */
const DISPLAY_FALLBACKS: Record<string, Record<string, string>> = {
  grid: { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'wrap' },
  'inline-grid': { display: 'inline-flex', 'flex-direction': 'row', 'flex-wrap': 'wrap' },
  'table-row': { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'nowrap' },
  table: { display: 'block' },
  'inline-table': { display: 'inline-block' },
  'table-row-group': { display: 'block' },
  'table-header-group': { display: 'block' },
  'table-footer-group': { display: 'block' },
  'table-cell': { display: 'block' },
  'table-caption': { display: 'block' },
  'list-item': { display: 'block' },
  'flow-root': { display: 'block' }
}

/**
 * Inline text tags the importer lays out inline when they say nothing of their display. Left
 * without one, a run such as a link or a bold word stays text instead of a box around text.
 */
const INLINE_TEXT_TAGS = new Set(['a', 'b', 'code', 'em', 'i', 'small', 'span', 'strong', 'u'])

function pixels(value: string | undefined): number {
  if (!value?.endsWith('px')) return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`
}

const MARGINS = SIDES.map((side) => `margin-${side}` as const)

/** The element's margins in pixels, and its style without them. */
function splitMargins(style: Record<string, string>) {
  const margins = { top: 0, right: 0, bottom: 0, left: 0 }
  for (const side of SIDES) margins[side] = pixels(style[`margin-${side}`])
  return { margins, style: omit(style, MARGINS) }
}

function isAbsolute(style: Record<string, string>): boolean {
  return style.position === 'absolute' || style.position === 'fixed'
}

function isInline(style: Record<string, string>): boolean {
  return (ownValue(style, 'display') ?? '').startsWith('inline')
}

/**
 * Places an absolute box in its parent layer. CSS measures `left` and `top` from the containing
 * block, which may be a further ancestor or the viewport, so the recorded boxes place it where
 * the page drew it. Without them, it sits at its offset plus its margin, as CSS places it.
 */
function placeAbsolute(
  style: Record<string, string>,
  margins: Record<Side, number>,
  box: WebCaptureBox | undefined,
  parentBox: WebCaptureBox | undefined
): void {
  if (box && parentBox) {
    style.left = px(box.x - parentBox.x)
    style.top = px(box.y - parentBox.y)
    return
  }
  if (ownValue(style, 'left') !== undefined) style.left = px(pixels(style.left) + margins.left)
  if (ownValue(style, 'top') !== undefined) style.top = px(pixels(style.top) + margins.top)
}

/**
 * A box in normal flow keeps the room its margins took inside a transparent box padded by them.
 * Negative margins, which pull neighbours over each other, are dropped.
 */
function marginBox(
  element: WebCaptureDesignElement,
  margins: Record<Side, number>
): WebCaptureDesignElement {
  const style: Record<string, string> = { display: 'block' }
  for (const side of SIDES) {
    if (margins[side] > 0) style[`padding-${side}`] = px(margins[side])
  }
  const alignSelf = ownValue(element.computedStyle, 'align-self')
  if (alignSelf === undefined) {
    return { type: 'element', tagName: 'div', attrs: {}, computedStyle: style, children: [element] }
  }
  // The box is the flex item now, so it aligns itself as the element did.
  style['align-self'] = alignSelf
  const child = { ...element, computedStyle: omit(element.computedStyle, ['align-self']) }
  return { type: 'element', tagName: 'div', attrs: {}, computedStyle: style, children: [child] }
}

function convertChildren(
  children: readonly WebCaptureNode[],
  parentBox: WebCaptureBox | undefined
): WebCaptureDesignNode[] {
  return children.map((child): WebCaptureDesignNode =>
    child.type === 'text' ? child : convertElement(child, parentBox)
  )
}

const GRID_DISPLAYS = new Set(['grid', 'inline-grid'])

type BoxedElement = WebCaptureElement & { box: WebCaptureBox }

function hasBox(element: WebCaptureElement): element is BoxedElement {
  return element.box !== undefined
}

/**
 * A grid whose items can stay where the page drew them: the capture recorded the grid's box and
 * every item's, and the grid holds no loose text. Null otherwise, and for anything but a grid.
 */
function placeableGrid(
  element: WebCaptureElement
): { box: WebCaptureBox; items: BoxedElement[] } | null {
  if (!GRID_DISPLAYS.has(ownValue(element.computedStyle, 'display') ?? '') || !hasBox(element)) {
    return null
  }
  const items: BoxedElement[] = []
  for (const child of element.children) {
    if (child.type === 'text') {
      if (child.text.trim().length > 0) return null
    } else if (hasBox(child)) {
      items.push(child)
    } else {
      return null
    }
  }
  return { box: element.box, items }
}

/**
 * Auto layout has no grid tracks, so a grid keeps its drawn size and its items become absolute
 * boxes where the page drew them. Their margins already moved their boxes.
 */
function gridStyle(style: Record<string, string>, box: WebCaptureBox): Record<string, string> {
  return {
    ...omit(style, ['gap', 'row-gap', 'column-gap']),
    display: style.display === 'inline-grid' ? 'inline-block' : 'block',
    width: px(box.width),
    height: px(box.height),
    'box-sizing': 'border-box'
  }
}

const PLACEMENT = [...MARGINS, 'position', ...SIDES]

function placeGridItem(item: BoxedElement, grid: WebCaptureBox): WebCaptureDesignElement {
  // Without margins or a position of its own, the item converts to itself, not a margin box.
  const converted = convertElement({ ...item, computedStyle: omit(item.computedStyle, PLACEMENT) })
  converted.computedStyle = {
    ...converted.computedStyle,
    position: 'absolute',
    left: px(item.box.x - grid.x),
    top: px(item.box.y - grid.y),
    width: px(item.box.width),
    height: px(item.box.height),
    'box-sizing': 'border-box'
  }
  return converted
}

/**
 * The style an element is laid out with, the closest display the importer has standing in for
 * one it lacks, and its converted children.
 */
function layoutOf(element: WebCaptureElement) {
  const grid = placeableGrid(element)
  if (grid) {
    return {
      displayed: gridStyle(element.computedStyle, grid.box),
      children: grid.items.map((item) => placeGridItem(item, grid.box))
    }
  }
  const display = ownValue(element.computedStyle, 'display') ?? ''
  return {
    displayed: { ...element.computedStyle, ...DISPLAY_FALLBACKS[display] },
    children: convertChildren(element.children, element.box)
  }
}

/** Input types Chrome paints as a small intrinsic glyph, whatever box `width` gives them. */
const GLYPH_INPUT_TYPES: Record<string, true> = { checkbox: true, radio: true }

/**
 * A checkbox or radio wider than its glyph: Chrome honors the width for layout but paints only
 * a small square centered in the box (`input { width: 100% }` in a flex label). Import the
 * square at the glyph's size, centered in a box that keeps the room the wide element took, so
 * following content stays where the page put it. Null when the box already fits the glyph.
 */
function glyphBox(
  element: WebCaptureElement,
  converted: WebCaptureDesignElement,
  margins: Record<Side, number>,
  parentBox: WebCaptureBox | undefined
): WebCaptureDesignElement | null {
  const box = element.box
  if (
    element.tagName !== 'input' ||
    !Object.hasOwn(GLYPH_INPUT_TYPES, element.attrs.type) ||
    !box ||
    box.width <= 0 ||
    box.height <= 0
  ) {
    return null
  }
  const side = Math.min(box.width, box.height)
  if (box.width - side < 1) return null
  const style = converted.computedStyle
  // The wrapper takes the placement, so the square must not be positioned or margined itself.
  const absolute = isAbsolute(style)
  style.width = px(side)
  style.height = px(side)
  style['box-sizing'] = 'border-box'
  delete style.position
  delete style.left
  delete style.top
  delete style.right
  delete style.bottom
  const wrapper: Record<string, string> = {
    display: 'flex',
    'justify-content': 'center',
    'align-items': 'center',
    width: px(box.width),
    height: px(box.height),
    'box-sizing': 'border-box'
  }
  const alignSelf = ownValue(style, 'align-self')
  if (alignSelf !== undefined) {
    wrapper['align-self'] = alignSelf
    delete style['align-self']
  }
  const wrapped: WebCaptureDesignElement = {
    type: 'element',
    tagName: 'div',
    attrs: {},
    computedStyle: wrapper,
    children: [converted]
  }
  if (absolute) {
    wrapper.position = element.computedStyle.position === 'fixed' ? 'fixed' : 'absolute'
    for (const key of ['left', 'top']) {
      const value = ownValue(element.computedStyle, key)
      if (value !== undefined) wrapper[key] = value
    }
    placeAbsolute(wrapper, margins, box, parentBox)
    return wrapped
  }
  return SIDES.some((side) => margins[side] > 0) ? marginBox(wrapped, margins) : wrapped
}

/** What a box records of its size and border, which a word box drawn as a run of text drops. */
const WORD_BOX_PROPERTIES = [
  'display',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'box-sizing',
  ...SIDES.flatMap((side) => ['style', 'width', 'color'].map((part) => `border-${side}-${part}`))
]

/** Properties that make a box draw something besides its text, or change where its text sits. */
const DRAWN_BOX_PROPERTIES = [
  'background-color',
  'background-image',
  'box-shadow',
  'opacity',
  'overflow',
  ...SIDES.map((side) => `padding-${side}` as const)
]

/**
 * An inline-block that holds one line of text and draws nothing else, as pages that fade words
 * in box each word. It reads as a run of the text around it, not a box: kept as a box, every word
 * becomes a layer of its own and wraps at its own width.
 */
function isWordBox(element: WebCaptureElement, style: Record<string, string>): boolean {
  if (style.display !== 'inline-block' || !INLINE_TEXT_TAGS.has(element.tagName)) return false
  if (!element.children.every((child) => child.type === 'text')) return false
  if (DRAWN_BOX_PROPERTIES.some((property) => ownValue(style, property) !== undefined)) return false
  if (SIDES.some((side) => pixels(style[`margin-${side}`]) !== 0)) return false
  if (SIDES.some((side) => pixels(style[`border-${side}-width`]) > 0)) return false
  const lineHeight = pixels(style['line-height']) || pixels(style['font-size']) * 1.5
  return element.box !== undefined && element.box.height < lineHeight * 1.5
}

function convertElement(
  element: WebCaptureElement,
  parentBox?: WebCaptureBox
): WebCaptureDesignElement {
  const { displayed, children } = layoutOf(element)
  if (isWordBox(element, displayed)) {
    return {
      type: 'element',
      tagName: element.tagName,
      attrs: { ...element.attrs },
      computedStyle: omit(displayed, [...WORD_BOX_PROPERTIES, ...MARGINS]),
      children
    }
  }
  const inline = isInline(displayed)
  const split = splitMargins(displayed)
  const { margins } = split
  const style =
    displayed.display === 'inline' && INLINE_TEXT_TAGS.has(element.tagName)
      ? omit(split.style, ['display'])
      : split.style
  const converted: WebCaptureDesignElement = {
    type: 'element',
    tagName: element.tagName,
    attrs: { ...element.attrs },
    computedStyle: style,
    children
  }
  const glyph = glyphBox(element, converted, margins, parentBox)
  if (glyph) return glyph
  if (isAbsolute(style)) {
    placeAbsolute(style, margins, element.box, parentBox)
    return converted
  }
  const spaced = SIDES.some((side) => margins[side] > 0)
  return spaced && !inline ? marginBox(converted, margins) : converted
}

/**
 * The capture as the styled DOM layers are built from. The root keeps the size it had on the
 * page and drops its own position and margins, so it lands where a paste puts it.
 */
export function webCaptureDesignDocument(capture: WebCapture): WebCaptureDesignDocument {
  const { root } = capture
  const { displayed, children } = layoutOf(root)
  const style = omit(splitMargins(displayed).style, ['position', ...SIDES])
  // The box a capture records is the border box, padding and borders included.
  if (root.box) {
    style.width = px(root.box.width)
    style.height = px(root.box.height)
    style['box-sizing'] = 'border-box'
  }
  return {
    type: 'document',
    children: [
      {
        type: 'element',
        tagName: root.tagName,
        attrs: { ...root.attrs },
        computedStyle: style,
        children
      }
    ]
  }
}
