import * as v from 'valibot'

import type {
  BlendMode,
  Fill,
  FillType,
  GradientStop,
  GradientTransform
} from '@pairdraw/scene-graph'
import { colorToFill, parseColor } from '@pairdraw/scene-graph/color'
import { TRANSPARENT } from '@pairdraw/scene-graph/constants'
import {
  IDENTITY_GRADIENT_TRANSFORM,
  type GradientTransformRows
} from '@pairdraw/scene-graph/gradient'
import { paintTransformSchema } from '@pairdraw/scene-graph/paints'
import type { Color } from '@pairdraw/scene-graph/primitives'
import {
  createShaderPaint,
  createShaderSourcePaint,
  SHADER_SOURCE_MAX_BYTES,
  shaderPresetSchema,
  type ShaderComponent,
  type ShaderPaint,
  type ShaderPreset,
  type ShaderUniformValue
} from '@pairdraw/scene-graph/shaders'

import { parseScriptInput } from './schema'

export type PaintColor = string | Color
export type PaintStop = readonly [PaintColor, number] | { color: PaintColor; position: number }

export interface SolidPaintOptions {
  opacity?: number
  visible?: boolean
  blendMode?: BlendMode
}

export interface GradientPaintOptions extends SolidPaintOptions {
  /** Figma's `gradientTransform`, as its plugin API's rows or as the matrix fields. */
  transform?: GradientTransformRows | GradientTransform
}

const colorSchema = v.union([
  v.string(),
  v.object({ r: v.number(), g: v.number(), b: v.number(), a: v.number() })
])
const stopsSchema = v.array(
  v.union(
    [v.tuple([colorSchema, v.number()]), v.object({ color: colorSchema, position: v.number() })],
    (issue) => `Expected [color, position] or { color, position } but received ${issue.received}`
  )
)

const GRADIENT_HELPERS = {
  GRADIENT_LINEAR: 'linearGradient',
  GRADIENT_RADIAL: 'radialGradient',
  GRADIENT_ANGULAR: 'angularGradient',
  GRADIENT_DIAMOND: 'diamondGradient'
} as const

type GradientType = keyof typeof GRADIENT_HELPERS

/**
 * Scripts call the helpers with whatever they guess, so a wrong call says what it expects
 * and what was wrong, as Valibot describes it.
 */
function parseStops(type: GradientType, stops: unknown): PaintStop[] {
  return parseScriptInput(
    `${GRADIENT_HELPERS[type]}() expects an array of stops, such as [['#3b82f6', 0], ['#8b5cf6', 1]]`,
    stopsSchema,
    stops
  )
}

function parseTransform(type: GradientType, transform: unknown): GradientTransform {
  return parseScriptInput(
    `${GRADIENT_HELPERS[type]}() expects a transform as Figma's [[a, b, c], [d, e, f]], such as [[0, 1, 0], [-1, 0, 1]], or { m00, m01, m02, m10, m11, m12 }`,
    paintTransformSchema,
    transform
  )
}

function toColor(color: PaintColor): Color {
  return typeof color === 'string' ? parseColor(color) : color
}

function toStop(stop: PaintStop): GradientStop {
  if ('color' in stop) {
    return { color: toColor(stop.color), position: stop.position }
  }
  return { color: toColor(stop[0]), position: stop[1] }
}

export function solid(color: PaintColor, options: SolidPaintOptions = {}): Fill {
  const fill = colorToFill(color)
  return {
    ...fill,
    opacity: options.opacity ?? fill.opacity,
    visible: options.visible ?? true,
    blendMode: options.blendMode
  }
}

export function gradient(
  type: Extract<FillType, GradientType>,
  stops: PaintStop[],
  options: GradientPaintOptions = {}
): Fill {
  return {
    type,
    color: { ...TRANSPARENT },
    opacity: options.opacity ?? 1,
    visible: options.visible ?? true,
    blendMode: options.blendMode,
    gradientStops: parseStops(type, stops).map(toStop),
    gradientTransform:
      options.transform === undefined
        ? { ...IDENTITY_GRADIENT_TRANSFORM }
        : parseTransform(type, options.transform)
  }
}

/** A paint that draws a shader, carrying its entry until the layer it fills stores it. */
export interface ShaderFill extends Fill {
  shader: ShaderPaint
}

/** Whether a paint value came from {@link shader} or {@link shaderSource}. */
export function isShaderFill(value: Fill): value is ShaderFill {
  return 'shader' in value
}

const shaderSourceSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('Expected the shader code to write'),
  v.check(
    (source) => new TextEncoder().encode(source).length <= SHADER_SOURCE_MAX_BYTES,
    `Expected at most ${SHADER_SOURCE_MAX_BYTES} bytes of shader code`
  )
)

/** The inputs a user-written shader was given values for. */
const shaderUniformsSchema = v.record(v.string(), v.union([v.number(), v.boolean(), v.string()]))

export interface ShaderSourceOptions extends SolidPaintOptions {
  uniforms?: Record<string, ShaderUniformValue>
}

/**
 * A paint that draws shader code written here rather than a preset from the `shaders` library.
 * Its inputs are the `@directive` ones the code declares.
 */
export function shaderSource(source: string, options: ShaderSourceOptions = {}): ShaderFill {
  const code = parseScriptInput(
    'shaderSource() expects the shader code as a string',
    shaderSourceSchema,
    source
  )
  const uniforms =
    options.uniforms === undefined
      ? {}
      : parseScriptInput(
          'shaderSource() expects its uniforms as { name: value }',
          shaderUniformsSchema,
          options.uniforms
        )
  const { paint, shader } = createShaderSourcePaint(code)
  return {
    ...paint,
    opacity: options.opacity ?? 1,
    visible: options.visible ?? true,
    blendMode: options.blendMode,
    shader: { ...shader, uniforms }
  }
}

const shaderInputSchema = v.union(
  [
    shaderPresetSchema,
    v.pipe(
      v.array(v.unknown()),
      v.transform((components) => ({ components })),
      shaderPresetSchema
    )
  ],
  (issue) =>
    `Expected a preset { components: [...] } or an array of effects but received ${issue.received}`
)

/**
 * A paint that draws a shader from the `shaders` library: a preset as shaders.com exports it, or
 * just its effects, such as `shader([{ type: 'Aurora' }])`.
 */
export function shader(
  preset: ShaderPreset | ShaderComponent[],
  options: SolidPaintOptions = {}
): ShaderFill {
  const parsed = parseScriptInput(
    "shader() expects a preset such as { components: [{ type: 'Aurora' }] } or an array of effects",
    shaderInputSchema,
    preset
  )
  const { paint, shader } = createShaderPaint(parsed)
  return {
    ...paint,
    opacity: options.opacity ?? 1,
    visible: options.visible ?? true,
    blendMode: options.blendMode,
    shader
  }
}

export function linearGradient(stops: PaintStop[], options?: GradientPaintOptions): Fill {
  return gradient('GRADIENT_LINEAR', stops, options)
}

export function radialGradient(stops: PaintStop[], options?: GradientPaintOptions): Fill {
  return gradient('GRADIENT_RADIAL', stops, options)
}

export function angularGradient(stops: PaintStop[], options?: GradientPaintOptions): Fill {
  return gradient('GRADIENT_ANGULAR', stops, options)
}

export function diamondGradient(stops: PaintStop[], options?: GradientPaintOptions): Fill {
  return gradient('GRADIENT_DIAMOND', stops, options)
}
