import type { Color } from '@pairdraw/scene-graph/primitives'

import type { RGBAImage } from '#core/io/formats/raster'

/** A frame of one opaque color, such as the page behind the played frame. */
export function filledImage(width: number, height: number, color: Color): RGBAImage {
  const data = new Uint8Array(width * height * 4)
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  for (let index = 0; index < data.length; index += 4) {
    data[index] = r
    data[index + 1] = g
    data[index + 2] = b
    data[index + 3] = 255
  }
  return { width, height, data }
}

/**
 * Draws `source` over `target` with its top-left corner at `x`, `y` in whole pixels, as a layer
 * paints over what is under it; what falls outside `target` is clipped.
 */
export function drawOver(target: RGBAImage, source: RGBAImage, x: number, y: number): void {
  const left = Math.max(0, x)
  const top = Math.max(0, y)
  const right = Math.min(target.width, x + source.width)
  const bottom = Math.min(target.height, y + source.height)
  const out = target.data
  const src = source.data
  for (let row = top; row < bottom; row++) {
    let to = (row * target.width + left) * 4
    let from = ((row - y) * source.width + (left - x)) * 4
    for (let column = left; column < right; column++, to += 4, from += 4) {
      const alpha = src[from + 3]
      if (alpha === 0) continue
      if (alpha === 255) {
        out[to] = src[from]
        out[to + 1] = src[from + 1]
        out[to + 2] = src[from + 2]
        out[to + 3] = 255
        continue
      }
      const rest = 255 - alpha
      const under = (out[to + 3] * rest) / 255
      const total = alpha + under
      for (let channel = 0; channel < 3; channel++) {
        out[to + channel] = Math.round(
          (src[from + channel] * alpha + out[to + channel] * under) / total
        )
      }
      out[to + 3] = Math.round(total)
    }
  }
}

/** Darkens `target` toward black by `amount`, as the scrim under an overlay does. */
export function dim(target: RGBAImage, amount: number): void {
  const keep = 1 - amount
  const data = target.data
  for (let index = 0; index < data.length; index += 4) {
    data[index] = Math.round(data[index] * keep)
    data[index + 1] = Math.round(data[index + 1] * keep)
    data[index + 2] = Math.round(data[index + 2] * keep)
  }
}

/** A frame `mix` of the way from `from` to `to`, as a crossfade's opacity draws it. */
export function crossfade(from: RGBAImage, to: RGBAImage, mix: number): RGBAImage {
  if (mix <= 0) return from
  if (mix >= 1) return to
  const data = new Uint8Array(from.data.length)
  const a = from.data
  const b = to.data
  for (let index = 0; index < data.length; index++) {
    data[index] = Math.round(a[index] + (b[index] - a[index]) * mix)
  }
  return { width: from.width, height: from.height, data }
}
