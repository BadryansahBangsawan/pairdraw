import { pick } from 'es-toolkit'
import { isValid, toUint8Array } from 'js-base64'

import {
  SceneGraph,
  type Effect,
  type Fill,
  type ImageScaleMode,
  type SceneNode,
  type Stroke
} from '@pairdraw/scene-graph'
import { TRANSPARENT } from '@pairdraw/scene-graph/constants'
import {
  parseCSSAlignSelf,
  parseCSSBackgroundImages,
  parseCSSNumber,
  parseCSSShadows
} from '@pairdraw/scene-graph/css'
import { normalizeEffects } from '@pairdraw/scene-graph/effects'
import { blurRadiusForSigma } from '@pairdraw/scene-graph/geometry'
import { computeImageHash } from '@pairdraw/scene-graph/images'
import { textLayerName } from '@pairdraw/scene-graph/node-defaults'

import type { DesignDocument, DesignElement, DesignNode, DesignStyleDeclaration } from '../types'
import { colorToFillFromCSS, colorToStrokeFromCSS, mergedStyle, pickStyle } from './css-values'
import {
  applyContainerLayout,
  applyFlowSizing,
  elementDisplay,
  flowOf,
  inheritedTextStyle,
  type FlowKind,
  type ParentFlow
} from './flow'
import { resolveFontFamilyStack } from './fonts'
import {
  blockRichText,
  characterStyleFromCSS,
  elementLink,
  holdsTextBlocks,
  inlineRichText,
  isInlineContent,
  applyParagraphs,
  type CSSCharacterStyle
} from './text'

const DOM_CSS_PLUGIN_ID = 'pairdraw-dom-css'
const IMAGE_SOURCE_URL_KEY = 'image-source-url'

/**
 * CSS shadows as the layer's effects, each blurred as the browser blurs it: CSS blurs a shadow
 * by half its blur length, which the canvas draws from the radius that gives that sigma.
 */
function cssShadows(value: string | undefined) {
  return parseCSSShadows(value).map((effect): Effect => {
    if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return effect
    return { ...effect, radius: blurRadiusForSigma(effect.radius / 2) }
  })
}

export interface DesignDocumentToSceneGraphOptions {
  pageName?: string
  /**
   * The family a CSS `font-family` stack should draw, given the stack's families; null keeps it.
   * Hosts with a font service pass one that skips faces the document cannot draw; without it the
   * first concrete family wins and a generic keyword maps to a concrete face of its class.
   */
  resolveFontFamily?: (value: string) => string | null
}

/**
 * The document with every element's font stack resolved to the family its text layer draws, so
 * the per-character CSS parse sees a concrete name instead of a generic keyword.
 */
function withResolvedFontFamilies(
  node: DesignNode,
  resolve: (value: string) => string | null
): DesignNode {
  if (node.type !== 'element') return node
  const resolved = (
    style: DesignStyleDeclaration | undefined
  ): DesignStyleDeclaration | undefined => {
    const stack = style?.['font-family']
    const family = stack === undefined ? null : resolve(stack)
    return family && family !== stack ? { ...style, 'font-family': family } : style
  }
  const computedStyle = resolved(node.computedStyle)
  const inlineStyle = resolved(node.inlineStyle)
  const next: DesignElement = {
    ...node,
    children: node.children.map((child) => withResolvedFontFamilies(child, resolve))
  }
  if (computedStyle) next.computedStyle = computedStyle
  if (inlineStyle) next.inlineStyle = inlineStyle
  return next
}

function textContent(node: DesignNode): string {
  if (node.type === 'text') return node.text
  return node.children.map(textContent).join('')
}

function isTextLikeElement(node: DesignElement): boolean {
  return [
    'span',
    'p',
    'label',
    'strong',
    'em',
    'button',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6'
  ].includes(node.tagName.toLowerCase())
}

function firstCSSNumber(style: DesignStyleDeclaration, ...properties: string[]): number | null {
  for (const property of properties) {
    const parsed = parseCSSNumber(pickStyle(style, property))
    if (parsed !== null) return parsed
  }
  return null
}

