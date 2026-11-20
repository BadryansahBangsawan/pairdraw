import type {
  BlendMode,
  Fill,
  GradientTransform,
  LayoutAlign,
  LayoutCounterAlign,
  SceneGraph,
  SceneNode,
  ShadowEffect,
  Stroke,
  Variable,
  VariableCollection,
  VariableValue
} from '@pairdraw/scene-graph'
import { SceneGraph as SceneGraphValue } from '@pairdraw/scene-graph'
import { colorToHex, colorToHex8 } from '@pairdraw/scene-graph/color'
import { getNodeLocalMatrix } from '@pairdraw/scene-graph/coordinate'
import { stickySublayers } from '@pairdraw/scene-graph/generated'
import { applyGradientTransform, invertGradientTransform } from '@pairdraw/scene-graph/gradient'
import { layoutSizing } from '@pairdraw/scene-graph/layout'
import type { Color, Vector } from '@pairdraw/scene-graph/primitives'

import { networkToSVGPath } from './geometry'
import { PEN_PLUGIN_DATA_NAMESPACE } from './plugin-data'
import type {
  PenDocument,
  PenEffect,
  PenNode,
  PenNumber,
  PenPaint,
  PenPaints,
  PenSides,
  PenVariable,
  PenVariableScalar
} from './schema'
import { writtenNodeIds } from './written-nodes'
const PEN_VERSION = '2.21'
const PEN_PLUGIN_FIELDS: Readonly<Partial<Record<string, string>>> = {
  'pen/type': 'type',
  'pen/ref': 'ref',
  'pen/generated': 'generated',
  'pen/context': 'context',
  'pen/metadata': 'metadata',
  'pen/placeholder': 'placeholder',
  'pen/slot': 'slot',
  'pen/model': 'model',
  'pen/scriptUri': 'scriptUri',
  'pen/inputs': 'inputs',
  'pen/url': 'url',
  'pen/deviceId': 'deviceId',
  'pen/zoom': 'zoom',
  'pen/scrollX': 'scrollX',
  'pen/scrollY': 'scrollY'
}

type PenWriteState = {
  graph: SceneGraph
  variables: ReadonlyMap<string, Variable>
  collections: ReadonlyMap<string, VariableCollection>
  /** Nodes the document will contain, so an instance refs only a component that is written. */
  writtenIds: ReadonlySet<string>
}
/** Snaps matrix values that are within floating-point noise of an integer. */
function snapCoordinate(value: number): number {
  return Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value
}
/** A non-finite number has no JSON form, so it is written as 0 to keep the file loadable. */
function rounded(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(3)) : 0
}
function colorValue(value: Color): string {
  return value.a === 1 ? colorToHex(value) : colorToHex8(value)
}
function variableReference(state: PenWriteState, id: string | undefined): string | undefined {
  const variable = id === undefined ? undefined : state.variables.get(id)
  return variable === undefined ? undefined : `$${variable.name}`
}
function variableOr<T>(state: PenWriteState, node: SceneNode, field: string, value: T): T | string {
  return variableReference(state, node.boundVariables[field]) ?? value
}

/** Matches the pen corner convention of placing x/y after undoing the node's rotation or flip. */
function penCoordinates(node: SceneNode): Vector {
  if (node.rotation === 0 && !node.flipX && !node.flipY) return { x: node.x, y: node.y }
  const matrix = getNodeLocalMatrix({ ...node, x: 0, y: 0 })
  return { x: snapCoordinate(node.x + matrix[2]), y: snapCoordinate(node.y + matrix[5]) }
}

