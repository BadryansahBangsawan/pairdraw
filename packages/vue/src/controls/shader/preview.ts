import { imageMimeType } from '@open-pencil/scene-graph/images'
import type { Size } from '@open-pencil/scene-graph/primitives'
import type { ShaderPreset } from '@open-pencil/scene-graph/shaders'

import { createShaderRasterizer } from '#vue/canvas/surface/shader/rasterizer'

import type { ShaderEffect } from './catalog'
import type { ShaderGalleryEntry } from './gallery'

/** An effect preview's size in CSS pixels, as a picker row shows it. */
const EFFECT_PREVIEW_SIZE = { width: 48, height: 32 }
/** A gallery shader's preview size in CSS pixels, as a gallery tile shows it. */
const GALLERY_PREVIEW_SIZE = { width: 72, height: 48 }
/** What a filter is previewed over: it changes what is beneath it, which shows best on edges. */
const PREVIEW_BASE = { type: 'Voronoi' }

const previews = new Map<string, Promise<string | null>>()
let rasterizer: ReturnType<typeof createShaderRasterizer> | undefined
let queue: Promise<unknown> = Promise.resolve()

function effectPreset(effect: ShaderEffect): ShaderPreset {
  return {
    components: effect.filter ? [PREVIEW_BASE, { type: effect.name }] : [{ type: effect.name }]
  }
}

/**
 * A small still of `preset` at `size` CSS pixels, as an object URL for an `<img>`; null where
 * shaders cannot be drawn. Previews are drawn one at a time, the first time each `key` is asked
 * for, and kept for the session.
 */
function preview(key: string, preset: ShaderPreset, size: Size): Promise<string | null> {
  const known = previews.get(key)
  if (known) return known
  rasterizer ??= createShaderRasterizer()
  const active = rasterizer
  const ratio = window.devicePixelRatio || 1
  const drawn = queue.then(async () => {
    const bytes = await active?.render(preset, {
      width: size.width * ratio,
      height: size.height * ratio
    })
    return bytes
      ? URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: imageMimeType(bytes) }))
      : null
  })
  // A preview that fails to draw leaves the rest of the queue to go on.
  queue = drawn.catch(() => null)
  const url = drawn.catch(() => null)
  previews.set(key, url)
  return url
}

/** A small still of `effect` with its default props, as a picker row shows it. */
export function shaderEffectPreview(effect: ShaderEffect): Promise<string | null> {
  return preview(`effect:${effect.name}`, effectPreset(effect), EFFECT_PREVIEW_SIZE)
}

/** A still of a gallery shader, as its gallery tile shows it. */
export function shaderGalleryPreview(entry: ShaderGalleryEntry): Promise<string | null> {
  return preview(`gallery:${entry.id}`, entry.preset, GALLERY_PREVIEW_SIZE)
}