function fillsFromStyle(style: DesignStyleDeclaration, property: string): Fill[] {
  return colorToFillFromCSS(pickStyle(style, property))
}

/**
 * The `background-image` layers as fills, bottom-first as Pairdraw paints them: CSS paints the
 * first layer on top, so the list reverses. A `url()` layer becomes an image fill when its
 * bytes are inline; a remote address is skipped, as an unfetchable background paints nothing.
 */
function backgroundFills(
  graph: SceneGraph,
  node: SceneNode,
  style: DesignStyleDeclaration
): Fill[] {
  const layers = parseCSSBackgroundImages(
    pickStyle(style, 'background-image'),
    node.width,
    node.height
  )
  const fills: Fill[] = []
  for (const layer of layers) {
    if (layer.kind === 'gradient') {
      fills.push(layer.fill)
      continue
    }
    const bytes = bytesFromDataURL(layer.url)
    if (!bytes) continue
    const imageHash = computeImageHash(bytes)
    graph.images.set(imageHash, bytes)
    fills.push({
      type: 'IMAGE',
      imageHash,
      imageScaleMode: 'FILL',
      color: { ...TRANSPARENT },
      opacity: 1,
      visible: true
    })
  }
  return fills.reverse()
}

function aspectRatioFromCSS(value: string | undefined): number | null {
  if (!value || value === 'auto') return null
  const parts = value
    .split('/')
    .map((part) => Number.parseFloat(part.trim()))
    .filter(Number.isFinite)
  if (parts.length === 1 && parts[0] > 0) return parts[0]
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1]
  return null
}

function setNodeBox(node: SceneNode, style: DesignStyleDeclaration): void {
  const width = firstCSSNumber(style, 'width')
  const height = firstCSSNumber(style, 'height')
  const minWidth = firstCSSNumber(style, 'min-width')
  const maxWidth = firstCSSNumber(style, 'max-width')
  const minHeight = firstCSSNumber(style, 'min-height')
  const maxHeight = firstCSSNumber(style, 'max-height')
  const aspectRatio = aspectRatioFromCSS(pickStyle(style, 'aspect-ratio'))
  if (width !== null) node.width = width
  if (height !== null) node.height = height
  if (height === null && width !== null && aspectRatio !== null) node.height = width / aspectRatio
  if (width === null && height !== null && aspectRatio !== null) node.width = height * aspectRatio
  if (minWidth !== null) node.minWidth = minWidth
  if (maxWidth !== null) node.maxWidth = maxWidth
  if (minHeight !== null) node.minHeight = minHeight
  if (maxHeight !== null) node.maxHeight = maxHeight
}

function firstStrokeColor(style: DesignStyleDeclaration) {
  return (
    pickStyle(style, 'border-color') ??
    pickStyle(style, 'border-top-color') ??
    pickStyle(style, 'border-right-color') ??
    pickStyle(style, 'border-bottom-color') ??
    pickStyle(style, 'border-left-color')
  )
}

function strokeWeightFromStyle(style: DesignStyleDeclaration) {
  const borderWidth = firstCSSNumber(style, 'border-width')
  if (borderWidth !== null) return borderWidth

  const sideWeights = [
    firstCSSNumber(style, 'border-top-width'),
    firstCSSNumber(style, 'border-right-width'),
    firstCSSNumber(style, 'border-bottom-width'),
    firstCSSNumber(style, 'border-left-width')
  ].filter((weight): weight is number => weight !== null)
  if (sideWeights.length === 0) return null
  return Math.max(...sideWeights)
}

function borderStyleFromCSS(style: DesignStyleDeclaration): string | undefined {
  return (
    pickStyle(style, 'border-style') ??
    pickStyle(style, 'border-top-style') ??
    pickStyle(style, 'border-right-style') ??
    pickStyle(style, 'border-bottom-style') ??
    pickStyle(style, 'border-left-style')
  )
}

function dashPatternFromCSS(style: DesignStyleDeclaration, strokeWeight: number): number[] {
  const borderStyle = borderStyleFromCSS(style)
  if (borderStyle === 'dashed') return [strokeWeight * 3, strokeWeight * 2]
  if (borderStyle === 'dotted') return [strokeWeight, strokeWeight]
  return []
}