/** pen.dev's names for the scene graph's blend modes, inverse of the reader's `BLEND_MODES`. */
const BLEND_MODE_NAMES: Partial<Record<BlendMode, string>> = {
  NORMAL: 'normal',
  DARKEN: 'darken',
  MULTIPLY: 'multiply',
  COLOR_BURN: 'colorBurn',
  LIGHTEN: 'light',
  SCREEN: 'screen',
  COLOR_DODGE: 'colorDodge',
  OVERLAY: 'overlay',
  SOFT_LIGHT: 'softLight',
  HARD_LIGHT: 'hardLight',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity'
}
function paintBase(fill: Fill): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (!fill.visible) result.enabled = false
  if (fill.opacity !== 1) result.opacity = rounded(fill.opacity)
  const blendMode = (fill.blendMode && BLEND_MODE_NAMES[fill.blendMode]) ?? undefined
  if (blendMode && blendMode !== 'normal') result.blendMode = blendMode
  return result
}

function gradientName(type: Fill['type']): 'linear' | 'radial' | 'angular' | 'diamond' {
  if (type === 'GRADIENT_RADIAL') return 'radial'
  if (type === 'GRADIENT_ANGULAR') return 'angular'
  if (type === 'GRADIENT_DIAMOND') return 'diamond'
  return 'linear'
}

function gradientPoint(inverse: GradientTransform | undefined, point: Vector): Vector {
  return inverse === undefined ? point : applyGradientTransform(inverse, point)
}
function gradientAxis(
  fill: Fill,
  inverse: GradientTransform | undefined,
  center: Vector,
  first: Vector,
  second: Vector
): { rotation: number; width: number; height: number } {
  const firstLength = 2 * Math.hypot(first.x - center.x, first.y - center.y)
  const secondLength = 2 * Math.hypot(second.x - center.x, second.y - center.y)
  const rotationOf = (axis: Vector, offset: number): number =>
    offset - (Math.atan2(axis.x, -axis.y) * 180) / Math.PI
  if (fill.type === 'GRADIENT_LINEAR') {
    const axis =
      inverse === undefined
        ? { x: 0, y: -1 }
        : {
            x: applyGradientTransform(inverse, { x: 1, y: 0.5 }).x - center.x,
            y: applyGradientTransform(inverse, { x: 1, y: 0.5 }).y - center.y
          }
    return { rotation: rotationOf(axis, 0), width: secondLength, height: firstLength }
  }
  if (fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_DIAMOND') {
    const axis = { x: second.x - center.x, y: second.y - center.y }
    return { rotation: rotationOf(axis, 180), width: firstLength, height: secondLength }
  }
  const axis = { x: first.x - center.x, y: first.y - center.y }
  return { rotation: rotationOf(axis, 0), width: secondLength, height: firstLength }
}
function gradientPaint(fill: Fill): PenPaint {
  const transform = fill.gradientTransform
  const inverse = transform === undefined ? undefined : invertGradientTransform(transform)
  const center = gradientPoint(inverse, { x: 0.5, y: 0.5 })
  const first = gradientPoint(inverse, { x: 1, y: 0.5 })
  const second = gradientPoint(inverse, { x: 0.5, y: 1 })
  const axis = gradientAxis(fill, inverse, center, first, second)
  return {
    type: 'gradient',
    gradientType: gradientName(fill.type),
    ...paintBase(fill),
    center: { x: rounded(center.x), y: rounded(center.y) },
    size: { width: rounded(axis.width), height: rounded(axis.height) },
    rotation: rounded(axis.rotation),
    colors: (fill.gradientStops ?? []).map((stop) => ({
      color: colorValue(stop.color),
      position: rounded(stop.position)
    }))
  }
}

function imagePaint(fill: Fill): PenPaint {
  return { type: 'image', ...paintBase(fill), url: fill.imageHash }
}

function penPaint(
  state: PenWriteState,
  node: SceneNode,
  field: 'fills' | 'strokes',
  fill: Fill,
  index: number
): PenPaint {
  if (fill.type === 'SOLID') {
    const binding = variableReference(state, node.boundVariables[`${field}/${index}/color`])
    return { type: 'color', color: binding ?? colorValue(fill.color), ...paintBase(fill) }
  }
  if (fill.type.startsWith('GRADIENT_')) return gradientPaint(fill)
  if (fill.type === 'IMAGE') return imagePaint(fill)
  return { type: fill.type.toLowerCase(), ...paintBase(fill) }
}

