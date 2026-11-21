import { createGIFSink, MAX_GIF_FPS } from './gif'
import { VIDEO_FORMATS, type VideoFormat, type VideoSink, type VideoSinkOptions } from './sink'
import { canRecordVideo, createWebCodecsSink } from './webcodecs'

/** Each format's name as people know it. */
export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  mp4: 'MP4',
  gif: 'GIF',
  webm: 'WebM'
}

/** A format this engine cannot record at the size and frame rate asked for, and why. */
export class VideoFormatError extends Error {
  override name = 'VideoFormatError'
}

/** Whether this engine can record `format` at `width`×`height` and `fps`. */
export function canRecordFormat(
  format: VideoFormat,
  width: number,
  height: number,
  fps: number
): Promise<boolean> {
  if (format === 'gif') return Promise.resolve(fps <= MAX_GIF_FPS)
  return canRecordVideo(format, width, height, fps)
}

/** The formats this engine can record at `width`×`height` and `fps`, MP4 first. */
export async function recordableFormats(
  width: number,
  height: number,
  fps: number
): Promise<VideoFormat[]> {
  const supported = await Promise.all(
    VIDEO_FORMATS.map((format) => canRecordFormat(format, width, height, fps))
  )
  return VIDEO_FORMATS.filter((_, index) => supported[index])
}

/**
 * The encoder for `format`: GIF everywhere, MP4 and WebM where WebCodecs (or a registered
 * encoder) can encode them. Throws a `VideoFormatError` naming the formats that do work here.
 */
export async function openVideoSink(
  format: VideoFormat,
  options: VideoSinkOptions
): Promise<VideoSink> {
  const { width, height, fps } = options
  if (await canRecordFormat(format, width, height, fps)) {
    return format === 'gif' ? createGIFSink(options) : createWebCodecsSink(format, options)
  }
  if (format === 'gif') {
    throw new VideoFormatError(`GIF plays at most ${MAX_GIF_FPS} frames per second`)
  }
  const working = await recordableFormats(width, height, fps)
  throw new VideoFormatError(
    `${VIDEO_FORMAT_LABELS[format]} can’t be encoded here at ${width}×${height}. Formats that work here: ${working.map((entry) => VIDEO_FORMAT_LABELS[entry]).join(', ')}.`
  )
}