function setBorderWeights(node: SceneNode, style: DesignStyleDeclaration, stroke: Stroke): void {
  const top = firstCSSNumber(style, 'border-top-width') ?? stroke.weight
  const right = firstCSSNumber(style, 'border-right-width') ?? stroke.weight
  const bottom = firstCSSNumber(style, 'border-bottom-width') ?? stroke.weight
  const left = firstCSSNumber(style, 'border-left-width') ?? stroke.weight
  node.borderTopWeight = top
  node.borderRightWeight = right
  node.borderBottomWeight = bottom
  node.borderLeftWeight = left
  node.independentStrokeWeights = [top, right, bottom, left].some(
    (weight) => weight !== stroke.weight
  )
}

function applyCornerRadii(node: SceneNode, style: DesignStyleDeclaration): void {
  const cornerRadius = firstCSSNumber(style, 'border-radius')
  const topLeft = firstCSSNumber(style, 'border-top-left-radius')
  const topRight = firstCSSNumber(style, 'border-top-right-radius')
  const bottomRight = firstCSSNumber(style, 'border-bottom-right-radius')
  const bottomLeft = firstCSSNumber(style, 'border-bottom-left-radius')

  if (cornerRadius !== null) node.cornerRadius = cornerRadius
  if (topLeft === null && topRight === null && bottomRight === null && bottomLeft === null) return

  const fallback = cornerRadius ?? 0
  node.topLeftRadius = topLeft ?? fallback
  node.topRightRadius = topRight ?? fallback
  node.bottomRightRadius = bottomRight ?? fallback
  node.bottomLeftRadius = bottomLeft ?? fallback
  node.independentCorners = [
    node.topLeftRadius,
    node.topRightRadius,
    node.bottomRightRadius,
    node.bottomLeftRadius
  ].some((radius) => radius !== fallback)
}

function applyFlexGap(node: SceneNode, style: DesignStyleDeclaration): void {
  const gap = firstCSSNumber(style, 'gap')
  const rowGap = firstCSSNumber(style, 'row-gap')
  const columnGap = firstCSSNumber(style, 'column-gap')
  const isHorizontal = node.layoutMode === 'HORIZONTAL'
  const isWrapped = node.layoutWrap === 'WRAP'

  node.itemSpacing = (isHorizontal ? columnGap : rowGap) ?? gap ?? 0
  node.counterAxisSpacing = (isHorizontal ? rowGap : columnGap) ?? (isWrapped ? (gap ?? 0) : 0)
}

function applyPositioning(node: SceneNode, style: DesignStyleDeclaration): void {
  const position = pickStyle(style, 'position')
  if (position === 'absolute' || position === 'fixed') node.layoutPositioning = 'ABSOLUTE'

  const left = firstCSSNumber(style, 'left')
  const top = firstCSSNumber(style, 'top')
  if (left !== null) node.x = left
  if (top !== null) node.y = top
}

/**
 * What CSS adds outside an explicit size: padding and borders, unless `box-sizing: border-box`
 * puts them inside it as auto layout does.
 */
function contentBoxExtras(style: DesignStyleDeclaration): { width: number; height: number } {
  if (pickStyle(style, 'box-sizing')?.trim() === 'border-box') return { width: 0, height: 0 }
  // A border takes room once it has a style other than none, its CSS default, whatever its color.
  const borderStyle = borderStyleFromCSS(style)
  const bordered = borderStyle !== undefined && borderStyle !== 'none' && borderStyle !== 'hidden'
  const side = (name: 'top' | 'right' | 'bottom' | 'left', axis: 'block' | 'inline') =>
    (firstCSSNumber(style, `padding-${name}`, `padding-${axis}`, 'padding') ?? 0) +
    (bordered ? (firstCSSNumber(style, `border-${name}-width`, 'border-width') ?? 0) : 0)
  return {
    width: side('left', 'inline') + side('right', 'inline'),
    height: side('top', 'block') + side('bottom', 'block')
  }
}

