import { describe, expect, test } from 'bun:test'

import type { Fill, GradientTransform } from '@pairdraw/scene-graph'

import { imageFillMode, withImageFillMode } from '@/app/editor/images/scale-mode'

const COVER: GradientTransform = { m00: 0.5, m01: 0, m02: 0.25, m10: 0, m11: 1, m12: 0 }

function image(props: Partial<Fill> = {}): Fill {
  return {
    type: 'IMAGE',
    visible: true,
    opacity: 1,
    color: { r: 0, g: 0, b: 0, a: 1 },
    imageHash: 'hash',
    ...props
  }
}

describe('image fill modes', () => {
  test('an image fill shows Fill until it has a mode', () => {
    expect(imageFillMode(image())).toBe('FILL')
    expect(imageFillMode(image({ imageScaleMode: 'TILE' }))).toBe('TILE')
  })

  test('Stretch is a crop of the whole image, which reads back as Stretch', () => {
    const stretched = withImageFillMode(image({ imageScaleMode: 'FIT' }), 'STRETCH', () => COVER)
    expect(stretched).toMatchObject({
      imageScaleMode: 'CROP',
      imageTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
    })
    expect(imageFillMode(stretched)).toBe('STRETCH')
  })

  test('a crop of part of the image stays a crop', () => {
    expect(imageFillMode(image({ imageScaleMode: 'CROP', imageTransform: COVER }))).toBe('CROP')
    expect(imageFillMode(image({ imageScaleMode: 'CROP' }))).toBe('CROP')
  })

  test('a new crop starts from the Fill framing, even from Stretch', () => {
    const stretched = withImageFillMode(image(), 'STRETCH', () => COVER)
    const cropped = withImageFillMode(stretched, 'CROP', () => COVER)
    expect(cropped).toMatchObject({ imageScaleMode: 'CROP', imageTransform: COVER })
    expect(imageFillMode(cropped)).toBe('CROP')
  })

  test('a crop that starts as the whole image shows as Crop once Crop was chosen', () => {
    // The layer and image share proportions, so the Fill framing a crop starts from is the whole image.
    const identity = (): GradientTransform => ({ m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 })
    const cropped = withImageFillMode(image(), 'CROP', identity)
    expect(imageFillMode(cropped, 'CROP')).toBe('CROP')
    expect(imageFillMode(cropped, 'STRETCH')).toBe('STRETCH')
    // Without a choice made here, such as a fill read from a file, the two read as Stretch.
    expect(imageFillMode(cropped)).toBe('STRETCH')
    // A choice only settles which of the two equal fills shows; other fills show their own mode.
    expect(imageFillMode(image({ imageScaleMode: 'CROP', imageTransform: COVER }), 'STRETCH')).toBe(
      'CROP'
    )
    expect(imageFillMode(image({ imageScaleMode: 'FIT' }), 'CROP')).toBe('FIT')
  })

  test('other modes keep the crop window they ignore, as Figma does', () => {
    const cropped = image({ imageScaleMode: 'CROP', imageTransform: COVER })
    expect(withImageFillMode(cropped, 'FIT', () => undefined)).toMatchObject({
      imageScaleMode: 'FIT',
      imageTransform: COVER
    })
  })
})
