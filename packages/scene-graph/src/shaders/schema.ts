import * as v from 'valibot'

/** One effect of a shader preset, as the `shaders` library names it, with the effects it holds. */
export interface ShaderComponent {
  type: string
  id?: string
  props?: Record<string, unknown>
  children?: ShaderComponent[]
}

const shaderComponentSchema: v.GenericSchema<unknown, ShaderComponent> = v.object({
  type: v.pipe(v.string(), v.nonEmpty(), v.maxLength(100)),
  id: v.optional(v.string()),
  props: v.optional(v.record(v.string(), v.unknown())),
  children: v.optional(v.array(v.lazy(() => shaderComponentSchema)))
})

/**
 * A shader as the `shaders` library describes it and shaders.com exports it: a tree of effects,
 * drawn first to last.
 */
export const shaderPresetSchema = v.object({
  components: v.pipe(v.array(shaderComponentSchema), v.minLength(1)),
  structureVersion: v.optional(v.number())
})

export type ShaderPreset = v.InferOutput<typeof shaderPresetSchema>

const shaderImageSchema = v.pipe(v.string(), v.nonEmpty())

/**
 * The layer size a still frame was rendered for, and the key of what it was rendered from
 * (`shaderPresetKey` for a preset, `shaderSourceKey` for user code), which is missing until the
 * frame is first rendered.
 */
const shaderFrameSchema = v.object({
  width: v.pipe(v.number(), v.finite(), v.minValue(0)),
  height: v.pipe(v.number(), v.finite(), v.minValue(0)),
  preset: v.pipe(v.string(), v.nonEmpty())
})

/**
 * A value a shader uniform holds in the document: a number, a boolean, a hex color, or 2–4
 * numbers. A uniform bound to a variable resolves to the same shape.
 */
export const shaderUniformValueSchema = v.union([
  v.number(),
  v.boolean(),
  v.string(),
  v.array(v.number())
])

export type ShaderUniformValue = v.InferOutput<typeof shaderUniformValueSchema>

/** A paint that draws a shader preset as an image fill of its still frame. */
export const shaderPresetPaintSchema = v.object({
  image: shaderImageSchema,
  preset: shaderPresetSchema,
  frame: v.optional(shaderFrameSchema)
})

/**
 * A paint that draws shader code the user wrote. The renderer compiles it live; the uniform
 * values are stored by name, and `uniformBindings` names the variables some of them follow.
 */
export const shaderSourcePaintSchema = v.object({
  image: shaderImageSchema,
  source: v.pipe(v.string(), v.nonEmpty()),
  uniforms: v.optional(v.record(v.string(), shaderUniformValueSchema)),
  uniformBindings: v.optional(v.record(v.string(), v.string())),
  frame: v.optional(shaderFrameSchema)
})

/**
 * A paint that draws a shader, either a library preset or shader code the user wrote. The paint
 * itself is an image fill, so every format and renderer that reads images shows a shader's still
 * frame; a source shader draws live where the canvas can compile it, and its still frame, which
 * optional renderers may draw, keeps it visible everywhere else.
 */
export const shaderPaintSchema = v.union([shaderSourcePaintSchema, shaderPresetPaintSchema])

export type ShaderPaint = v.InferOutput<typeof shaderPaintSchema>
export type ShaderPresetPaint = v.InferOutput<typeof shaderPresetPaintSchema>
export type ShaderSourcePaint = v.InferOutput<typeof shaderSourcePaintSchema>
