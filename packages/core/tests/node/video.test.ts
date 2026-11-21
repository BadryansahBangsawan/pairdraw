import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { ALL_FORMATS, BufferSource, EncodedPacketSink, Input } from 'mediabunny'

import { filledImage } from '@pairdraw/core/io/formats/video'
import { createFFmpegEncoder } from '@pairdraw/core/node/video'

/** ffmpeg is optional: the encoder is tested where it is installed with both codecs. */
const ffmpeg = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' })
const hasFFmpeg =
  ffmpeg.status === 0 && ffmpeg.stdout.includes('libx264') && ffmpeg.stdout.includes('libvpx-vp9')

async function readBack(bytes: Uint8Array) {
  const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS })
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error('The file has no video track')
  let packets = 0
  for await (const packet of new EncodedPacketSink(track).packets()) packets += packet ? 1 : 0
  return {
    codec: await track.getCodec(),
    size: [track.codedWidth, track.codedHeight],
    packets,
    duration: await input.computeDuration()
  }
}

async function encode(format: 'mp4' | 'webm') {
  const sink = await createFFmpegEncoder().create(format, {
    width: 64,
    height: 32,
    fps: 10,
    loops: false
  })
  const red = filledImage(64, 32, { r: 1, g: 0, b: 0, a: 1 })
  const blue = filledImage(64, 32, { r: 0, g: 0, b: 1, a: 1 })
  for (let index = 0; index < 20; index++) {
    await sink.add(index < 10 ? red : blue, index * 100, 100)
  }
  return sink.finish()
}

describe('the ffmpeg encoder', () => {
  test('supports nothing when the command is missing', async () => {
    const encoder = createFFmpegEncoder('pairdraw-no-such-ffmpeg')
    expect(await encoder.supports('mp4')).toBe(false)
    expect(await encoder.supports('webm')).toBe(false)
  })

  test.skipIf(!hasFFmpeg)('writes an H.264 MP4 with one frame per recorded frame', async () => {
    expect(await readBack(await encode('mp4'))).toEqual({
      codec: 'avc',
      size: [64, 32],
      packets: 20,
      duration: 2
    })
  })

  test.skipIf(!hasFFmpeg)('writes a VP9 WebM', async () => {
    const result = await readBack(await encode('webm'))
    expect(result.codec).toBe('vp9')
    expect(result.size).toEqual([64, 32])
  })

  test.skipIf(!hasFFmpeg)('leaves nothing behind when cancelled', async () => {
    const sink = await createFFmpegEncoder().create('mp4', {
      width: 64,
      height: 32,
      fps: 10,
      loops: false
    })
    await sink.add(filledImage(64, 32, { r: 1, g: 1, b: 1, a: 1 }), 0, 100)
    await sink.cancel()
    await expect(sink.finish()).rejects.toThrow()
  })

  test.skipIf(!hasFFmpeg)('waits for ffmpeg without piling up listeners', async () => {
    const warnings: string[] = []
    const onWarning = (warning: Error) => warnings.push(warning.name)
    process.on('warning', onWarning)
    try {
      // A 720p frame is larger than the pipe holds, so every frame waits for ffmpeg to drain it.
      const sink = await createFFmpegEncoder().create('mp4', {
        width: 1280,
        height: 720,
        fps: 30,
        loops: false
      })
      const frame = filledImage(1280, 720, { r: 0.2, g: 0.4, b: 0.6, a: 1 })
      for (let index = 0; index < 15; index++) await sink.add(frame, index * 33, 33)
      await sink.finish()
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
    } finally {
      process.off('warning', onWarning)
    }
    expect(warnings).not.toContain('MaxListenersExceededWarning')
  })

  test('says ffmpeg failed and leaves no folder when it stops mid-recording', async () => {
    const leftovers = async () =>
      (await readdir(tmpdir())).filter((name) => name.startsWith('pairdraw-ffmpeg-'))
    const before = await leftovers()
    // `false` exits at once, as an ffmpeg that fails on its input does.
    const sink = await createFFmpegEncoder('false').create('mp4', {
      width: 64,
      height: 32,
      fps: 10,
      loops: false
    })
    const frame = filledImage(64, 32, { r: 1, g: 1, b: 1, a: 1 })
    let failure: unknown = null
    try {
      for (let index = 0; index < 200; index++) await sink.add(frame, index * 100, 100)
    } catch (error) {
      failure = error
    }
    // The recorder cancels the sink when a frame fails.
    await sink.cancel()

    expect(failure).toBeInstanceOf(Error)
    expect(failure instanceof Error ? failure.message : '').toContain(
      'ffmpeg could not encode the video'
    )
    expect(await leftovers()).toEqual(before)
  })
})
