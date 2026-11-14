import { sha1 } from '@noble/hashes/legacy.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

import { TRANSPARENT } from '../constants'
import { readAllPluginData, withAllPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import { randomHex } from '../random'
import type { Fill, SceneNode } from '../types'
import type { ShaderPaint, ShaderPreset, ShaderPresetPaint, ShaderSourcePaint } from './schema'

/** What shader paints read of a node. */
type ShaderNode = Pick<SceneNode, 'fills' | 'strokes' | 'pluginData'>

/** Every shader a node's fills and strokes draw, whether or not a paint still shows it. */
export function readShaderPaints(node: Pick<SceneNode, 'pluginData'>): ShaderPaint[] {
  return readAllPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.shader)
}

/**
 * The shader a fill or stroke of `node` draws: an image paint whose image is a shader's frame.
 * Null for any other paint, including one whose image was replaced, which then draws as the
 * image it holds.
 */
export function shaderOfPaint(
  node: Pick<SceneNode, 'pluginData'>,
  paint: Fill
): ShaderPaint | null {
  if (paint.type !== 'IMAGE' || !paint.imageHash) return null
  return readShaderPaints(node).find((shader) => shader.image === paint.imageHash) ?? null
}

/** Whether any paint of `node` draws a shader. */
export function hasShaderPaint(node: ShaderNode): boolean {
  return [...node.fills, ...node.strokes].some((paint) => shaderOfPaint(node, paint) !== null)
}

/**
 * The node's plugin data with `shaders` set by their image, keeping only shaders a fill or
 * stroke of `paints` still shows, so removing or replacing a paint leaves no entry behind.
 */
export function withShaderPaints(
  node: Pick<SceneNode, 'pluginData'>,
  paints: readonly Fill[],
  shaders: readonly ShaderPaint[] = []
): SceneNode['pluginData'] {
  const shown = new Set(
    paints.flatMap((paint) => (paint.type === 'IMAGE' && paint.imageHash ? [paint.imageHash] : []))
  )
  const byImage = new Map(readShaderPaints(node).map((shader) => [shader.image, shader]))
  for (const shader of shaders) byImage.set(shader.image, shader)
  return withAllPluginData(
    node.pluginData,
    PAIRDRAW_PLUGIN_DATA.shader,
    [...byImage.values()].filter((shader) => shown.has(shader.image))
  )
}

/**
 * A new paint that draws `preset`, and the shader entry it shows. Its image names a frame not yet
 * rendered, unique to this paint, so no other paint's entry claims it until the frame is drawn.
 */
export function createShaderPaint(preset: ShaderPreset): {
  paint: Fill
  shader: ShaderPaint
} {
  const image = randomHex(20)
  return {
    paint: {
      type: 'IMAGE',
      color: TRANSPARENT,
      opacity: 1,
      visible: true,
      imageHash: image,
      imageScaleMode: 'FILL'
    },
    shader: { image, preset: structuredClone(preset) }
  }
}

/**
 * A new paint that draws shader `source`, and the shader entry it shows. It starts as a shader
 * paint of the same image, so replacing a preset keeps the layer's paint and frame. A caller
 * reading one back from a file passes the `image` it recorded, so reading it again keeps it.
 */
export function createShaderSourcePaint(
  source: string,
  image: string = randomHex(20)
): {
  paint: Fill
  shader: ShaderSourcePaint
} {
  return {
    paint: {
      type: 'IMAGE',
      color: TRANSPARENT,
      opacity: 1,
      visible: true,
      imageHash: image,
      imageScaleMode: 'FILL'
    },
    shader: { image, source, uniforms: {} }
  }
}

/** A short key that tells one preset from another, which a rendered frame records. */
export function shaderPresetKey(preset: ShaderPreset): string {
  return bytesToHex(sha1(utf8ToBytes(JSON.stringify(preset))))
}

/** A short key that tells one shader source from another, which a rendered frame records. */
export function shaderSourceKey(source: string): string {
  return bytesToHex(sha1(utf8ToBytes(source)))
}

/** Whether the shader draws a library preset, so `preset` is present. */
export function isShaderPresetPaint(shader: ShaderPaint): shader is ShaderPresetPaint {
  return 'preset' in shader
}

/** Whether the shader draws code the user wrote, so `source` is present. */
export function isShaderSourcePaint(shader: ShaderPaint): shader is ShaderSourcePaint {
  return 'source' in shader
}

/** The key of what a shader draws, which its still frame records. */
export function shaderFrameKey(shader: ShaderPaint): string {
  return isShaderSourcePaint(shader)
    ? shaderSourceKey(shader.source)
    : shaderPresetKey(shader.preset)
}

/**
 * Whether a shader's frame was rendered for its preset at the size `node` has now, so undoing a
 * preset change after reopening the document does not keep a frame of the newer preset.
 */
export function isShaderFrameCurrent(
  shader: ShaderPaint,
  size: { width: number; height: number }
): boolean {
  const { frame } = shader
  return (
    frame !== undefined &&
    frame.preset === shaderFrameKey(shader) &&
    Math.round(frame.width) === Math.round(size.width) &&
    Math.round(frame.height) === Math.round(size.height)
  )
}
