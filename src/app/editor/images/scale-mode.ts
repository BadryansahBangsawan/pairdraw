import { isEqual } from 'es-toolkit'

import type { Fill, GradientTransform, ImageScaleMode } from '@pairdraw/scene-graph'

/**
 * How the image fill picker offers to place an image. Stretch is no mode of its own in Figma or
 * `.fig`: it is a crop whose window is the whole image, which draws it across the layer at the
 * layer's proportions, as pencil.dev's stretch reads in from `.pen` files.
 */
export type ImageFillMode = ImageScaleMode | 'STRETCH'

export const IMAGE_FILL_MODES: readonly ImageFillMode[] = ['FILL', 'FIT', 'STRETCH', 'CROP', 'TILE']

/** The crop window that is the whole image. */
const WHOLE_IMAGE: GradientTransform = { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }

/**
 * The mode a fill shows as. A crop of the whole image draws exactly as Stretch does, and is what a
 * new crop starts as when the layer and image share proportions, so it shows as `picked` when that
 * names Crop and as Stretch otherwise, such as for a fill read from a file.
 */
export function imageFillMode(fill: Fill, picked?: ImageFillMode | null): ImageFillMode {
  const mode = fill.imageScaleMode ?? 'FILL'
  if (mode !== 'CROP' || !fill.imageTransform || !isEqual(fill.imageTransform, WHOLE_IMAGE))
    return mode
  return picked === 'CROP' ? 'CROP' : 'STRETCH'
}

/**
 * The fill placed in `mode`. Stretch crops to the whole image; a crop starts over from `cropStart`,
 * the Fill framing, as Figma starts a new crop; the other modes keep a crop's window, which they
 * ignore, as Figma does.
 */
export function withImageFillMode(
  fill: Fill,
  mode: ImageFillMode,
  cropStart: () => GradientTransform | undefined
): Fill {
  if (mode === 'STRETCH')
    return { ...fill, imageScaleMode: 'CROP', imageTransform: { ...WHOLE_IMAGE } }
  const next: Fill = { ...fill, imageScaleMode: mode }
  if (mode === 'CROP') next.imageTransform = cropStart()
  return next
}
