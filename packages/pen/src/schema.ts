import * as v from 'valibot'

import { CODE_SYNTAX_PLATFORMS } from '@pairdraw/scene-graph'
import { designMemorySchema, type DesignMemory } from '@pairdraw/scene-graph/design-memory'
import { finiteNumberSchema } from '@pairdraw/scene-graph/primitives'
import { tokenSourcesSchema } from '@pairdraw/scene-graph/token-sources'

import { stripJSONComments } from './jsonc'

/**
 * The `.pen` document as pen.dev writes it (schema 2.21), plus the older forms still found in
 * files: the object `stroke` of 2.8 and `icon_font` nodes. Properties typed `…OrVariable` hold a
 * `$name` reference in place of the value. Enumerated values stay strings so a value this reader
 * does not know falls back to the default instead of rejecting the document. Numbers must be
 * finite: JSON reads a literal too large for a double, such as `1e999`, as Infinity and writes it
 * back as `null`, so a document holding one would save as a file no reader opens.
 */

const numSchema = v.union([finiteNumberSchema, v.string()])
const boolSchema = v.union([v.boolean(), v.string()])
const strSchema = v.string()
const sidesSchema = v.looseObject({
  top: v.optional(numSchema),
  right: v.optional(numSchema),
  bottom: v.optional(numSchema),
  left: v.optional(numSchema)
})

const paintBase = {
  enabled: v.optional(boolSchema),
  blendMode: v.optional(strSchema)
}

const colorPaintSchema = v.looseObject({
  type: v.literal('color'),
  ...paintBase,
  color: strSchema
})

const gradientPaintSchema = v.looseObject({
  type: v.literal('gradient'),
  ...paintBase,
  gradientType: v.optional(strSchema),
  opacity: v.optional(numSchema),
  center: v.optional(
    v.looseObject({ x: v.optional(finiteNumberSchema), y: v.optional(finiteNumberSchema) })
  ),
  size: v.optional(
    v.looseObject({
      width: v.optional(numSchema),
      height: v.optional(numSchema)
    })
  ),
  rotation: v.optional(numSchema),
  colors: v.optional(v.array(v.looseObject({ color: strSchema, position: numSchema })))
})

const imagePaintSchema = v.looseObject({
  type: v.literal('image'),
  ...paintBase,
  opacity: v.optional(numSchema),
  url: v.optional(strSchema),
  mode: v.optional(strSchema),
  transform: v.optional(
    v.tuple([
      finiteNumberSchema,
      finiteNumberSchema,
      finiteNumberSchema,
      finiteNumberSchema,
      finiteNumberSchema,
      finiteNumberSchema
    ])
  )
})

/**
 * A `mesh_gradient` paint, as the `.pen` reference documents it: one color per vertex and one
 * point per vertex in [0,1], `columns * rows` of them. Bezier handles ride on the points and do
 * not change the grid this reader draws, so they pass through as unknowns.
 */
export const meshPaintSchema = v.looseObject({
  type: v.literal('mesh_gradient'),
  ...paintBase,
  opacity: v.optional(numSchema),
  columns: v.optional(numSchema),
  rows: v.optional(numSchema),
  colors: v.optional(v.array(v.unknown())),
  points: v.optional(v.array(v.unknown()))
})

/**
 * A `shader` paint: `url` names the shader file beside the document, whose source `PenReadOptions`
 * gives by that URL. One whose source the host did not read draws nothing, as pen.dev shows a
 * shader it cannot compile.
 */
const shaderPaintSchema = v.looseObject({
  type: v.literal('shader'),
  ...paintBase,
  opacity: v.optional(numSchema),
  url: v.optional(strSchema)
})

/** Paint types this reader does not draw. */
const otherPaintSchema = v.looseObject({ type: strSchema, ...paintBase })

const paintSchema = v.union([
  strSchema,
  colorPaintSchema,
  gradientPaintSchema,
  imagePaintSchema,
  meshPaintSchema,
  shaderPaintSchema,
  otherPaintSchema
])
const paintsSchema = v.union([paintSchema, v.array(paintSchema)])

/** The 2.8 stroke: one colour with its weight and placement in one object. */
const legacyStrokeSchema = v.looseObject({
  thickness: v.union([numSchema, sidesSchema]),
  fill: v.optional(strSchema),
  align: v.optional(strSchema),
  join: v.optional(strSchema),
  cap: v.optional(strSchema)
})

const effectSchema = v.looseObject({
  type: strSchema,
  enabled: v.optional(boolSchema),
  radius: v.optional(numSchema),
  shadowType: v.optional(strSchema),
  offset: v.optional(v.looseObject({ x: numSchema, y: numSchema })),
  blur: v.optional(numSchema),
  /** Written by older files; current pen.dev shadows have no spread. */
  spread: v.optional(numSchema),
  color: v.optional(strSchema),
  blendMode: v.optional(strSchema),
  /** The shader file a `shader` effect names, read by `PenReadOptions.shaders`. */
  url: v.optional(strSchema)
})