/** Explicit sizes count the padding and borders CSS places outside them. */
function applyBoxSizing(node: SceneNode, style: DesignStyleDeclaration): void {
  const extras = contentBoxExtras(style)
  const width = firstCSSNumber(style, 'width')
  const height = firstCSSNumber(style, 'height')
  // A size `aspect-ratio` derives from the other is a content size too.
  const ratio = aspectRatioFromCSS(pickStyle(style, 'aspect-ratio')) !== null
  if (extras.width > 0) {
    if (width !== null || (ratio && height !== null)) node.width += extras.width
    if (node.minWidth !== null) node.minWidth += extras.width
    if (node.maxWidth !== null) node.maxWidth += extras.width
  }
  if (extras.height > 0) {
    if (height !== null || (ratio && width !== null)) node.height += extras.height
    if (node.minHeight !== null) node.minHeight += extras.height
    if (node.maxHeight !== null) node.maxHeight += extras.height
  }
}

function applyPadding(node: SceneNode, style: DesignStyleDeclaration): void {
  node.paddingTop = firstCSSNumber(style, 'padding-top', 'padding-block', 'padding') ?? 0
  node.paddingRight = firstCSSNumber(style, 'padding-right', 'padding-inline', 'padding') ?? 0
  node.paddingBottom = firstCSSNumber(style, 'padding-bottom', 'padding-block', 'padding') ?? 0
  node.paddingLeft = firstCSSNumber(style, 'padding-left', 'padding-inline', 'padding') ?? 0
}

function imageScaleModeFromObjectFit(value: string | undefined): ImageScaleMode | null {
  if (value === 'contain' || value === 'scale-down') return 'FIT'
  if (value === 'cover') return 'FILL'
  return null
}

function bytesFromDataURL(value: string | undefined): Uint8Array | null {
  if (!value?.startsWith('data:')) return null
  const commaIndex = value.indexOf(',')
  if (commaIndex === -1) return null
  const metadata = value.slice(0, commaIndex)
  const body = value.slice(commaIndex + 1)
  // Invalid Base64 in imported HTML drops that image instead of the whole import.
  if (!metadata.endsWith(';base64') || !isValid(body)) return null
  return toUint8Array(body)
}

function applyImageFill(
  graph: SceneGraph,
  node: SceneNode,
  element: DesignElement,
  style: DesignStyleDeclaration
): void {
  if (element.tagName.toLowerCase() !== 'img') return
  const source = element.attrs.src
  const bytes = bytesFromDataURL(source)
  if (!bytes) {
    if (source) {
      node.pluginData = [
        ...node.pluginData,
        { pluginId: DOM_CSS_PLUGIN_ID, key: IMAGE_SOURCE_URL_KEY, value: source }
      ]
    }
    return
  }

  const imageHash = computeImageHash(bytes)
  graph.images.set(imageHash, bytes)
  node.fills = [
    {
      type: 'IMAGE',
      imageHash,
      imageScaleMode: imageScaleModeFromObjectFit(pickStyle(style, 'object-fit')) ?? 'FILL',
      color: TRANSPARENT,
      opacity: 1,
      visible: true
    }
  ]
}

function applyElementStyle(
  graph: SceneGraph,
  node: SceneNode,
  element: DesignElement,
  style: DesignStyleDeclaration
): void {
  setNodeBox(node, style)
  applyBoxSizing(node, style)
  applyPositioning(node, style)
  applyPadding(node, style)

  const fills = fillsFromStyle(style, 'background-color')
  const background = backgroundFills(graph, node, style)
  if (fills.length > 0 || background.length > 0) node.fills = [...fills, ...background]
  applyImageFill(graph, node, element, style)

  const strokes = colorToStrokeFromCSS(
    firstStrokeColor(style),
    strokeWeightFromStyle(style)?.toString()
  )
  if (strokes.length > 0) {
    const dashPattern = dashPatternFromCSS(style, strokes[0].weight)
    if (dashPattern.length > 0) {
      strokes[0].dashPattern = dashPattern
      node.dashPattern = dashPattern
    }
    node.strokes = strokes
    setBorderWeights(node, style, strokes[0])
    // A CSS border takes room: content sits inside it, as auto layout with strokes included does.
    node.strokesIncludedInLayout = true
  }

  const effects = cssShadows(pickStyle(style, 'box-shadow'))
  if (effects.length > 0) node.effects = normalizeEffects(effects)

  const opacity = parseCSSNumber(pickStyle(style, 'opacity'))
  if (opacity !== null) node.opacity = opacity

  applyCornerRadii(node, style)

  const overflow = pickStyle(style, 'overflow')
  if (overflow === 'hidden' || overflow === 'clip') node.clipsContent = true

  const alignSelf = parseCSSAlignSelf(pickStyle(style, 'align-self')) ?? 'AUTO'
  if (alignSelf !== 'AUTO') node.layoutAlignSelf = alignSelf
}

