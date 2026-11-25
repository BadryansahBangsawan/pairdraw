/**
 * The shapes the `shaders` library draws for an effect that takes one, as `SHAPE3D_TYPES` in
 * `shaders/core` names them. The list is local so the panel does not load the WebGPU library;
 * `shapes.test.ts` keeps it equal to the library's.
 */
export const SHADER_SHAPES = [
  'sphere3D',
  'cube3D',
  'torus3D',
  'octahedron3D',
  'cylinder3D',
  'capsule3D',
  'cone3D',
  'pyramid3D',
  'prism3D',
  'ellipsoid3D',
  'diamond3D',
  'link3D',
  'gem3D',
  'helix3D',
  'metaballs3D',
  'dodecahedron3D',
  'hemisphere3D',
  'ribbon3D',
  'blob3D',
  'gyroscope3D'
] as const

export type ShaderShape = (typeof SHADER_SHAPES)[number]

/** The geometry each shape starts from, as `SHAPE3D_DEFAULTS` in `shaders/core` gives it. */
const SHAPE_DEFAULTS: Readonly<Record<ShaderShape, Readonly<Record<string, number>>>> = {
  sphere3D: { radius: 0.35, rotX: 0, rotY: 0, rotZ: 0 },
  cube3D: { sizeX: 0.27, sizeY: 0.27, sizeZ: 0.27, rounding: 0.02, rotX: 25, rotY: 35, rotZ: 0 },
  torus3D: { radius: 0.3, tube: 0.12, rotX: 55, rotY: 0, rotZ: 0 },
  octahedron3D: { radius: 0.42, rotX: 10, rotY: 25, rotZ: 0 },
  cylinder3D: { radius: 0.22, height: 0.26, rounding: 0.02, rotX: 60, rotY: 0, rotZ: 30 },
  capsule3D: { radius: 0.16, height: 0.2, rotX: 0, rotY: 0, rotZ: 35 },
  cone3D: { radius: 0.3, topRadius: 0.02, height: 0.3, rotX: 25, rotY: 0, rotZ: 15 },
  pyramid3D: { size: 0.3, height: 0.45, rotX: -10, rotY: 30, rotZ: 0 },
  prism3D: { radius: 0.28, height: 0.14, rotX: 25, rotY: 30, rotZ: 0 },
  ellipsoid3D: { radiusX: 0.38, radiusY: 0.22, radiusZ: 0.3, rotX: 0, rotY: 0, rotZ: 20 },
  diamond3D: { radius: 0.3, height: 0.42, rotX: 15, rotY: 0, rotZ: 0 },
  link3D: { radius: 0.18, length: 0.15, tube: 0.08, rotX: 20, rotY: 30, rotZ: 0 },
  gem3D: { radius: 0.3, height: 0.32, facets: 8, rotX: 15, rotY: 0, rotZ: 0 },
  helix3D: { radius: 0.22, tube: 0.06, pitch: 0.16, rotX: 20, rotY: 0, rotZ: 0 },
  metaballs3D: {
    balls: 4,
    ballRadius: 0.16,
    spread: 0.2,
    blend: 0.12,
    speed: 1,
    rotX: 0,
    rotY: 0,
    rotZ: 0
  },
  dodecahedron3D: { radius: 0.34, rotX: 20, rotY: 10, rotZ: 0 },
  hemisphere3D: { radius: 0.4, cut: 0, rotX: 30, rotY: 0, rotZ: 0 },
  ribbon3D: {
    width: 0.15,
    thickness: 0.03,
    length: 0.38,
    wave: 0.1,
    waveFrequency: 7,
    twist: 140,
    speed: 1,
    rotX: 12,
    rotY: 18,
    rotZ: 0
  },
  blob3D: { radius: 0.3, wobble: 0.07, wobbliness: 5, speed: 1, rotX: 0, rotY: 0, rotZ: 0 },
  gyroscope3D: {
    radius: 0.34,
    width: 0.1,
    thickness: 0.028,
    rounding: 0.006,
    core: 0.14,
    speed: 1,
    rotX: 15,
    rotY: 0,
    rotZ: 0
  }
}

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

/**
 * `value` with its shape type set to `type`: the new shape's own geometry fills in where the
 * old shape had none, and whatever the old shape set for the same fields is kept.
 */
export function withShapeType(value: unknown, type: string): string {
  const shape = readShape(value)
  if (shape?.type === type) return value as string
  const defaults = SHADER_SHAPES.includes(type as ShaderShape)
    ? SHAPE_DEFAULTS[type as ShaderShape]
    : {}
  return JSON.stringify(shape ? { ...defaults, ...shape, type } : { ...defaults, type })
}
