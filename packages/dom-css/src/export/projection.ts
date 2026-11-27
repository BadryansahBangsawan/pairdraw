import { isEqual } from 'es-toolkit/predicate'
import { fromUint8Array } from 'js-base64'

import type { ColorProfile, SceneGraph, SceneNode, Stroke } from '@pairdraw/scene-graph'
import { BLACK } from '@pairdraw/scene-graph/constants'
import { readIcon } from '@pairdraw/scene-graph/icons'
import { imageMimeType } from '@pairdraw/scene-graph/images'
import { layoutSizingInParent } from '@pairdraw/scene-graph/layout'
import { isShaderPresetPaint, shaderOfPaint } from '@pairdraw/scene-graph/shaders'
import { resolveNodeTextDirection } from '@pairdraw/scene-graph/text/direction'

import { DesignTokens, type CSSModes } from '../tokens/references'
import type { DesignDocument, DesignElement, DesignNode, DesignStyleDeclaration } from '../types'
import {
  cssColor,
  effectsToCSS,
  fillToCSS,
  gradientFillsToCSS,
  letterSpacingRoomCSS,
  letterSpacingToCSS,
  lineHeightToCSS,
  strokeColorToCSS,
  textEffectsToCSS
} from './css'
import { addGridContainer, addGridPlacement } from './grid'
import { addPositioning, constraintSizes, placement } from './position'
import { textCaseToCSS, textElementContent, uniformLetterSpacing } from './text'

const DOM_CSS_PLUGIN_ID = 'pairdraw-dom-css'
const IMAGE_SOURCE_URL_KEY = 'image-source-url'

/**
 * Draws a vector-shaped layer as an inline `<svg>` element sized to the layer, from the
 * engine's own SVG export. dom-css cannot depend on that engine, so it comes in as an option.
 */
export type VectorElementRenderer = (graph: SceneGraph, node: SceneNode) => DesignElement | null

export interface SceneGraphToDesignOptions {
  rootId?: string
  /** Write each layer's ID as `data-pairdraw-node-id`. Default true. */
  includeSourceIds?: boolean
  /** Write each layer's own name as `data-name`, as the Tailwind JSX export does. Default false. */
  includeLayerNames?: boolean
  /** Write variable-bound values as `var(--name)` where CSS resolves them as drawn. Default true. */
  tokens?: boolean
  /** Vector, boolean, star, polygon, and icon layers as inline SVG; without it they project as boxes. */
  vectorElement?: VectorElementRenderer
  /** Hidden layers to project as shown, such as the tab panels a component reveals itself. */
  shown?: ReadonlySet<string>
}

