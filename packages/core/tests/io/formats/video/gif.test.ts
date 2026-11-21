import { describe, expect, test } from 'bun:test'

import type { RGBAImage } from '@pairdraw/core/io/formats/raster'
import { createGIFSink, filledImage } from '@pairdraw/core/io/formats/video'

interface GIFOutline {
  signature: string
  width: number
  height: number
  frames: number
  /** Each frame's delay in hundredths of a second. */
  delays: number[]
  loops: boolean
}

/** Walks a GIF's blocks, as a decoder reads them, and lists what it holds. */
function readGIF(bytes: Uint8Array): GIFOutline {
  const signature = new TextDecoder().decode(bytes.subarray(0, 6))
  const width = bytes[6] | (bytes[7] << 8)
  const height = bytes[8] | (bytes[9] << 8)
  const packed = bytes[10]
  let at = 13 + (packed & 0x80 ? 3 * 2 ** ((packed & 7) + 1) : 0)
  const delays: number[] = []
  let frames = 0
  let loops = false
  const skipSubBlocks = () => {
    while (bytes[at] !== 0) at += bytes[at] + 1
    at += 1
  }
  while (at < bytes.length && bytes[at] !== 0x3b) {
    if (bytes[at] === 0x21) {
      const label = bytes[at + 1]
      if (label === 0xf9) delays.push(bytes[at + 4] | (bytes[at + 5] << 8))
      if (label === 0xff) {
        loops ||= new TextDecoder().decode(bytes.subarray(at + 3, at + 14)) === 'NETSCAPE2.0'
      }
      at += 2
      skipSubBlocks()
    } else if (bytes[at] === 0x2c) {
      frames += 1
      const local = bytes[at + 9]
      at += 10 + (local & 0x80 ? 3 * 2 ** ((local & 7) + 1) : 0)
      at += 1 // LZW minimum code size
      skipSubBlocks()
    } else {
      throw new Error(`Unexpected GIF block 0x${bytes[at].toString(16)} at ${at}`)
    }
  }
  return { signature, width, height, frames, delays, loops }
}

const red = filledImage(4, 2, { r: 1, g: 0, b: 0, a: 1 })
const blue = filledImage(4, 2, { r: 0, g: 0, b: 1, a: 1 })

async function encode(frames: RGBAImage[], loops: boolean, fps = 10): Promise<Uint8Array> {
  const sink = createGIFSink({ width: 4, height: 2, fps, loops })
  const frameMs = 1000 / fps
  for (const [index, image] of frames.entries()) {
    await sink.add(image, index * frameMs, frameMs)
  }
  return sink.finish()
}

describe('a GIF of a recorded prototype', () => {
  test('holds a repeated frame as one image with the whole delay', async () => {
    const gif = readGIF(await encode([red, red, blue], true))

    expect(gif).toEqual({
      signature: 'GIF89a',
      width: 4,
      height: 2,
      frames: 2,
      delays: [20, 10],
      loops: true
    })
  })

  test('plays once when the flow does not loop', async () => {
    expect(readGIF(await encode([red, blue], false)).loops).toBe(false)
  })

  test('keeps the total length exact when frames fall between hundredths of a second', async () => {
    const frames = Array.from({ length: 30 }, (_, index) => (index % 2 === 0 ? red : blue))
    const gif = readGIF(await encode(frames, true, 30))

    expect(gif.frames).toBe(30)
    expect(gif.delays.reduce((sum, delay) => sum + delay, 0)).toBe(100)
  })

  test('refuses a frame rate browsers would slow down', () => {
    expect(() => createGIFSink({ width: 4, height: 2, fps: 60, loops: true })).toThrow(
      'GIF plays at most 50 frames per second'
    )
  })
})