const sizeSchema = numSchema
// A tuple takes a longer array and drops the rest, and a union keeps its first match: four values
// go first, or the two-value tuple reads [top, right] and loses the bottom and left.
const paddingSchema = v.union([
  numSchema,
  v.tuple([numSchema, numSchema, numSchema, numSchema]),
  v.tuple([numSchema, numSchema])
])
const cornerRadiusSchema = v.union([numSchema, v.array(numSchema)])

/** Every property a node, or an override of one, can carry. */
const nodeFields = {
  name: v.optional(strSchema),
  context: v.optional(strSchema),
  /**
   * What a layer is, for agents: pen.dev writes a `type` and any fields of its own. It is only kept
   * as plugin data, so any value is read as it is rather than rejecting the document.
   */
  metadata: v.optional(v.unknown()),
  x: v.optional(finiteNumberSchema),
  y: v.optional(finiteNumberSchema),
  width: v.optional(sizeSchema),
  height: v.optional(sizeSchema),
  reusable: v.optional(v.boolean()),
  theme: v.optional(v.record(strSchema, strSchema)),
  enabled: v.optional(boolSchema),
  opacity: v.optional(numSchema),
  flipX: v.optional(boolSchema),
  flipY: v.optional(boolSchema),
  layoutPosition: v.optional(strSchema),
  rotation: v.optional(numSchema),

  fill: v.optional(paintsSchema),
  stroke: v.optional(v.union([paintsSchema, legacyStrokeSchema])),
  strokeWidth: v.optional(v.union([numSchema, sidesSchema])),
  strokeLinecap: v.optional(strSchema),
  strokeLinejoin: v.optional(strSchema),
  strokeAlignment: v.optional(strSchema),
  effect: v.optional(v.union([effectSchema, v.array(effectSchema)])),
  cornerRadius: v.optional(cornerRadiusSchema),

  layout: v.optional(strSchema),
  gap: v.optional(numSchema),
  layoutIncludeStroke: v.optional(v.boolean()),
  padding: v.optional(paddingSchema),
  justifyContent: v.optional(strSchema),
  alignItems: v.optional(strSchema),
  clip: v.optional(boolSchema),
  placeholder: v.optional(v.boolean()),
  slot: v.optional(v.union([v.literal(false), v.array(strSchema)])),

  innerRadius: v.optional(numSchema),
  startAngle: v.optional(numSchema),
  sweepAngle: v.optional(numSchema),
  polygonCount: v.optional(numSchema),
  geometry: v.optional(strSchema),
  fillRule: v.optional(strSchema),
  viewBox: v.optional(
    v.tuple([finiteNumberSchema, finiteNumberSchema, finiteNumberSchema, finiteNumberSchema])
  ),

  content: v.optional(strSchema),
  textGrowth: v.optional(strSchema),
  fontFamily: v.optional(strSchema),
  fontSize: v.optional(numSchema),
  fontWeight: v.optional(numSchema),
  fontStyle: v.optional(strSchema),
  letterSpacing: v.optional(numSchema),
  lineHeight: v.optional(numSchema),
  textAlign: v.optional(strSchema),
  textAlignVertical: v.optional(strSchema),
  underline: v.optional(boolSchema),
  strikethrough: v.optional(boolSchema),
  href: v.optional(v.nullable(strSchema)),

  library: v.optional(strSchema),
  icon: v.optional(strSchema),
  weight: v.optional(numSchema),
  iconFontName: v.optional(strSchema),
  iconFontFamily: v.optional(strSchema),

  ref: v.optional(strSchema),
  /** The model a `prompt` node asks. */
  model: v.optional(strSchema),

  /** A `script` node's JavaScript file, relative to the document. */
  scriptUri: v.optional(strSchema),
  /** A `script` node's input values by name. */
  inputs: v.optional(v.record(strSchema, v.unknown())),
  /** The page a `browser` node shows; empty asks for one. */
  url: v.optional(strSchema),
  /** The device a `browser` node emulates; responsive without one. */
  deviceId: v.optional(strSchema),
  zoom: v.optional(numSchema),
  scrollX: v.optional(numSchema),
  scrollY: v.optional(numSchema)
}

export type NodeFields = v.InferOutput<v.ObjectSchema<typeof nodeFields, undefined>>

/** Properties an instance sets on one of its component's descendants, or a node replacing it. */
export interface PenOverride extends NodeFields {
  type?: string
  id?: string
  children?: PenNode[]
  descendants?: Record<string, PenOverride>
  [key: string]: unknown
}