const CHARACTER_FIELDS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'italic',
  'letterSpacing',
  'lineHeight',
  'fills',
  'textDecoration',
  'textDecorationStyle',
  'textDecorationThickness',
  'textDecorationFills',
  'textDecorationSkipInk',
  'textUnderlineOffset',
  'textCase'
] as const satisfies readonly (keyof CSSCharacterStyle)[]

function applyTextStyle(node: SceneNode, style: DesignStyleDeclaration): void {
  setNodeBox(node, style)
  applyPositioning(node, style)
  Object.assign(node, characterStyleFromCSS(style, pick(node, CHARACTER_FIELDS)))

  const opacity = parseCSSNumber(pickStyle(style, 'opacity'))
  if (opacity !== null) node.opacity = opacity

  const effects = cssShadows(pickStyle(style, 'text-shadow'))
  if (effects.length > 0) node.effects = normalizeEffects(effects)

  const textAlign = pickStyle(style, 'text-align')?.toUpperCase()
  if (textAlign === 'CENTER' || textAlign === 'RIGHT' || textAlign === 'JUSTIFIED') {
    node.textAlignHorizontal = textAlign
  }

  if (pickStyle(style, 'white-space') === 'nowrap') node.maxLines = 1
}

/**
 * Text and inline elements, or blocks of text, as one text layer: spans become runs, blocks
 * paragraphs, and lists list paragraphs, as Figma holds rich text.
 */
function createRichTextNode(
  graph: SceneGraph,
  parentId: string,
  element: DesignElement,
  style: DesignStyleDeclaration,
  display: string,
  parentFlow: ParentFlow
): SceneNode {
  const node = graph.createNode('TEXT', parentId, { name: 'Text' })
  applyTextStyle(node, style)
  const blocks = holdsTextBlocks(element, isPlainElement, isInlineElement)
  const base = pick(node, CHARACTER_FIELDS)
  const rich = blocks ? blockRichText(element, style, base) : inlineRichText(element, style, base)
  node.text = rich.text
  node.name = textLayerName('TEXT', rich.text)
  node.styleRuns = rich.styleRuns
  if (blocks) applyParagraphs(node, rich)
  applyFlowSizing(graph, node, style, display, parentFlow)
  return node
}

/** Whether an element draws nothing of its own, so its text can join the text around it. */
function isPlainElement(element: DesignElement): boolean {
  return !hasBoxStyle(mergedStyle(element))
}

function isInlineElement(element: DesignElement): boolean {
  const style = mergedStyle(element)
  return elementDisplay(element, style) === 'inline' && !hasBoxStyle(style)
}

/** Whether the element's children are text in one layer: inline content, or text blocks. */
function holdsRichText(element: DesignElement): boolean {
  if (!element.children.some((child) => child.type === 'element')) return false
  if (holdsTextBlocks(element, isPlainElement, isInlineElement)) return true
  return isInlineContent(element, isInlineElement)
}

function createTextNode(
  graph: SceneGraph,
  parentId: string,
  text: string,
  style: DesignStyleDeclaration,
  display: string,
  parentFlow: ParentFlow
) {
  const node = graph.createNode('TEXT', parentId, { name: textLayerName('TEXT', text), text })
  applyTextStyle(node, style)
  applyFlowSizing(graph, node, style, display, parentFlow)
  return node
}

/** A link of text alone links all of it. */
function linkText(node: SceneNode, element: DesignElement): void {
  const hyperlink = elementLink(element)
  if (hyperlink && node.text.length > 0) {
    node.styleRuns = [{ start: 0, length: node.text.length, style: { hyperlink } }]
  }
}

