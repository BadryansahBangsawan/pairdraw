import {
  BLACK,
  DEFAULT_FONT_FAMILY,
  DEFAULT_STROKE_MITER_LIMIT,
  DEFAULT_STROKE_WEIGHT
} from './constants'
import { normalizeEffects } from './effects'
import { EMPTY_LIST, EMPTY_RECORD, shareEmptyNodeValues } from './empty-values'
import { createInstanceOverrideState } from './instances/overrides'
import { NO_LETTER_SPACING } from './text/lengths'
import type { NodeType, SceneNode, SourceMetadata } from './types'

export function createDefaultSourceMetadata(): SourceMetadata {
  return {
    format: null,
    id: null,
    orderKey: null,
    editedFields: EMPTY_LIST,
    fig: {
      rawSize: null,
      rawTransform: null,
      rawNodeFields: EMPTY_RECORD,
      layout: null,
      symbolOverrides: EMPTY_LIST,
      componentPropAssignments: EMPTY_LIST,
      derivedSymbolData: EMPTY_LIST,
      derivedSymbolDataLayoutVersion: null,
      uniformScaleFactor: null
    }
  }
}

/**
 * Every SceneNode field. Nodes start with all of them, so setting any field later keeps the
 * shape every node shares; a key added after creation turns a JavaScriptCore object into a
 * slower, larger dictionary.
 */
type CompleteNodeFields = SceneNode & Record<keyof SceneNode, unknown>

/** Where Figma aligns a new node's strokes: centered on lines and vectors, outside text, else inside. */
export function defaultStrokeAlign(type: NodeType): SceneNode['strokeAlign'] {
  if (type === 'LINE' || type === 'VECTOR') return 'CENTER'
  return type === 'TEXT' ? 'OUTSIDE' : 'INSIDE'
}

/**
 * Weight and alignment a stroke added to `node` takes: its first stroke's, or what the node keeps
 * with none. Adding a stroke from the panel and from the plugin API both go through here.
 */
export function newStrokeGeometry(
  node: Pick<SceneNode, 'strokes' | 'strokeWeight' | 'strokeAlign'>
): Pick<SceneNode['strokes'][number], 'weight' | 'align'> {
  const first = node.strokes.at(0)
  return { weight: first?.weight ?? node.strokeWeight, align: first?.align ?? node.strokeAlign }
}

/**
 * The name a layer of `type` carries when nothing names it, as Figma writes a type's name: words
 * of a compound type apart, so a shape with text is a "Shape with text".
 */
