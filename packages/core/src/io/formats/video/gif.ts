import { applyPalette, GIFEncoder, quantize } from 'gifenc'

import type { RGBAImage } from '#core/io/formats/raster'

import type { VideoSink, VideoSinkOptions } from './sink'

/** Browsers stretch delays under two hundredths of a second, so faster GIFs play slower. */
export const MAX_GIF_FPS = 50

interface PendingFrame {
  image: RGBAImage
  startMs: number
  endMs: number
}

/**
 * A GIF encoder for recorded frames. A frame passed again as the same image extends the one before
 * it, so a held screen is stored once with its whole delay. Delays are kept in hundredths of a
 * second measured from the start, so rounding never drifts the clip's length.
 */
export function createGIFSink(options: VideoSinkOptions): VideoSink {
  if (options.fps > MAX_GIF_FPS) {
    throw new Error(`GIF plays at most ${MAX_GIF_FPS} frames per second`)
  }
  const encoder = GIFEncoder()
  let pending: PendingFrame | null = null

  function write(frame: PendingFrame) {
    const { data, width, height } = frame.image
    const palette = quantize(data, 256)
    const delayCs = Math.round(frame.endMs / 10) - Math.round(frame.startMs / 10)
    encoder.writeFrame(applyPalette(data, palette), width, height, {
      palette,
      delay: delayCs * 10,
      repeat: options.loops ? 0 : -1
    })
  }

  return {
    add(image, timestampMs, durationMs) {
      const endMs = timestampMs + durationMs
      if (pending?.image === image) pending.endMs = endMs
      else {
        if (pending) write(pending)
        pending = { image, startMs: timestampMs, endMs }
      }
      return Promise.resolve()
    },
    finish() {
      if (pending) write(pending)
      pending = null
      encoder.finish()
      return Promise.resolve(encoder.bytes())
    },
    cancel() {
      pending = null
      return Promise.resolve()
    },
    get byteLength() {
      return encoder.bytesView().length
    }
  }
}