const BOX_PROPERTIES = [
  'aspect-ratio',
  'background-color',
  'border-radius',
  'box-shadow',
  'display',
  'height',
  'width',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'object-fit',
  'overflow',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'flex-wrap',
  'align-self'
]

const PADDING_PROPERTIES = [
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'padding-block',
  'padding-inline'
]

const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const

/** Whether every length of a value is zero, as `0`, `0px`, and `0 0` are. */
function isZeroLength(value: string): boolean {
  return value
    .trim()
    .split(/\s+/)
    .every((part) => parseCSSNumber(part) === 0)
}

/** Whether any side's border draws: it has a style other than none and a width other than zero. */
function drawsBorder(style: DesignStyleDeclaration): boolean {
  return BORDER_SIDES.some((side) => {
    const borderStyle = pickStyle(style, `border-${side}-style`) ?? pickStyle(style, 'border-style')
    if (borderStyle === undefined || borderStyle === 'none' || borderStyle === 'hidden')
      return false
    // A styled border without a width is CSS's medium one.
    const width = pickStyle(style, `border-${side}-width`) ?? pickStyle(style, 'border-width')
    return width === undefined || !isZeroLength(width)
  })
}

/**
 * Whether the element is a box rather than a run of the text around it. Padding and borders of
 * no size, which resets such as Tailwind's give every element, leave it a run.
 */
function hasBoxStyle(style: DesignStyleDeclaration): boolean {
  if (BOX_PROPERTIES.some((property) => pickStyle(style, property) !== undefined)) return true
  if (
    PADDING_PROPERTIES.some((property) => {
      const value = pickStyle(style, property)
      return value !== undefined && !isZeroLength(value)
    })
  ) {
    return true
  }
  return drawsBorder(style)
}

function hasContent(element: DesignElement): boolean {
  return element.children.some((child) => child.type !== 'text' || child.text.trim().length > 0)
}

/** Whether a child sits in a line of its parent's content or leaves it, rather than a block. */
function isInLine(node: DesignNode): boolean {
  if (node.type === 'text' || node.tagName.toLowerCase() === 'br') return true
  const style = mergedStyle(node)
  const display = elementDisplay(node, style)
  const position = pickStyle(style, 'position')
  return (
    display.startsWith('inline') ||
    display === 'none' ||
    position === 'absolute' ||
    position === 'fixed'
  )
}

/**
 * Whether a block holds inline content with boxes in it, such as a paragraph with a styled
 * `<code>`, which CSS lays out in lines rather than stacking each run and box.
 */
function holdsInlineBoxes(element: DesignElement): boolean {
  return (
    element.children.some((child) => child.type === 'element') && element.children.every(isInLine)
  )
}

/** The flow a box lays its children out in, and whether they are one text instead. */
function containerFlow(element: DesignElement, display: string) {
  // A box without content keeps its own size, as an image does, unless it declares a layout.
  const own = hasContent(element) || flowOf(display) === 'flex' ? flowOf(display) : null
  const richText = own !== 'flex' && holdsRichText(element)
  // Inline content that cannot be one text runs in lines that wrap at the block's width.
  const lines = own === 'block' && !richText && holdsInlineBoxes(element)
  const flow: FlowKind | null = lines ? 'inline' : own
  return { flow, richText, lines }
}