export interface PenNode extends PenOverride {
  type: string
  id: string
}

const overrideSchema: v.GenericSchema<unknown, PenOverride> = v.looseObject({
  ...nodeFields,
  type: v.optional(strSchema),
  id: v.optional(strSchema),
  children: v.optional(v.array(v.lazy(() => nodeSchema))),
  descendants: v.optional(
    v.record(
      strSchema,
      v.lazy(() => overrideSchema)
    )
  )
})

const nodeSchema: v.GenericSchema<unknown, PenNode> = v.looseObject({
  ...nodeFields,
  type: strSchema,
  id: strSchema,
  children: v.optional(v.array(v.lazy(() => nodeSchema))),
  descendants: v.optional(v.record(strSchema, overrideSchema))
})

const variableScalarSchema = v.union([v.string(), finiteNumberSchema, v.boolean()])

const variableSchema = v.looseObject({
  type: strSchema,
  value: v.union([
    variableScalarSchema,
    v.array(
      v.looseObject({
        value: variableScalarSchema,
        theme: v.optional(v.record(strSchema, strSchema))
      })
    )
  ]),
  /**
   * The code that names the token, as Figma's variables carry it. Pencil has no field for it, so
   * it is an extension other Pencil clients ignore; without it a reopened document cannot match a
   * renamed variable to the token its stylesheet declares.
   */
  codeSyntax: v.optional(v.record(v.picklist(CODE_SYNTAX_PLATFORMS), strSchema))
})

/** A font file the document bundles, which its text names by `name` as a family. */
const fontSchema = v.looseObject({ name: strSchema, url: strSchema })

/** A document whose links are a list this reader can use; any other value is no link at all. */
const penTokenSourcesSchema = v.pipe(
  v.unknown(),
  v.transform((value) => v.parse(tokenSourcesSchema, Array.isArray(value) ? value : []))
)

/**
 * The memory a file holds, or none when an older client wrote something this reader cannot use:
 * a document stays readable because of one unreadable field.
 */
const penDesignMemorySchema = v.pipe(
  v.unknown(),
  v.transform((value): DesignMemory | undefined => {
    const parsed = v.safeParse(designMemorySchema, value)
    return parsed.success ? parsed.output : undefined
  })
)

const penDocumentSchema = v.looseObject({
  version: v.optional(strSchema),
  // The page's name. The format is single-page, so it belongs to the document.
  name: v.optional(strSchema),
  fonts: v.optional(v.array(fontSchema)),
  themes: v.optional(v.record(strSchema, v.array(strSchema))),
  /**
   * The selector each mode applies in, by collection and mode name: `.dark` for a Dark mode a
   * stylesheet writes. Pencil has no field for it, so it is an extension other clients ignore;
   * without it a reopened document reads the stylesheet's dark block as a new mode.
   */
  modeConditions: v.optional(v.record(strSchema, v.record(strSchema, strSchema))),
  imports: v.optional(v.record(strSchema, strSchema)),
  variables: v.optional(v.record(strSchema, variableSchema)),
  /** The code the document's variables are linked to, as Core keeps it on the document node. */
  tokenSources: v.optional(penTokenSourcesSchema),
  /**
   * The design memory agents follow, as Core keeps it on the document node: allowed values,
   * decisions, and pinned examples. Pencil has no field for it, so it is an extension other
   * Pencil clients ignore; without it a reopened document loses its rules.
   */
  designMemory: v.optional(penDesignMemorySchema),
  children: v.array(nodeSchema)
})

export type PenDocument = v.InferOutput<typeof penDocumentSchema>
export type PenFont = v.InferOutput<typeof fontSchema>
export type PenVariable = v.InferOutput<typeof variableSchema>
export type PenVariableScalar = v.InferOutput<typeof variableScalarSchema>
export type PenPaint = v.InferOutput<typeof paintSchema>
export type PenPaints = v.InferOutput<typeof paintsSchema>
export type PenGradientPaint = v.InferOutput<typeof gradientPaintSchema>
export type PenImagePaint = v.InferOutput<typeof imagePaintSchema>
export type PenShaderPaint = v.InferOutput<typeof shaderPaintSchema>
export type PenMeshPaint = v.InferOutput<typeof meshPaintSchema>
export type PenLegacyStroke = v.InferOutput<typeof legacyStrokeSchema>
export type PenEffect = v.InferOutput<typeof effectSchema>
export type PenSides = v.InferOutput<typeof sidesSchema>
export type PenNumber = v.InferOutput<typeof numSchema>

/** A `.pen` file's text, which may hold comments, as its document. */
export const penFileSchema = v.pipe(
  v.string(),
  v.transform(stripJSONComments),
  v.parseJson(),
  penDocumentSchema
)