function paintsOf(
  state: PenWriteState,
  node: SceneNode,
  field: 'fills' | 'strokes',
  paints: readonly Fill[]
): PenPaints | undefined {
  if (paints.length === 0) return undefined
  const result = paints.map((paint, index) => penPaint(state, node, field, paint, index))
  return result.length === 1 ? result[0] : result
}

function strokesOf(
  state: PenWriteState,
  node: SceneNode
): Pick<
  PenNode,
  'stroke' | 'strokeWidth' | 'strokeAlignment' | 'strokeLinecap' | 'strokeLinejoin'
> {
  if (node.strokes.length === 0) return {}
  const paints = paintsOf(state, node, 'strokes', node.strokes)
  if (paints === undefined) return {}
  const first = node.strokes[0]
  const strokeWidth: PenNumber | PenSides = node.independentStrokeWeights
    ? {
        top: variableOr(state, node, 'borderTopWeight', rounded(node.borderTopWeight)),
        right: variableOr(state, node, 'borderRightWeight', rounded(node.borderRightWeight)),
        bottom: variableOr(state, node, 'borderBottomWeight', rounded(node.borderBottomWeight)),
        left: variableOr(state, node, 'borderLeftWeight', rounded(node.borderLeftWeight))
      }
    : variableOr(state, node, 'strokeWeight', rounded(first.weight))
  const caps: Record<NonNullable<Stroke['cap']>, string> = {
    NONE: 'butt',
    ROUND: 'round',
    SQUARE: 'square',
    ARROW_LINES: 'butt',
    ARROW_EQUILATERAL: 'butt',
    TRIANGLE_FILLED: 'butt',
    DIAMOND_FILLED: 'butt',
    CIRCLE_FILLED: 'butt'
  }
  const joins: Record<NonNullable<Stroke['join']>, string> = {
    MITER: 'miter',
    BEVEL: 'bevel',
    ROUND: 'round'
  }
  const linecap = first.cap === undefined ? undefined : caps[first.cap]
  const linejoin = first.join === undefined ? undefined : joins[first.join]
  return {
    stroke: paints,
    strokeWidth,
    strokeAlignment: first.align.toLowerCase(),
    strokeLinecap: linecap === 'butt' ? undefined : linecap,
    strokeLinejoin: linejoin === 'miter' ? undefined : linejoin
  }
}

function effectOf(effect: ShadowEffect): PenEffect {
  if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    return {
      type: effect.type === 'LAYER_BLUR' ? 'blur' : 'background_blur',
      radius: rounded(effect.radius),
      enabled: effect.visible
    }
  }
  return {
    type: 'shadow',
    shadowType: effect.type === 'INNER_SHADOW' ? 'inner' : undefined,
    color: colorValue(effect.color),
    offset: { x: rounded(effect.offset.x), y: rounded(effect.offset.y) },
    blur: rounded(effect.radius),
    spread: rounded(effect.spread),
    enabled: effect.visible
  }
}

function variableType(type: Variable['type']): PenVariable['type'] {
  if (type === 'COLOR') return 'color'
  if (type === 'FLOAT') return 'number'
  if (type === 'BOOLEAN') return 'boolean'
  return 'string'
}

function layoutFields(state: PenWriteState, node: SceneNode): Partial<PenNode> {
  if (node.layoutMode === 'NONE')
    return node.type === 'FRAME' || node.type === 'COMPONENT' ? { layout: 'none' } : {}
  const justify: Partial<Record<LayoutAlign, string>> = {
    CENTER: 'center',
    MAX: 'end',
    SPACE_BETWEEN: 'space_between',
    SPACE_AROUND: 'space_around'
  }
  const align: Partial<Record<LayoutCounterAlign, string>> = {
    CENTER: 'center',
    MAX: 'end',
    STRETCH: 'stretch',
    BASELINE: 'baseline'
  }
  const fields: Partial<PenNode> = {
    layout: node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical'
  }
  const gapBinding = variableReference(state, node.boundVariables['itemSpacing'])
  if (gapBinding !== undefined) fields.gap = gapBinding
  else if (node.itemSpacing !== 0) fields.gap = rounded(node.itemSpacing)
  if (node.primaryAxisAlign !== 'MIN') fields.justifyContent = justify[node.primaryAxisAlign]
  if (node.counterAxisAlign !== 'MIN') fields.alignItems = align[node.counterAxisAlign]
  const padding: [number, number, number, number] = [
    node.paddingTop,
    node.paddingRight,
    node.paddingBottom,
    node.paddingLeft
  ]
  if (padding.some((value) => value !== 0)) fields.padding = padding
  if (node.clipsContent) fields.clip = true
  if (node.strokesIncludedInLayout) fields.layoutIncludeStroke = true
  return fields
}

