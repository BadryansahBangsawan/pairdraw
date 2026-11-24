/**
 * Draws a layer shader effect: the layer renders itself into an offscreen surface, that surface
 * becomes the `@object` texture, and the effect's shader draws over the layer's bounds. Snapshot
 * and redraw costs one surface per effected layer per frame, which is the ceiling this trades for
 * an object texture and effect children the runtime effect can sample.
 */

import type { Canvas, Image, Shader, Surface } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode, ShaderEffect } from '@pairdraw/scene-graph'

import { setPaintBlendMode } from '#core/canvas/blend'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { skColorSpace } from '#core/canvas/renderer/colors'

import { boundUniformValues } from './bindings'
import { compileShader, packShaderUniforms, type CompiledShader, type ShaderFrame } from './compile'
import { sdfShader } from './sdf'

/** The largest snapshot a layer shader may make, per side, so a huge layer cannot exhaust memory. */
const MAX_SIDE = 4096

/** When the page started drawing shaders, which is what `@time` counts from. */
const startedAt = Date.now()

/** The effect each layer last compiled with, so a broken edit keeps drawing instead of blanking. */
const lastGood = new Map<string, CompiledShader>()

/** How many layers keep a last good effect, so a long session does not hold every one forever. */
const KEEP_LAST_GOOD = 32

/** The effect to draw `effect` with: its own compile, or the one it last compiled with. */
function effectFor(r: SkiaRenderer, effect: ShaderEffect): CompiledShader | null {
  const compiled = compileShader(r.ck, effect.source)
  if (compiled.effect) {
    lastGood.delete(effect.source)
    lastGood.set(effect.source, compiled)
    while (lastGood.size > KEEP_LAST_GOOD) {
      const oldest = lastGood.keys().next().value
      if (oldest === undefined) break
      lastGood.delete(oldest)
    }
    return compiled
  }
  return lastGood.get(effect.source) ?? null
}

/** The device pixels one layer coordinate spans, so the snapshot draws at the canvas's own rate. */
function deviceScale(canvas: Canvas): number {
  const matrix = canvas.getTotalMatrix()
  return Math.hypot(matrix[0] ?? 1, matrix[1] ?? 0) || 1
}

/** The `@object` shader for `image`, sampling it in the layer's own pixels. */
function objectShader(r: SkiaRenderer, image: Image, scale: number): Shader {
  const toImage = [scale, 0, 0, 0, scale, 0, 0, 0, 1]
  return image.makeShaderOptions(
    r.ck.TileMode.Clamp,
    r.ck.TileMode.Clamp,
    r.ck.FilterMode.Linear,
    r.ck.MipmapMode.None,
    toImage
  )
}

/**
 * Draws `node`'s content into `canvas` with `effects` applied in document order, each sampling what
 * the one before it drew. The content is drawn exactly once: an effect that cannot compile or is too
 * large to snapshot is skipped, and the rest of the chain still draws.
 */
export function drawShaderEffectChain(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  node: SceneNode,
  effects: readonly ShaderEffect[],
  renderContent: (canvas: Canvas) => void
): void {
  const effect = effects.at(-1)
  const below = effects.slice(0, -1)
  if (!effect) {
    renderContent(canvas)
    return
  }
  const drawn = drawShaderEffectLayer(r, canvas, graph, node, effect, (offscreen) =>
    drawShaderEffectChain(r, offscreen, graph, node, below, renderContent)
  )
  if (!drawn) drawShaderEffectChain(r, canvas, graph, node, below, renderContent)
}

/**
 * Draws `effect` over `node`'s bounds, calling `renderContent` with an offscreen canvas to paint
 * the layer into. Returns false when nothing compiled or the layer is too large to snapshot, so
 * the caller draws the layer as it would without the effect.
 */
export function drawShaderEffectLayer(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  node: SceneNode,
  effect: ShaderEffect,
  renderContent: (canvas: Canvas) => void
): boolean {
  if (!(node.width > 0) || !(node.height > 0)) return false
  const compiled = effectFor(r, effect)
  if (!compiled?.effect) return false

  const scale = deviceScale(canvas)
  const width = Math.ceil(node.width * scale)
  const height = Math.ceil(node.height * scale)
  if (width > MAX_SIDE || height > MAX_SIDE) return false

  let surface: Surface | null = null
  let image: Image | null = null
  const children: Shader[] = []
  let drawn: Shader | null = null
  try {
    surface = r.surface.makeSurface({
      width,
      height,
      colorType: r.ck.ColorType.RGBA_8888,
      alphaType: r.ck.AlphaType.Premul,
      colorSpace: skColorSpace(r.ck, r.documentColorSpace)
    })
    const offscreen = surface.getCanvas()
    offscreen.clear(r.ck.TRANSPARENT)
    offscreen.scale(scale, scale)
    renderContent(offscreen)
    surface.flush()

    image = surface.makeImageSnapshot()
    const samplers = compiled.uniforms.filter((uniform) => uniform.kind === 'sampler')
    for (const sampler of samplers) {
      if (sampler.automatic === 'object') {
        children.push(objectShader(r, image, scale))
        continue
      }
      const child = sdfShader(r.ck, r, node)
      if (!child) return false
      children.push(child)
    }

    const frame: ShaderFrame = {
      width: node.width,
      height: node.height,
      time: (Date.now() - startedAt) / 1000,
      mouse: { x: 0, y: 0 }
    }
    const uniforms = packShaderUniforms(
      compiled,
      boundUniformValues(effect.uniforms, effect.uniformBindings, graph, node.id),
      frame
    )
    drawn = compiled.effect.makeShaderWithChildren(uniforms, children)
    r.auxFill.setShader(drawn)
    r.auxFill.setAlphaf(1)
    setPaintBlendMode(r, r.auxFill, effect.blendMode)
    canvas.drawRect(r.ck.LTRBRect(0, 0, node.width, node.height), r.auxFill)
    r.auxFill.setShader(null)
    return true
  } catch {
    return false
  } finally {
    drawn?.delete()
    for (const child of children) child.delete()
    image?.delete()
    surface?.delete()
  }
}