function createElementNode(
  graph: SceneGraph,
  parentId: string,
  element: DesignElement,
  parentFlow: ParentFlow
): SceneNode | null {
  const style = mergedStyle(element)
  const display = elementDisplay(element, style)
  // A line break between boxes draws nothing; rich text reads it as a new line.
  if (display === 'none' || element.tagName.toLowerCase() === 'br') return null
  if (
    isTextLikeElement(element) &&
    !hasBoxStyle(style) &&
    element.children.every((child) => child.type === 'text')
  ) {
    const text = createTextNode(graph, parentId, textContent(element), style, display, parentFlow)
    linkText(text, element)
    return text
  }
  if (!hasBoxStyle(style) && holdsRichText(element)) {
    return createRichTextNode(graph, parentId, element, style, display, parentFlow)
  }

  const node = graph.createNode('FRAME', parentId, {
    // The HTML export writes each layer's own name as `data-name`.
    name: element.attrs['data-name'] || element.attrs.id || element.attrs.class || element.tagName,
    clipsContent: false
  })
  applyElementStyle(graph, node, element, style)
  const { flow, richText, lines } = containerFlow(element, display)
  if (flow) {
    applyContainerLayout(node, element, style, flow)
    if (flow === 'flex') applyFlexGap(node, style)
    if (lines) node.layoutWrap = 'WRAP'
  }
  applyFlowSizing(graph, node, style, display, parentFlow)

  // Blocks of text in a box's own flow are one text; a flex box's children are items.
  if (richText) {
    const textStyle = inheritedTextStyle(element, style)
    const textDisplay = flow === 'inline' ? 'inline' : 'block'
    createRichTextNode(graph, node.id, element, textStyle, textDisplay, flow ?? 'none')
    return node
  }
  const children = flow === 'flex' ? element.children.toSorted(byFlexOrder) : element.children
  for (const child of children) {
    createDesignNode(graph, node.id, child, flow ?? 'none', inheritedTextStyle(element, style))
  }

  return node
}

function flexOrder(node: DesignNode): number {
  return node.type === 'element' ? (parseCSSNumber(pickStyle(mergedStyle(node), 'order')) ?? 0) : 0
}

/** Flex items in the order CSS places them: by `order`, then as written. */
function byFlexOrder(a: DesignNode, b: DesignNode): number {
  return flexOrder(a) - flexOrder(b)
}

function createDesignNode(
  graph: SceneGraph,
  parentId: string,
  node: DesignNode,
  parentFlow: ParentFlow,
  inheritedStyle: DesignStyleDeclaration = {}
): SceneNode | null {
  if (node.type === 'text') {
    if (node.text.trim().length === 0) return null
    // Text runs in block flow and flex containers are blocks of their own, as CSS boxes them.
    const display = parentFlow === 'inline' ? 'inline' : 'block'
    return createTextNode(graph, parentId, node.text, inheritedStyle, display, parentFlow)
  }

  return createElementNode(graph, parentId, withFieldText(node), parentFlow)
}

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

/**
 * A text field with the text a browser draws in it, its value or else its placeholder, as a
 * child: an `<input>` holds no content of its own. A password shows as dots.
 */
function withFieldText(element: DesignElement): DesignElement {
  if (element.tagName.toLowerCase() !== 'input' || element.children.length > 0) return element
  const type = Object.hasOwn(element.attrs, 'type') ? element.attrs.type.trim().toLowerCase() : ''
  if (!TEXT_INPUT_TYPES.has(type)) return element
  const value = element.attrs.value || element.attrs.placeholder
  if (!value) return element
  const text = type === 'password' && element.attrs.value ? '•'.repeat(value.length) : value
  return { ...element, children: [{ type: 'text', text }] }
}

function fitPageToChildren(page: SceneNode, graph: SceneGraph): void {
  const children = graph.getChildren(page.id)
  if (children.length === 0) return
  page.width = Math.max(...children.map((child) => child.x + child.width))
  page.height = Math.max(...children.map((child) => child.y + child.height))
}

export function designDocumentToSceneGraph(
  document: DesignDocument,
  options: DesignDocumentToSceneGraphOptions = {}
): SceneGraph {
  const resolve = options.resolveFontFamily ?? resolveFontFamilyStack
  const resolved: DesignDocument = {
    ...document,
    children: document.children.map((child) => withResolvedFontFamilies(child, resolve))
  }
  const graph = new SceneGraph()
  const page = graph.getPages().find((node) => node.type === 'CANVAS') ?? graph.addPage('DesignDOM')

  page.name = options.pageName ?? 'DesignDOM'

  for (const child of resolved.children) {
    createDesignNode(graph, page.id, child, 'none')
  }

  fitPageToChildren(page, graph)
  return graph
}

export type { DesignDocumentToSceneGraphOptions as ToSceneGraphOptions }
