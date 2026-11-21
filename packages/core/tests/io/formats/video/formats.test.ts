import { describe, expect, test } from 'bun:test'

import {
  canRecordFormat,
  openVideoSink,
  recordableFormats,
  type VideoSink
} from '@pairdraw/core/io/formats/video'

const OPTIONS = { width: 64, height: 32, fps: 30, loops: false }

/** A host encoder that records WebM only, and hands back the sink it made. */
function webmOnlyHost() {
  const made: VideoSink[] = []
  return {
    made,
    encoder: {
      supports: (format: string) => format === 'webm',
      create: () => {
        const sink: VideoSink = {
          add: () => Promise.resolve(),
          finish: () => Promise.resolve(new Uint8Array([1])),
          cancel: () => Promise.resolve(),
          byteLength: 0
        }
        made.push(sink)
        return Promise.resolve(sink)
      }
    }
  }
}

describe('a host video encoder', () => {
  test('adds the formats WebCodecs cannot encode here', async () => {
    expect(await canRecordFormat('webm', 64, 32, 30)).toBe(false)
    const host = webmOnlyHost()

    expect(await canRecordFormat('webm', 64, 32, 30, host.encoder)).toBe(true)
    expect(await recordableFormats(64, 32, 30, host.encoder)).toContain('webm')
    const sink = await openVideoSink('webm', OPTIONS, host.encoder)
    expect(host.made).toEqual([sink])
  })

  test('is not asked for GIF, which every engine records', async () => {
    const host = webmOnlyHost()

    await openVideoSink('gif', OPTIONS, host.encoder)
    expect(host.made).toEqual([])
  })
})
