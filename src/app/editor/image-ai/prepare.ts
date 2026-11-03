import type { CanvasKit } from 'canvaskit-wasm'

/** Image services answer at about 1–2 megapixels, so a larger upload only costs time. */
const IMAGE_AI_MAX_DIMENSION = 2048

interface PreparedImage {
  png: Uint8Array
  width: number
  height: number
}

/** `width` × `height` scaled down to fit `maxDimension` on its longer side, never up. */
function fitWithin(
  width: number,
  height: number,
  maxDimension = IMAGE_AI_MAX_DIMENSION
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) return { width, height }
  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

/**
 * Re-encodes an image of any kind CanvasKit decodes as a PNG no larger than the services use,
 * keeping its transparency; null when it cannot be decoded.
 */
export function prepareImageForService(ck: CanvasKit, bytes: Uint8Array): PreparedImage | null {
  const source = ck.MakeImageFromEncoded(bytes)
  if (!source) return null
  try {
    const { width, height } = fitWithin(source.width(), source.height())
    if (width <= 0 || height <= 0) return null
    const surface = ck.MakeSurface(width, height)
    if (!surface) return null
    try {
      const canvas = surface.getCanvas()
      canvas.clear(ck.TRANSPARENT)
      canvas.drawImageRectOptions(
        source,
        ck.LTRBRect(0, 0, source.width(), source.height()),
        ck.LTRBRect(0, 0, width, height),
        ck.FilterMode.Linear,
        ck.MipmapMode.None,
        null
      )
      surface.flush()
      const snapshot = surface.makeImageSnapshot()
      const encoded = snapshot.encodeToBytes(ck.ImageFormat.PNG, 100)
      snapshot.delete()
      return encoded?.length ? { png: new Uint8Array(encoded), width, height } : null
    } finally {
      surface.delete()
    }
  } finally {
    source.delete()
  }
}