function sizing(
  state: PenWriteState,
  node: SceneNode,
  axis: 'HORIZONTAL' | 'VERTICAL'
): PenNumber | undefined {
  const mode = layoutSizing(state.graph, node, axis)
  if (mode === 'FILL') return 'fill_container'
  if (mode === 'HUG') return 'fit_content'
  return undefined
}

function penPluginFields(node: SceneNode, result: PenNode): void {
  for (const entry of node.pluginData) {
    if (entry.pluginId !== PEN_PLUGIN_DATA_NAMESPACE) continue
    const field = PEN_PLUGIN_FIELDS[entry.key]
    if (field === undefined) continue
    let value: unknown
    try {
      value = JSON.parse(entry.value)
    } catch {
      console.warn(`Skipping corrupt pen plugin field ${field}`)
      continue
    }
    result[field] = value
  }
}

function nodeType(node: SceneNode): string {
  switch (node.type) {
    case 'COMPONENT':
    case 'COMPONENT_SET':
    case 'FRAME':
    case 'SECTION':
      return 'frame'
    case 'RECTANGLE':
    case 'ROUNDED_RECTANGLE':
      return 'rectangle'
    case 'ELLIPSE':
      return 'ellipse'
    case 'POLYGON':
    case 'STAR':
      return 'polygon'
    case 'GROUP':
    case 'BOOLEAN_OPERATION':
      return 'group'
    case 'TEXT':
      return 'text'
    case 'VECTOR':
      return 'path'
    case 'LINE':
      return 'line'
    case 'STICKY':
      return 'note'
    default:
      return 'frame'
  }
}

/** A line height as the multiple of the font size pen.dev stores; undefined when it has none. */
function lineHeightMultiple(node: SceneNode): number | undefined {
  const lineHeight = node.lineHeight
  if (!lineHeight) return undefined
  if (lineHeight.unit !== 'PIXELS') return rounded(lineHeight.value / 100)
  return node.fontSize > 0 ? rounded(lineHeight.value / node.fontSize) : undefined
}

/** Letter spacing in the pixels pen.dev stores, a percent following the font size. */
function letterSpacingPixels(node: SceneNode): number {
  const spacing = node.letterSpacing
  return spacing.unit === 'PIXELS' ? spacing.value : (spacing.value / 100) * node.fontSize
}

