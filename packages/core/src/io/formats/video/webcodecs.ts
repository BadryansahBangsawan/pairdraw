import {
  BufferTarget,
  canEncodeVideo,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  VideoSample,
  VideoSampleSource,
  WebMOutputFormat
} from 'mediabunny'

import type { VideoFormat, VideoSink, VideoSinkOptions } from './sink'

/** The formats WebCodecs encodes: H.264 in MP4 and VP9 in WebM. */
export type EncodedVideoFormat = Exclude<VideoFormat, 'gif'>

const CODECS = { mp4: 'avc', webm: 'vp9' } as const satisfies Record<EncodedVideoFormat, string>

/** Seconds between key frames, so a player can seek without decoding the whole clip. */
const KEY_FRAME_INTERVAL = 2

/**
 * Whether this engine can encode `format` at this size and frame rate: through WebCodecs in a
 * browser or the desktop app's WebKit, or through an encoder registered with mediabunny.
 */
export function canRecordVideo(
  format: EncodedVideoFormat,
  width: number,
  height: number,
  fps: number
): Promise<boolean> {
  return canEncodeVideo(CODECS[format], { width, height, frameRate: fps, quality: QUALITY_HIGH })
}

/**
 * An MP4 (H.264) or WebM (VP9) encoder for recorded frames, at a constant frame rate. Adding a
 * frame waits while the encoder is busy, so frames never pile up in memory. The file is kept in
 * memory and returned whole; an MP4 puts its index first so it plays while it downloads.
 */
export async function createWebCodecsSink(
  format: EncodedVideoFormat,
  options: VideoSinkOptions
): Promise<VideoSink> {
  const target = new BufferTarget()
  const output = new Output({
    format:
      format === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target
  })
  let byteLength = 0
  const source = new VideoSampleSource({
    codec: CODECS[format],
    quality: QUALITY_HIGH,
    keyFrameInterval: KEY_FRAME_INTERVAL,
    onEncodedPacket: (packet) => {
      byteLength += packet.data.byteLength
    }
  })
  output.addVideoTrack(source, { frameRate: options.fps })
  await output.start()

  return {
    async add(image, timestampMs, durationMs) {
      const sample = new VideoSample(image.data, {
        format: 'RGBA',
        codedWidth: image.width,
        codedHeight: image.height,
        timestamp: timestampMs / 1000,
        duration: durationMs / 1000
      })
      try {
        await source.add(sample)
      } finally {
        sample.close()
      }
    },
    async finish() {
      await output.finalize()
      if (!target.buffer) throw new Error('The video encoder returned no file')
      return new Uint8Array(target.buffer)
    },
    async cancel() {
      if (output.state === 'started' || output.state === 'pending') await output.cancel()
    },
    get byteLength() {
      return byteLength
    }
  }
}