export function defaultNodeName(type: NodeType): string {
  const words = type.toLowerCase().replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The name Figma gives a layer that follows its text: the characters trimmed, on one line, and
 * the type's own name while they hold nothing.
 */
export function textLayerName(type: NodeType, text: string): string {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
  return lines.join(' ') || defaultNodeName(type)
}

/**
 * The fields auto layout sets on the frame that holds it, with the value each holds when no frame
 * lays anything out. A page holds layers; it is not one, so none of these apply to it and a page
 * that took them would place its layers by a container nobody can see.
 */
export const FRAME_LAYOUT_DEFAULTS = {
  layoutMode: 'NONE',
  layoutDirection: 'AUTO',
  layoutWrap: 'NO_WRAP',
  primaryAxisAlign: 'MIN',
  counterAxisAlign: 'MIN',
  primaryAxisSizing: 'FIXED',
  counterAxisSizing: 'FIXED',
  itemSpacing: 0,
  counterAxisSpacing: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0
} as const satisfies Partial<SceneNode>

export function createDefaultNode(
  generateId: () => string,
  type: NodeType,
  overrides: Partial<SceneNode> = {}
): SceneNode {
  const node = {
    id: generateId(),
    type,
    name: type.charAt(0) + type.slice(1).toLowerCase(),
    parentId: null,
    childIds: [],
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    source: createDefaultSourceMetadata(),
    derivedLayout: null,
    fills:
      type === 'TEXT'
        ? [{ type: 'SOLID' as const, color: BLACK, opacity: 1, visible: true }]
        : EMPTY_LIST,
    strokes: EMPTY_LIST,
    effects: EMPTY_LIST,
    layoutGrids: EMPTY_LIST,
    guides: EMPTY_LIST,
    fillStyleId: null,
    strokeStyleId: null,
    textStyleId: null,
    effectStyleId: null,
    gridStyleId: null,
    sharedStyleType: null,
    opacity: 1,
    cornerRadius: 0,
    topLeftRadius: 0,
    topRightRadius: 0,
    bottomRightRadius: 0,
    bottomLeftRadius: 0,
    independentCorners: false,
    cornerSmoothing: 0,
    visible: true,
    locked: false,
    clipsContent: false,
    text: '',
    fontSize: 14,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: 400,
    italic: false,
    fontStyle: null,
    textAlignHorizontal: 'LEFT',
    textDirection: 'AUTO',
    textLanguage: null,
    leadingTrim: 'NONE',
    lineHeight: null,
    letterSpacing: NO_LETTER_SPACING,
    ...FRAME_LAYOUT_DEFAULTS,
    blendMode: 'PASS_THROUGH',
    layoutPositioning: 'AUTO',
    layoutGrow: 0,
    layoutAlignSelf: 'AUTO',
    vectorNetwork: null,
    handleMirroring: 'NONE',
    fillGeometry: EMPTY_LIST,
    strokeGeometry: EMPTY_LIST,
    arcData: null,
    textAlignVertical: 'TOP',
    textAutoResize: 'NONE',
    textCase: 'ORIGINAL',
    textDecoration: 'NONE',
    textDecorationStyle: 'SOLID',
    textDecorationThickness: null,
    textDecorationFills: EMPTY_LIST,
    textDecorationSkipInk: true,
    textUnderlineOffset: null,
    maxLines: null,
    textParagraphs: EMPTY_LIST,
    listSpacing: 0,
    paragraphSpacing: 0,
    paragraphIndent: 0,
    hangingList: false,
    styleRuns: EMPTY_LIST,
    fontVariations: EMPTY_LIST,
    opticalSizeFromFontSize: true,
    fontFeatures: EMPTY_LIST,
    horizontalConstraint: 'MIN',
    verticalConstraint: 'MIN',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    dashPattern: EMPTY_LIST,
    borderTopWeight: 0,
    borderRightWeight: 0,
    borderBottomWeight: 0,
    borderLeftWeight: 0,
    independentStrokeWeights: false,
    strokeWeight: DEFAULT_STROKE_WEIGHT,
    strokeAlign: defaultStrokeAlign(type),
    strokeMiterLimit: DEFAULT_STROKE_MITER_LIMIT,
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    targetAspectRatio: null,
    connectorStart: null,
    connectorEnd: null,
    connectorLineType: 'ELBOWED',
    connectorStartCap: 'ROUND',
    connectorEndCap: 'ARROW_LINES',
    connectorControlPoints: EMPTY_LIST,
    connectorCurveHandles: null,
    connectorLabelPosition: null,
    isMask: false,
    maskType: 'ALPHA',
    maskIsOutline: false,
    gridTemplateColumns: EMPTY_LIST,
    gridTemplateRows: EMPTY_LIST,
    gridColumnGap: 0,
    gridRowGap: 0,
    gridPosition: null,
    counterAxisAlignContent: 'AUTO',
    itemReverseZIndex: false,
    strokesIncludedInLayout: false,
    expanded: true,
    textTruncation: 'DISABLED',
    autoRename: true,
    pointCount: 5,
    starInnerRadius: 0.38,
    shapeWithTextType: 'SQUARE',
    shapeUserHeight: 0,
    shapeTruncates: false,
    componentId: null,
    instanceOverrides: createInstanceOverrideState(),
    componentPropertyDefinitions: EMPTY_LIST,
    componentPropertyReferences: EMPTY_LIST,
    componentPropertyAssignments: EMPTY_RECORD,
    componentPropertyValues: EMPTY_RECORD,
    componentKey: null,
    sourceLibraryKey: null,
    publishId: null,
    overrideKey: null,
    sharedSymbolVersion: null,
    publishedVersion: null,
    librarySource: null,
    isPublishable: false,
    isSymbolPublishable: false,
    isExposedInstance: false,
    symbolDescription: '',
    symbolLinks: EMPTY_LIST,
    variantPropSpecs: EMPTY_LIST,
    boundVariables: EMPTY_RECORD,
    variableBindingScales: EMPTY_RECORD,
    variableAssignmentScales: EMPTY_RECORD,
    componentScale: 1,
    variableModes: EMPTY_RECORD,
    exportSettings: EMPTY_LIST,
    status: null,
    pluginData: EMPTY_LIST,
    pluginRelaunchData: EMPTY_LIST,
    prototypeReactions: EMPTY_LIST,
    internalOnly: false,
    flipX: false,
    flipY: false,
    textPicture: null,
    derivedTextGlyphs: null,
    derivedTextHeight: null,
    textPathData: null,
    textPathBox: null,
    booleanOperation: undefined,
    ...overrides
  } satisfies CompleteNodeFields
  node.effects = normalizeEffects(node.effects)
  shareEmptyNodeValues(node, Object.keys(overrides))
  return node
}

/** Containers whose bounds follow their children and that set no coordinate space, as in Figma. */
export const FITTED_CONTAINER_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  'GROUP',
  'BOOLEAN_OPERATION'
])

/** Layers whose stroke can take a weight per side, as Figma's `strokeTopWeight` and its siblings. */
export const SIDE_STROKE_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  'RECTANGLE',
  'FRAME',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

export const CONTAINER_TYPES = new Set<NodeType>([
  'CANVAS',
  'FRAME',
  'GROUP',
  'BOOLEAN_OPERATION',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])