function textFields(state: PenWriteState, node: SceneNode): Partial<PenNode> {
  if (node.type !== 'TEXT') return {}
  const fields: Partial<PenNode> = { content: node.text }
  if (node.fontFamily !== 'Inter')
    fields.fontFamily = variableOr(state, node, 'fontFamily', node.fontFamily)
  if (node.fontSize !== 14)
    fields.fontSize = variableOr(state, node, 'fontSize', rounded(node.fontSize))
  const fontWeight = variableOr(state, node, 'fontWeight', node.fontWeight)
  if (typeof fontWeight === 'string' || node.fontWeight !== 400) fields.fontWeight = fontWeight
  if (node.italic) fields.fontStyle = 'italic'
  const textAlign: Partial<Record<SceneNode['textAlignHorizontal'], string>> = {
    CENTER: 'center',
    RIGHT: 'right',
    JUSTIFIED: 'justify'
  }
  const textAlignVertical: Partial<Record<SceneNode['textAlignVertical'], string>> = {
    CENTER: 'middle',
    BOTTOM: 'bottom'
  }
  if (node.textAlignHorizontal !== 'LEFT') fields.textAlign = textAlign[node.textAlignHorizontal]
  if (node.textAlignVertical !== 'TOP')
    fields.textAlignVertical = textAlignVertical[node.textAlignVertical]
  const lineHeight = lineHeightMultiple(node)
  if (lineHeight !== undefined) fields.lineHeight = lineHeight
  if (node.letterSpacing.value !== 0) fields.letterSpacing = rounded(letterSpacingPixels(node))
  if (node.textAutoResize === 'HEIGHT') fields.textGrowth = 'fixed-width'
  if (node.textAutoResize === 'NONE' || node.textAutoResize === 'TRUNCATE')
    fields.textGrowth = 'fixed-width-height'
  const link = node.styleRuns.find((run) => run.style.hyperlink?.type === 'URL')
  if (link?.style.hyperlink?.type === 'URL') fields.href = link.style.hyperlink.value
  return fields
}

function cornerFields(node: SceneNode): Partial<PenNode> {
  if (node.independentCorners) {
    return {
      cornerRadius: [
        node.topLeftRadius,
        node.topRightRadius,
        node.bottomRightRadius,
        node.bottomLeftRadius
      ]
    }
  }
  if (node.cornerRadius !== 0) return { cornerRadius: rounded(node.cornerRadius) }
  return {}
}

function variableScalar(value: VariableValue | undefined, state: PenWriteState): PenVariableScalar {
  if (value === undefined) return ''
  if (typeof value === 'object' && 'aliasId' in value) {
    const variable = state.variables.get(value.aliasId)
    return variable === undefined ? '' : `$${variable.name}`
  }
  if (typeof value === 'object') return 'r' in value ? colorValue(value) : ''
  return value
}
function penVariable(
  variable: Variable,
  collection: VariableCollection | undefined,
  state: PenWriteState
): PenVariable {
  const modes = collection?.modes ?? []
  if (modes.length <= 1)
    return {
      type: variableType(variable.type),
      value: variableScalar(variable.valuesByMode[modes[0]?.modeId ?? ''], state)
    }
  return {
    type: variableType(variable.type),
    value: modes.map((mode, index) => ({
      value: variableScalar(variable.valuesByMode[mode.modeId], state),
      ...(index === 0 ? {} : { theme: { [collection?.name ?? 'Mode']: mode.name } })
    }))
  }
}

