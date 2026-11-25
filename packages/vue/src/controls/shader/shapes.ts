/** The shapes the `shaders` library draws for an effect that takes one. */
export const SHADER_SHAPES = ['sphere3D', 'dot', 'bars', 'streak'] as const

export type ShaderShape = (typeof SHADER_SHAPES)[number]

/** The fields a shape's JSON holds: a type, and whatever that shape's geometry needs. */
interface ShaderShapeFields {
  type?: unknown
  [field: string]: unknown
}

/** The shape an effect's `shape` prop holds, as the library writes it: JSON with a `type`. */
function readShape(value: unknown): ShaderShapeFields | null {
  if (typeof value !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as ShaderShapeFields
  } catch {
    return null
  }
}

/** The type of the shape `value` holds, or '' when it holds none. */
export function shaderShapeType(value: unknown): string {
  const shape = readShape(value)
  return typeof shape?.type === 'string' ? shape.type : ''
}

/** `value` with its shape type set to `type`, keeping the rest so its size survives the change. */
export function withShapeType(value: unknown, type: string): string {
  const shape = readShape(value)
  return JSON.stringify(shape ? { ...shape, type } : { type })
}
