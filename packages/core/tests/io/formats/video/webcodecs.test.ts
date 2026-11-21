import { describe, expect, test } from 'bun:test'

import { PlaceholderAVCEncoder } from '#core-tests/helpers/video'
import { ALL_FORMATS, BufferSource, EncodedPacketSink, Input, registerEncoder } from 'mediabunny'

import { canRecordVideo, createWebCodecsSink, filledImage } from '@pairdraw/core/io/formats/video'

describe('an MP4 of a recorded prototype', () => {
  test('is not offered where nothing can encode H.264', async () => {
    expect(await canRecordVideo('webm', 64, 32, 30)).toBe(false)
  })

  test('holds one H.264 frame per recorded frame at the recorded size and length', async () => {
    registerEncoder(PlaceholderAVCEncoder)
    expect(await canRecordVideo('mp4', 64, 32, 10)).toBe(true)
    const sink = await createWebCodecsSink('mp4', { width: 64, height: 32, fps: 10, loops: false })
    const red = filledImage(64, 32, { r: 1, g: 0, b: 0, a: 1 })
    for (let index = 0; index < 20; index++) await sink.add(red, index * 100, 100)
    expect(sink.byteLength).toBe(20 * 6)
    const bytes = await sink.finish()

    const input = new Input({ source: new BufferSource(bytes), formats: ALL_FORMATS })
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error('The MP4 has no video track')
    expect(await track.getCodec()).toBe('avc')
    expect([track.codedWidth, track.codedHeight]).toEqual([64, 32])
    let packets = 0
    for await (const packet of new EncodedPacketSink(track).packets()) packets += packet ? 1 : 0
    expect(packets).toBe(20)
    expect(await input.computeDuration()).toBeCloseTo(2, 5)
  })
})