function variablesOf(state: PenWriteState): Record<string, PenVariable> | undefined {
  if (state.graph.variables.size === 0) return undefined
  return Object.fromEntries(
    [...state.graph.variables.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((variable) => [
        variable.name,
        penVariable(variable, state.collections.get(variable.collectionId), state)
      ])
  )
}

function themesOf(state: PenWriteState): PenDocument['themes'] {
  if (state.graph.variableCollections.size === 0) return undefined
  return Object.fromEntries(
    [...state.graph.variableCollections.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((collection) => [collection.name, collection.modes.map((mode) => mode.name)])
  )
}

function basicNodeFields(state: PenWriteState, node: SceneNode, result: PenNode): void {
  if (node.name) result.name = node.name
  const placement = penCoordinates(node)
  if (placement.x !== 0) result.x = rounded(placement.x)
  if (placement.y !== 0) result.y = rounded(placement.y)
  result.width = variableOr(
    state,
    node,
    'width',
    sizing(state, node, 'HORIZONTAL') ?? rounded(node.width)
  )
  result.height = variableOr(
    state,
    node,
    'height',
    sizing(state, node, 'VERTICAL') ?? rounded(node.height)
  )
  if (!node.visible) result.enabled = false
  if (node.opacity !== 1) result.opacity = rounded(node.opacity)
  if (node.rotation !== 0)
    result.rotation = rounded(node.flipX !== node.flipY ? node.rotation : -node.rotation)
  if (node.flipX) result.flipX = true
  if (node.flipY) result.flipY = true
  const fill = paintsOf(state, node, 'fills', node.fills)
  if (fill !== undefined) result.fill = fill
  Object.assign(
    result,
    strokesOf(state, node),
    layoutFields(state, node),
    cornerFields(node),
    textFields(state, node)
  )
}
function semanticNodeFields(state: PenWriteState, node: SceneNode, result: PenNode): boolean {
  if (
    node.type === 'TEXT' &&
    node.textAutoResize === 'WIDTH_AND_HEIGHT' &&
    layoutSizing(state.graph, node, 'HORIZONTAL') === 'HUG'
  )
    result.width = 'fit_content'
  if (node.type === 'STICKY') result.content = stickySublayers(state.graph, node)?.body.text ?? ''
  penPluginFields(node, result)
  // Shader effects have no pen.dev form yet; dropping them keeps the file loadable.
  const effects = node.effects.filter((effect): effect is ShadowEffect => effect.type !== 'SHADER')
  if (effects.length > 0)
    result.effect = effects.length === 1 ? effectOf(effects[0]) : effects.map(effectOf)
  if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') result.reusable = true
  if (node.type === 'INSTANCE' && node.componentId && state.writtenIds.has(node.componentId)) {
    result.type = 'ref'
    result.ref = node.componentId
    return true
  }
  return false
}
function writeNode(state: PenWriteState, node: SceneNode): PenNode {
  const result: PenNode = { id: node.id, type: nodeType(node) }
  basicNodeFields(state, node, result)
  if (semanticNodeFields(state, node, result)) return result
  // Written after the preserved pen fields, so a regenerated path wins over the source text.
  if (node.type === 'VECTOR' && node.vectorNetwork && node.vectorNetwork.segments.length > 0) {
    const geometry = networkToSVGPath(node.vectorNetwork)
    if (geometry) {
      result.geometry = geometry
      // The written box is rounded; the view box names the same box, so the path maps onto it
      // one to one rather than being scaled into a rounded height on the next read.
      result.viewBox = [0, 0, rounded(node.width), rounded(node.height)]
      if (node.vectorNetwork.regions[0]?.windingRule === 'EVENODD') result.fillRule = 'evenodd'
    }
  }
  const children =
    node.type === 'STICKY'
      ? []
      : state.graph
          .getChildren(node.id)
          .filter((child) => !child.internalOnly)
          .map((child) => writeNode(state, child))
  if (children.length > 0) result.children = children
  return result
}

/** Code-point order, so the canonical text does not depend on the runtime locale. */
function compareCodePoints(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as { [key: string]: unknown })
    return Object.fromEntries(
      entries
        .sort(([left], [right]) => compareCodePoints(left, right))
        .map(([key, entry]) => [key, sortKeys(entry)])
    )
  }
  return value
}

export function penDocumentFromGraph(graph: SceneGraph): PenDocument {
  const variables = new Map<string, Variable>()
  for (const variable of graph.variables.values()) variables.set(variable.id, variable)
  const collections = new Map<string, VariableCollection>()
  for (const collection of graph.variableCollections.values())
    collections.set(collection.id, collection)
  const state: PenWriteState = { graph, variables, collections, writtenIds: writtenNodeIds(graph) }
  const children = graph.getPages().flatMap((page) =>
    graph
      .getChildren(page.id)
      .filter((node) => !node.internalOnly)
      .map((node) => writeNode(state, node))
  )
  const document: PenDocument = { version: PEN_VERSION, name: graph.getPages()[0]?.name, children }
  const variablesValue = variablesOf(state)
  if (variablesValue) document.variables = variablesValue
  const themes = themesOf(state)
  if (themes) document.themes = themes
  return document
}

export function stringifyPenDocument(document: PenDocument): string {
  return `${JSON.stringify(sortKeys(document), null, 2)}\n`
}

export function writePenDocument(source: PenDocument | SceneGraph): string {
  const document = source instanceof SceneGraphValue ? penDocumentFromGraph(source) : source
  return stringifyPenDocument(document)
}