/** Layers whose shape only paths describe, which CSS boxes cannot draw. */
const VECTOR_SHAPES = new Set<SceneNode['type']>(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON'])

/** What a vector's own SVG draws, so the placement wrapper leaves it out; a backdrop stays on the wrapper. */
const VECTOR_WRAPPER_PAINT = /^(background|border|box-shadow|outline|filter)/

/** Every CSS property that paints a layer, wherever its paint is written. */
export const PAINT_PROPERTY =
  /^(background|backdrop-filter|border|box-shadow|outline|filter|color|fill|stroke|text-shadow)/

/** Whether a projected style paints; a radius or a placement property on its own does not. */
export function paintsSomething(style: DesignStyleDeclaration): boolean {
  return Object.keys(style).some(
    (property) => PAINT_PROPERTY.test(property) && !property.endsWith('radius')
  )
}

/**
 * Whether a projected layer paints or writes text. A frame with no paint and no children projects
 * to a bare element with only its size, so a selection of such layers draws nothing.
 */
export function designNodeDraws(node: DesignNode): boolean {
  if (node.type === 'text') return node.text.trim().length > 0
  if (node.shader?.frame) return true
  if (node.tagName === 'svg' || node.tagName === 'img' || node.tagName === 'canvas') return true
  return (
    paintsSomething({ ...node.computedStyle, ...node.inlineStyle }) ||
    node.children.some(designNodeDraws)
  )
}

/** A field's CSS: its token reference where one is faithful, otherwise the literal value. */
type FieldCSS = (field: string, literal: string) => string

const px = (value: number) => `${value}px`

function nodeChildren(graph: SceneGraph, node: SceneNode): SceneNode[] {
  return node.childIds
    .map((id) => graph.getNode(id))
    .filter((child): child is SceneNode => child !== undefined)
}

function justifyContentToCSS(value: SceneNode['primaryAxisAlign']): string | undefined {
  if (value === 'CENTER') return 'center'
  if (value === 'MAX') return 'flex-end'
  if (value === 'SPACE_BETWEEN') return 'space-between'
  if (value === 'SPACE_AROUND') return 'space-around'
  return undefined
}

/**
 * Cross-axis alignment of a container's children, or of one child. Auto layout starts children
 * at the start while flexbox stretches them, so start is written out: a child that hugs its
 * content keeps its own size.
 */
function alignToCSS(
  value: SceneNode['counterAxisAlign'] | SceneNode['layoutAlignSelf']
): string | undefined {
  if (value === 'MIN') return 'flex-start'
  if (value === 'CENTER') return 'center'
  if (value === 'MAX') return 'flex-end'
  if (value === 'STRETCH') return 'stretch'
  if (value === 'BASELINE') return 'baseline'
  return undefined
}

/** Whether a layer sizes itself to its content along an axis, so CSS should too. */
function hugs(node: SceneNode, axis: 'width' | 'height'): boolean {
  if (node.type === 'TEXT')
    return (
      node.textAutoResize === 'WIDTH_AND_HEIGHT' ||
      (axis === 'height' && node.textAutoResize === 'HEIGHT')
    )
  if (node.layoutMode !== 'HORIZONTAL' && node.layoutMode !== 'VERTICAL') return false
  const primary = (node.layoutMode === 'HORIZONTAL') === (axis === 'width')
  return (primary ? node.primaryAxisSizing : node.counterAxisSizing) === 'HUG'
}

/**
 * A layer's size: fixed on the axes the design fixes, and left to the content where the layer
 * hugs it (an auto layout frame set to Hug, or auto-sizing text), so the page grows with it.
 */
function addSize(
  style: DesignStyleDeclaration,
  node: SceneNode,
  parent: SceneNode | undefined,
  css: FieldCSS
): void {
  const placed = placement(node, parent)
  const sized = (axis: 'width' | 'height') =>
    node[axis] > 0 &&
    !hugs(node, axis) &&
    !stretches(node, parent, axis) &&
    !(placed && constraintSizes(node, placed.parent, axis))
  if (sized('width')) style.width = css('width', px(node.width))
  if (sized('height')) style.height = css('height', px(node.height))
}

/**
 * Whether a layer fills an axis by stretching, which a fixed CSS size would prevent: across a
 * flex parent, or either axis of a grid cell. Along a flex parent, fill is `flex-grow`, and the
 * size stays as its basis.
 */
function stretches(
  node: SceneNode,
  parent: SceneNode | undefined,
  axis: 'width' | 'height'
): boolean {
  const sizing = layoutSizingInParent(parent, node, axis === 'width' ? 'HORIZONTAL' : 'VERTICAL')
  if (sizing !== 'FILL' || !parent) return false
  if (parent.layoutMode === 'GRID') return true
  const mainAxis = parent.layoutMode === 'HORIZONTAL' ? 'width' : 'height'
  return axis !== mainAxis
}

function addSizeConstraints(style: DesignStyleDeclaration, node: SceneNode, css: FieldCSS): void {
  if (node.minWidth !== null) style['min-width'] = css('minWidth', px(node.minWidth))
  if (node.maxWidth !== null) style['max-width'] = css('maxWidth', px(node.maxWidth))
  if (node.minHeight !== null) style['min-height'] = css('minHeight', px(node.minHeight))
  if (node.maxHeight !== null) style['max-height'] = css('maxHeight', px(node.maxHeight))
}

function addCornerRadii(style: DesignStyleDeclaration, node: SceneNode, css: FieldCSS): void {
  if (node.type === 'ELLIPSE') {
    style['border-radius'] = '50%'
    return
  }
  if (node.independentCorners) {
    const corners = [
      ['border-top-left-radius', 'topLeftRadius', node.topLeftRadius],
      ['border-top-right-radius', 'topRightRadius', node.topRightRadius],
      ['border-bottom-right-radius', 'bottomRightRadius', node.bottomRightRadius],
      ['border-bottom-left-radius', 'bottomLeftRadius', node.bottomLeftRadius]
    ] as const
    for (const [property, field, radius] of corners)
      if (radius > 0) style[property] = css(field, px(radius))
    return
  }

  if (node.cornerRadius > 0) style['border-radius'] = css('cornerRadius', px(node.cornerRadius))
}

function addStroke(
  style: DesignStyleDeclaration,
  node: SceneNode,
  css: FieldCSS,
  profile: ColorProfile
): void {
  const stroke = node.strokes.find((item) => item.visible)
  const literalColor = strokeColorToCSS(stroke, profile)
  if (!literalColor || !stroke) return
  const color = css('strokes/0/color', literalColor)
  const borderStyle = node.dashPattern.length > 0 ? 'dashed' : 'solid'
  if (!node.independentStrokeWeights) {
    style.border = `${css('strokeWeight', px(stroke.weight))} solid ${color}`
    if (borderStyle !== 'solid') style['border-style'] = borderStyle
    return
  }

  style['border-style'] = borderStyle
  style['border-color'] = color
  style['border-top-width'] = css('borderTopWeight', px(node.borderTopWeight))
  style['border-right-width'] = css('borderRightWeight', px(node.borderRightWeight))
  style['border-bottom-width'] = css('borderBottomWeight', px(node.borderBottomWeight))
  style['border-left-width'] = css('borderLeftWeight', px(node.borderLeftWeight))
}

/**
 * CSS gives an element one border, so the visible strokes after the first become rings in
 * `box-shadow`, in layer order. An outside ring grows from the border's outer edge, an inside one
 * from its inner edge, and a centred stroke gets a ring on each side of the border. Rings cannot
 * dash or take per-side weights, and outer and inner rings paint in separate CSS layers, so a
 * stroke order that alternates them is approximated.
 */
function extraStrokeShadows(strokes: Stroke[], first: Stroke, profile: ColorProfile): string[] {
  const outer: string[] = []
  const inner: string[] = []
  let outside = 0
  let inside = first.weight
  for (const stroke of strokes) {
    if (!stroke.visible) continue
    const color = strokeColorToCSS(stroke, profile)
    if (!color) continue
    if (stroke.align !== 'OUTSIDE') {
      inside += stroke.align === 'CENTER' ? stroke.weight / 2 : stroke.weight
      inner.push(`inset 0 0 0 ${px(inside)} ${color}`)
    }
    if (stroke.align !== 'INSIDE') {
      outside += stroke.align === 'CENTER' ? stroke.weight / 2 : stroke.weight
      outer.push(`0 0 0 ${px(outside)} ${color}`)
    }
  }
  // The first ring listed paints on top, so each group stays nearest first.
  return [...outer, ...inner]
}

const PADDING_FIELDS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const

/** Sides compare by their CSS, so a token and a literal of the same size stay separate. */
function addPadding(style: DesignStyleDeclaration, node: SceneNode, css: FieldCSS): void {
  const [top, right, bottom, left] = PADDING_FIELDS.map((field) => css(field, px(node[field])))
  const zero = px(0)
  if ([top, right, bottom, left].every((value) => value === zero)) return

  if (top === right && right === bottom && bottom === left) {
    style.padding = top
    return
  }

  if (top === bottom && right === left) {
    if (top !== zero) style['padding-block'] = top
    if (right !== zero) style['padding-inline'] = right
    return
  }

  if (top !== zero) style['padding-top'] = top
  if (right !== zero) style['padding-right'] = right
  if (bottom !== zero) style['padding-bottom'] = bottom
  if (left !== zero) style['padding-left'] = left
}

function addFlexGap(style: DesignStyleDeclaration, node: SceneNode, css: FieldCSS): void {
  if (node.itemSpacing <= 0 && node.counterAxisSpacing <= 0) return
  const item = css('itemSpacing', px(node.itemSpacing))
  if (node.counterAxisSpacing <= 0) {
    style.gap = item
    return
  }

  const counter = css('counterAxisSpacing', px(node.counterAxisSpacing))
  if (node.layoutMode === 'HORIZONTAL') {
    if (node.itemSpacing > 0) style['column-gap'] = item
    style['row-gap'] = counter
    return
  }

  if (node.itemSpacing > 0) style['row-gap'] = item
  style['column-gap'] = counter
}

/** Image bytes as a data URL of the type they are encoded in. */
function imageDataURL(bytes: Uint8Array): string {
  return `data:${imageMimeType(bytes)};base64,${fromUint8Array(bytes)}`
}

/**
 * The shader a layer's fill draws, which the projection keeps as the shader rather than the
 * image of its still frame: the shader of its first fill, as the projection reads one fill.
 */
function layerShader(graph: SceneGraph, node: SceneNode): DesignElement['shader'] {
  const fill = node.fills.at(0)
  const shader = fill?.visible ? shaderOfPaint(node, fill) : null
  if (!shader || !isShaderPresetPaint(shader)) return undefined
  const bytes = graph.images.get(shader.image)
  const frame = bytes ? imageDataURL(bytes) : undefined
  return { preset: shader.preset, frame }
}

const POSITIONED = new Set(['relative', 'absolute', 'fixed', 'sticky'])

/** Whether a `position` value makes an element the containing block of what it places. */
export function isPositioned(position: unknown): boolean {
  return typeof position === 'string' && POSITIONED.has(position)
}

/** A shader layer contains what plays behind its content, beneath everything it holds. */
function addShaderLayerStyle(style: DesignStyleDeclaration): void {
  if (!isPositioned(style.position)) style.position = 'relative'
  style.isolation = 'isolate'
}

function addImageStyle(style: DesignStyleDeclaration, node: SceneNode): void {
  const fill = node.fills.at(0)
  if (fill?.type !== 'IMAGE' || !fill.visible || shaderOfPaint(node, fill)) return
  if (node.width > 0 && node.height > 0) style['aspect-ratio'] = `${node.width} / ${node.height}`
  if (fill.imageScaleMode === 'FIT') style['object-fit'] = 'contain'
  if (fill.imageScaleMode === 'FILL') style['object-fit'] = 'cover'
}

/** Styles a node takes from its parent's layout, and its own rotation. */
function addLayoutChild(
  style: DesignStyleDeclaration,
  node: SceneNode,
  parent: SceneNode | undefined
): void {
  if (parent?.layoutMode === 'GRID') addGridPlacement(style, node)
  else if (parent && parent.layoutMode !== 'NONE' && node.layoutGrow > 0) style['flex-grow'] = '1'
  if (node.rotation !== 0) style.transform = `rotate(${node.rotation}deg)`
}

const SIZE_PROPERTIES = ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height']

/**
 * A layer's size includes its padding and stroke, as auto layout measures it. CSS sizes the
 * content box unless told otherwise, so a sized box with padding or a border says so.
 */
function addBoxSizing(style: DesignStyleDeclaration): void {
  const sized = SIZE_PROPERTIES.some((property) => Object.hasOwn(style, property))
  const boxed = Object.keys(style).some(
    (property) =>
      property.startsWith('padding') ||
      (property.startsWith('border') && !property.endsWith('radius'))
  )
  if (sized && boxed) style['box-sizing'] = 'border-box'
}

/**
 * The CSS keyword for a blend mode, where one paints the same mode. Linear burn would need
 * `plus-darker`, which Chrome, Edge, and Firefox do not implement, so it gains no keyword and
 * exports flat. A normal layer or an unscoped pass-through needs none either.
 */
const CSS_BLEND_MODES: Partial<Record<SceneNode['blendMode'], string>> = {
  DARKEN: 'darken',
  MULTIPLY: 'multiply',
  COLOR_BURN: 'color-burn',
  LIGHTEN: 'lighten',
  SCREEN: 'screen',
  LINEAR_DODGE: 'plus-lighter',
  COLOR_DODGE: 'color-dodge',
  OVERLAY: 'overlay',
  SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity'
}

function styleFromSceneNode(
  node: SceneNode,
  parent: SceneNode | undefined,
  css: FieldCSS,
  profile: ColorProfile
): DesignStyleDeclaration {
  const style: DesignStyleDeclaration = {}
  addSize(style, node, parent, css)
  addPositioning(style, node, parent)
  addSizeConstraints(style, node, css)
  const fill = fillToCSS(node.fills.at(0), profile)
  if (fill) style['background-color'] = css('fills/0/color', fill)
  const gradients = gradientFillsToCSS(node.fills, node.width, node.height, profile)
  if (gradients) style['background-image'] = gradients
  addImageStyle(style, node)
  addStroke(style, node, css, profile)
  Object.assign(style, effectsToCSS(node.effects, profile))
  const visibleStrokes = node.strokes.filter((stroke) => stroke.visible)
  if (visibleStrokes.length > 1) {
    const rings = extraStrokeShadows(visibleStrokes.slice(1), visibleStrokes[0], profile)
    if (rings.length > 0) {
      style['box-shadow'] = [rings.join(', '), style['box-shadow']]
        .filter((shadow): shadow is string => Boolean(shadow))
        .join(', ')
    }
  }
  if (node.opacity < 1) style.opacity = css('opacity', String(node.opacity))
  const blend = CSS_BLEND_MODES[node.blendMode]
  if (blend) style['mix-blend-mode'] = blend
  addCornerRadii(style, node, css)
  if (node.clipsContent) style.overflow = 'hidden'
  const alignSelf = alignToCSS(node.layoutAlignSelf)
  if (alignSelf) style['align-self'] = alignSelf

  addLayoutChild(style, node, parent)
  if (node.layoutDirection === 'RTL') style.direction = 'rtl'

  if (node.layoutMode === 'GRID') {
    addGridContainer(style, node, css)
    addPadding(style, node, css)
  } else if (node.layoutMode !== 'NONE') {
    style.display = 'flex'
    // Row is the flexbox default.
    if (node.layoutMode === 'VERTICAL') style['flex-direction'] = 'column'
    const justifyContent = justifyContentToCSS(node.primaryAxisAlign)
    const alignItems = alignToCSS(node.counterAxisAlign)
    if (justifyContent) style['justify-content'] = justifyContent
    if (alignItems) style['align-items'] = alignItems
    if (node.layoutWrap === 'WRAP') style['flex-wrap'] = 'wrap'
    addFlexGap(style, node, css)
    addPadding(style, node, css)
  }

  addBoxSizing(style)
  return style
}

function styleFromTextNode(
  node: SceneNode,
  parent: SceneNode | undefined,
  css: FieldCSS,
  profile: ColorProfile
): DesignStyleDeclaration {
  const style: DesignStyleDeclaration = {}
  addSize(style, node, parent, css)
  addPositioning(style, node, parent)
  addLayoutChild(style, node, parent)
  if (resolveNodeTextDirection(node) === 'RTL') style.direction = 'rtl'
  const color = fillToCSS(node.fills.at(0), profile)
  style.color = color ? css('fills/0/color', color) : cssColor(BLACK, profile)
  style['font-family'] = node.fontFamily
  style['font-size'] = css('fontSize', px(node.fontSize))
  style['font-weight'] = String(node.fontWeight)
  if (node.italic) style['font-style'] = 'italic'
  if (node.lineHeight !== null) {
    style['line-height'] = css('lineHeight', lineHeightToCSS(node.lineHeight))
  }
  const spacing = css('letterSpacing', letterSpacingToCSS(node.letterSpacing))
  if (node.letterSpacing.value !== 0) style['letter-spacing'] = spacing
  // The spacing after a line's last letter needs room only when one spacing ends every line.
  const ending = uniformLetterSpacing(node)
  if (ending && ending.value !== 0) {
    const written = isEqual(ending, node.letterSpacing) ? spacing : letterSpacingToCSS(ending)
    Object.assign(style, letterSpacingRoomCSS(ending, written, style.width))
  }
  if (node.textAlignHorizontal !== 'LEFT')
    style['text-align'] = node.textAlignHorizontal.toLowerCase()
  if (node.opacity < 1) style.opacity = css('opacity', String(node.opacity))
  Object.assign(style, textEffectsToCSS(node.effects, profile))
  if (node.textDecoration !== 'NONE') {
    style['text-decoration-line'] =
      node.textDecoration === 'UNDERLINE' ? 'underline' : 'line-through'
  }
  const textTransform = textCaseToCSS(node.textCase)
  if (textTransform) style['text-transform'] = textTransform
  style['white-space'] = node.maxLines === 1 ? 'nowrap' : 'pre-wrap'
  return style
}

function imageSourceURL(node: SceneNode): string | undefined {
  return node.pluginData.find(
    (entry) => entry.pluginId === DOM_CSS_PLUGIN_ID && entry.key === IMAGE_SOURCE_URL_KEY
  )?.value
}

/** A layer's name, unless it only repeats the layer's type. */
export function ownLayerName(node: SceneNode): string | undefined {
  return node.name && node.name !== node.type ? node.name : undefined
}

function attrsForNode(
  graph: SceneGraph,
  node: SceneNode,
  {
    includeSourceIds,
    includeLayerNames
  }: Pick<ProjectionContext, 'includeSourceIds' | 'includeLayerNames'>
): Record<string, string> {
  const attrs: Record<string, string> = {}
  const name = includeLayerNames ? ownLayerName(node) : undefined
  if (name) attrs['data-name'] = name
  if (includeSourceIds) attrs['data-pairdraw-node-id'] = node.id
  const sourceURL = imageSourceURL(node)
  if (sourceURL) attrs.src = sourceURL
  const fill = node.fills.at(0)
  if (fill?.type !== 'IMAGE' || !fill.imageHash || shaderOfPaint(node, fill)) return attrs
  const bytes = graph.images.get(fill.imageHash)
  if (!bytes) return attrs
  return { ...attrs, src: imageDataURL(bytes) }
}

function tagNameForNode(node: SceneNode): string {
  if (node.type === 'SECTION') return 'section'
  const fill = node.fills.at(0)
  const image = fill?.type === 'IMAGE' && !shaderOfPaint(node, fill)
  if ((image || imageSourceURL(node)) && node.childIds.length === 0) return 'img'
  return 'div'
}

interface ProjectionContext {
  graph: SceneGraph
  includeSourceIds: boolean
  includeLayerNames: boolean
  tokens: DesignTokens | undefined
  vectorElement: VectorElementRenderer | undefined
  shown: ReadonlySet<string> | undefined
}

/**
 * A vector layer as the renderer's `<svg>`, placed where the layer's box would be: its
 * position, size, opacity, and transform stay, and its paint is the SVG's, not the box's.
 */
function vectorDesignNode(
  context: ProjectionContext,
  node: SceneNode,
  attrs: Record<string, string>,
  style: DesignStyleDeclaration
): DesignElement | null {
  const drawn = context.vectorElement?.(context.graph, node)
  if (!drawn) return null
  const placement = Object.fromEntries(
    Object.entries(style).filter(([property]) => !VECTOR_WRAPPER_PAINT.test(property))
  )
  return {
    ...drawn,
    attrs: { ...drawn.attrs, ...attrs },
    inlineStyle: { ...drawn.inlineStyle, ...placement },
    sourceSceneNodeId: node.id,
    sourceSceneNode: node
  }
}

/** The outline a vector mask clips siblings to, in the sibling's own box; null where CSS cannot. */
function vectorMaskClip(mask: SceneNode, sibling: SceneNode): string | null {
  // The renderer clips to the rotated outline; a polygon built from the unrotated box would
  // cut a different region, so a rotated mask stays unclipped as the export documents.
  if (mask.maskType !== 'VECTOR' || mask.childIds.length > 0 || mask.rotation !== 0) return null
  const left = mask.x - sibling.x
  const top = mask.y - sibling.y
  if (mask.type === 'RECTANGLE') {
    const right = left + mask.width
    const bottom = top + mask.height
    return `polygon(${px(left)} ${px(top)}, ${px(right)} ${px(top)}, ${px(right)} ${px(bottom)}, ${px(left)} ${px(bottom)})`
  }
  if (mask.type === 'ELLIPSE') {
    const rx = mask.width / 2
    const ry = mask.height / 2
    return `ellipse(${px(rx)} ${px(ry)} at ${px(left + rx)} ${px(top + ry)})`
  }
  return null
}

/**
 * Projects a parent's children as the canvas draws them: a mask layer is never a layer of its
 * own, and one vector mask clips the siblings after it. Alpha and luminance masks have no
 * faithful CSS form over several elements, and two masks combine, so those stay unclipped.
 */
function projectChildren(
  context: ProjectionContext,
  parent: SceneNode,
  modes: CSSModes,
  root: boolean
): DesignNode[] {
  const projected: DesignNode[] = []
  let masks: SceneNode[] = []
  let afterMask = false
  for (const child of nodeChildren(context.graph, parent)) {
    if (child.visible && child.isMask) {
      masks = afterMask ? [...masks, child] : [child]
      afterMask = true
      continue
    }
    afterMask = false
    const node = sceneNodeToDesignNode(context, child, modes, root)
    if (!node) continue
    const mask = masks.length === 1 ? masks[0] : null
    if (mask && node.type === 'element') {
      const clip = vectorMaskClip(mask, child)
      if (clip) node.inlineStyle = { ...node.inlineStyle, 'clip-path': clip }
    }
    projected.push(node)
  }
  return projected
}

function sceneNodeToDesignNode(
  context: ProjectionContext,
  node: SceneNode,
  inherited: CSSModes,
  root: boolean
): DesignNode | null {
  if ((!node.visible && !context.shown?.has(node.id)) || node.internalOnly) return null
  const { graph, tokens } = context
  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  const entered = tokens?.enter(node, inherited, root)
  const modes = entered?.modes ?? inherited
  const attrs = { ...attrsForNode(graph, node, context), ...entered?.attrs }
  const css: FieldCSS = (field, literal) => tokens?.reference(node, field, modes) ?? literal

  if (node.type === 'TEXT') {
    const content = textElementContent(
      node,
      styleFromTextNode(node, parent, css, graph.documentColorSpace),
      graph.documentColorSpace
    )
    return {
      type: 'element',
      tagName: content.tagName,
      attrs,
      inlineStyle: content.style,
      sourceSceneNodeId: node.id,
      sourceSceneNode: node,
      children: content.children
    }
  }

  // An icon is one drawing, however many paths it has.
  if (VECTOR_SHAPES.has(node.type) || readIcon(node)) {
    const vector = vectorDesignNode(
      context,
      node,
      attrs,
      styleFromSceneNode(node, parent, css, graph.documentColorSpace)
    )
    if (vector) return vector
  }

  const children = projectChildren(context, node, modes, false)

  if (node.type === 'CANVAS') {
    return {
      type: 'element',
      tagName: 'main',
      attrs,
      sourceSceneNodeId: node.id,
      sourceSceneNode: node,
      children
    }
  }

  const style = styleFromSceneNode(node, parent, css, graph.documentColorSpace)
  const shader = layerShader(graph, node)
  if (shader) addShaderLayerStyle(style)
  return {
    type: 'element',
    tagName: tagNameForNode(node),
    attrs,
    inlineStyle: style,
    sourceSceneNodeId: node.id,
    sourceSceneNode: node,
    children,
    shader
  }
}

function projectionContext(
  graph: SceneGraph,
  {
    includeSourceIds = true,
    includeLayerNames = false,
    tokens = true,
    vectorElement,
    shown
  }: SceneGraphToDesignOptions
): ProjectionContext {
  return {
    graph,
    includeSourceIds,
    includeLayerNames,
    tokens: tokens ? new DesignTokens(graph) : undefined,
    vectorElement,
    shown
  }
}

export function sceneGraphToDesignDocument(
  graph: SceneGraph,
  options: SceneGraphToDesignOptions = {}
): DesignDocument {
  const root = graph.getNode(options.rootId ?? graph.rootId)
  const context = projectionContext(graph, options)
  const modes = context.tokens?.defaultModes() ?? new Map<string, string>()
  const children = root ? projectChildren(context, root, modes, true) : []

  return { type: 'document', sourceGraph: graph, tokens: context.tokens, children }
}

/** Project one node, including its own box, instead of the children of a root. */
export function sceneNodeToDesignDocument(
  graph: SceneGraph,
  nodeId: string,
  options: Omit<SceneGraphToDesignOptions, 'rootId'> = {}
): DesignDocument {
  return sceneNodesToDesignDocument(graph, [nodeId], options)
}

/**
 * Project several nodes, including each own box, through one token collector: the document then
 * declares the tokens every root references, not only those of the last one.
 */
export function sceneNodesToDesignDocument(
  graph: SceneGraph,
  nodeIds: readonly string[],
  options: Omit<SceneGraphToDesignOptions, 'rootId'> = {}
): DesignDocument {
  const context = projectionContext(graph, options)
  const modes = context.tokens?.defaultModes() ?? new Map<string, string>()
  const children: DesignNode[] = []
  for (const nodeId of nodeIds) {
    const node = graph.getNode(nodeId)
    const projected = node ? sceneNodeToDesignNode(context, node, modes, true) : null
    if (projected) children.push(projected)
  }
  return { type: 'document', sourceGraph: graph, tokens: context.tokens, children }
}
