import type { Canvas, Image, ImageFilter, Shader } from 'canvaskit-wasm'

import type { SceneNode, TextureEffect } from '@pairdraw/scene-graph'

import { cellValue } from './noise/tile'
import type { SkiaRenderer } from './renderer'
import { skColorSpace } from './renderer/colors'

/** Cells on each side of a texture's displacement tile; it repeats beyond them. */
const TEXTURE_TILE_CELLS = 256

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * A cell's red or green displacement as smooth noise over `frequency` cells, sampled where the
 * layer's pixels are: one cycle per grain, and tileable because the corners wrap.
 */
function displacement(x: number, y: number, frequency: number, seed: number, salt: number): number {
  const gx = x * frequency
  const gy = y * frequency
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const x1 = (x0 + 1) % TEXTURE_TILE_CELLS
  const y1 = (y0 + 1) % TEXTURE_TILE_CELLS
  const tx = smooth(gx - x0)
  const ty = smooth(gy - y0)
  const wrap = (value: number) =>
    ((value % TEXTURE_TILE_CELLS) + TEXTURE_TILE_CELLS) % TEXTURE_TILE_CELLS
  const v00 = cellValue(wrap(x0), wrap(y0), seed, salt)
  const v10 = cellValue(x1, wrap(y0), seed, salt)
  const v01 = cellValue(wrap(x0), y1, seed, salt)
  const v11 = cellValue(x1, y1, seed, salt)
  const top = v00 + (v10 - v00) * tx
  const bottom = v01 + (v11 - v01) * tx
  return top + (bottom - top) * ty
}

/**
 * The displacement tile for a texture: red and green as independent smooth noise one grain to a
 * cycle, as `feTurbulence` writes them, cached by grain size and seed.
 */
export function textureDisplacementTile(
  r: SkiaRenderer,
  texture: TextureEffect,
  seed: number
): Image | null {
  const frequency = (size: number) => (size > 0 ? 1 / size : 0)
  const fx = frequency(texture.texture.noiseSize.x)
  const fy = frequency(texture.texture.noiseSize.y)
  const key = `texture:${fx}:${fy}:${seed}`
  const kept = r.textureNoiseCache.get(key)
  if (kept) return kept
  const pixels = new Uint8Array(TEXTURE_TILE_CELLS * TEXTURE_TILE_CELLS * 4)
  for (let y = 0; y < TEXTURE_TILE_CELLS; y++) {
    for (let x = 0; x < TEXTURE_TILE_CELLS; x++) {
      const at = (y * TEXTURE_TILE_CELLS + x) * 4
      pixels[at] = Math.floor(displacement(x, y, fx, seed, 1) * 256)
      pixels[at + 1] = Math.floor(displacement(x, y, fy, seed, 2) * 256)
      pixels[at + 2] = 0
      pixels[at + 3] = 255
    }
  }
  const image = r.ck.MakeImage(
    {
      width: TEXTURE_TILE_CELLS,
      height: TEXTURE_TILE_CELLS,
      alphaType: r.ck.AlphaType.Unpremul,
      colorType: r.ck.ColorType.RGBA_8888,
      colorSpace: skColorSpace(r.ck, r.documentColorSpace)
    },
    pixels,
    TEXTURE_TILE_CELLS * 4
  )
  if (!image) return null
  r.textureNoiseCache.set(key, image)
  return image
}

/** The first visible texture effect on a layer, which roughens its edges. */
export function textureEffectOf(node: SceneNode): TextureEffect | null {
  for (const effect of node.effects) {
    if (effect.visible && effect.type === 'TEXTURE' && effect.radius > 0) return effect
  }
  return null
}

/**
 * Draws a layer's content through the displacement of its texture effect: the noise moves each
 * pixel by up to `radius`, as Figma's filter does, and `clipToShape` keeps the moved pixels inside
 * the layer's box. Returns false when there is no texture to draw, so a caller draws as usual.
 */
export function withTextureEffect(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  draw: () => void
): boolean {
  const texture = textureEffectOf(node)
  if (!texture) return false
  const tile = textureDisplacementTile(r, texture, texture.texture.seed ?? 0)
  if (!tile) return false
  const repeat = r.ck.TileMode.Repeat
  const shader: Shader = tile.makeShaderOptions(
    repeat,
    repeat,
    r.ck.FilterMode.Linear,
    r.ck.MipmapMode.None
  )
  const displacement: ImageFilter = r.ck.ImageFilter.MakeShader(shader)
  const filter: ImageFilter = r.ck.ImageFilter.MakeDisplacementMap(
    r.ck.ColorChannel.Red,
    r.ck.ColorChannel.Green,
    texture.radius * 2,
    displacement,
    null
  )
  const paint = new r.ck.Paint()
  try {
    paint.setImageFilter(filter)
    const rect = r.ck.LTRBRect(0, 0, node.width, node.height)
    if (texture.texture.clipToShape) r.clipNodeShape(canvas, node)
    canvas.saveLayer(paint, rect)
    try {
      draw()
    } finally {
      canvas.restore()
    }
  } finally {
    paint.delete()
    filter.delete()
    displacement.delete()
    shader.delete()
  }
  return true
}
