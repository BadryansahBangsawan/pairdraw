/**
 * The shape a shader samples through `@sdf`: one 128 px square image of a layer's signed distance,
 * so a shader can outline, bevel, or fade from its edge without knowing the geometry. The distance
 * is analytic for boxes, rounded boxes, and ellipses; every other shape uses its box, which keeps
 * a shader's first pixels honest rather than faking a path distance field.
 */

import type { CanvasKit, Image, Shader } from 'canvaskit-wasm'

import type { SceneNode } from '@pairdraw/scene-graph'

/** The SDF texture's edge, in pixels. */
export const SDF_SIZE = 128

/** The distance to `shape` at a point in its own pixels, positive inside. */
function shapeDistance(
  node: SceneNode,
  shape: 'rect' | 'rrect' | 'oval',
  radius: number,
  x: number,
  y: number
): number {
  const halfW = node.width / 2
  const halfH = node.height / 2
  const px = x - halfW
  const py = y - halfH
  if (shape === 'oval') {
    if (halfW <= 0 || halfH <= 0) return -Math.hypot(px, py)
    const k1 = Math.hypot(px / halfW, py / halfH)
    const k2 = Math.hypot(px / (halfW * halfW), py / (halfH * halfH))
    return k2 === 0 ? -Math.min(halfW, halfH) : (k1 * (k1 - 1)) / k2
  }
  const r = shape === 'rrect' ? Math.min(radius, halfW, halfH) : 0
  const qx = Math.abs(px) - (halfW - r)
  const qy = Math.abs(py) - (halfH - r)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return outside + Math.min(Math.max(qx, qy), 0) - r
}

/** The channel values at one texel: normalized distance in `r`, the outward direction in `g`/`b`. */
function texel(
  node: SceneNode,
  shape: 'rect' | 'rrect' | 'oval',
  radius: number,
  x: number,
  y: number
): [number, number, number, number] {
  const scale = Math.max(node.width, node.height, 1)
  const distance = shapeDistance(node, shape, radius, x, y)
  const step = Math.max(scale / SDF_SIZE, 0.5)
  const dx =
    shapeDistance(node, shape, radius, x + step, y) -
    shapeDistance(node, shape, radius, x - step, y)
  const dy =
    shapeDistance(node, shape, radius, x, y + step) -
    shapeDistance(node, shape, radius, x, y - step)
  const length = Math.hypot(dx, dy) || 1
  return [
    // Positive inside, as shader documentation reads: `.r` above 0.5 is within the shape.
    Math.min(Math.max(0.5 - distance / scale, 0), 1),
    0.5 + dx / length / 2,
    // Shader uv counts y up, while a point here counts it down, so the outward direction flips.
    0.5 - dy / length / 2,
    1
  ]
}

/** The shape an SDF approximates: an ellipse as an oval, corners as a rounded box. */
function shapeOf(node: SceneNode): 'oval' | 'rrect' | 'rect' {
  if (node.type === 'ELLIPSE') return 'oval'
  return node.cornerRadius > 0 ? 'rrect' : 'rect'
}

/** The SDF image of `node`'s shape, to be freed by the caller. */
export function makeSdfImage(ck: CanvasKit, node: SceneNode): Image | null {
  const shape = shapeOf(node)
  const bytes = new Uint8Array(SDF_SIZE * SDF_SIZE * 4)
  const pixelW = node.width / SDF_SIZE
  const pixelH = node.height / SDF_SIZE
  for (let y = 0; y < SDF_SIZE; y++) {
    for (let x = 0; x < SDF_SIZE; x++) {
      // Row zero is the image's top and a shader's uv counts y up, so rows run bottom first.
      const [red, green, blue, alpha] = texel(
        node,
        shape,
        node.cornerRadius,
        (x + 0.5) * pixelW,
        node.height - (y + 0.5) * pixelH
      )
      const at = (y * SDF_SIZE + x) * 4
      bytes[at] = Math.round(red * 255)
      bytes[at + 1] = Math.round(green * 255)
      bytes[at + 2] = Math.round(blue * 255)
      bytes[at + 3] = Math.round(alpha * 255)
    }
  }
  return ck.MakeImage(
    {
      width: SDF_SIZE,
      height: SDF_SIZE,
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Premul,
      colorSpace: ck.ColorSpace.SRGB
    },
    bytes,
    SDF_SIZE * 4
  )
}

/** How many SDF shaders one renderer keeps, so a document with many layers still settles. */
const CACHE_LIMIT = 64

interface SdfEntry {
  key: string
  image: Image
}

/** One cache per renderer: the SDF images of the layers currently drawn, newest last. */
const caches = new WeakMap<object, Map<string, SdfEntry>>()

function sdfKey(node: SceneNode): string {
  return `${node.type}:${Math.round(node.width)}x${Math.round(node.height)}:${Math.round(node.cornerRadius)}`
}

/**
 * A shader of `node`'s SDF, which SkSL samples as a child in the frame's own pixels. Cached by
 * shape, so an animating shader builds its distance field once.
 */
export function sdfShader(ck: CanvasKit, owner: object, node: SceneNode): Shader | null {
  let cache = caches.get(owner)
  if (!cache) {
    cache = new Map()
    caches.set(owner, cache)
  }
  const key = sdfKey(node)
  const cached = cache.get(key)
  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    return cached.image.makeShaderOptions(
      ck.TileMode.Clamp,
      ck.TileMode.Clamp,
      ck.FilterMode.Linear,
      ck.MipmapMode.None
    )
  }
  const image = makeSdfImage(ck, node)
  if (!image) return null
  cache.set(key, { key, image })
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.get(oldest)?.image.delete()
    cache.delete(oldest)
  }
  return image.makeShaderOptions(
    ck.TileMode.Clamp,
    ck.TileMode.Clamp,
    ck.FilterMode.Linear,
    ck.MipmapMode.None
  )
}
