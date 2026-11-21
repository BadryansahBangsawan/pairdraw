import { createGIFSink, MAX_GIF_FPS } from './gif'
import { VIDEO_FORMATS, type VideoFormat, type VideoSink, type VideoSinkOptions } from './sink'
import { canRecordVideo, createWebCodecsSink } from './webcodecs'

/** Each format's name as people know it. */
export const VIDEO_FORMAT_LABELS: Record<VideoFormat, string> = {
  mp4: 'MP4',
  gif: 'GIF',
  webm: 'WebM'
}

/**
 * An encoder a host passes for the formats WebCodecs cannot encode there, such as the CLI's
 * ffmpeg. It is asked only for MP4 and WebM, after WebCodecs.
 */
export interface VideoHostEncoder {
  supports(format: VideoFormat): boolean | Promise<boolean>
  create(format: VideoFormat, options: VideoSinkOptions): Promise<VideoSink>
}

/** A format this engine cannot record at the size and frame rate asked for, and why. */
export class VideoFormatError extends Error {
  override name = 'VideoFormatError'
}

/** Whether this engine, or the host's encoder, can record `format` at `width`×`height` and `fps`. */
export async function canRecordFormat(
  format: VideoFormat,
  width: number,
  height: number,
  fps: number,
  host?: VideoHostEncoder | null
): Promise<boolean> {
  if (format === 'gif') return fps <= MAX_GIF_FPS
  if (await canRecordVideo(format, width, height, fps)) return true
  return (await host?.supports(format)) ?? false
}

/** The formats this engine can record at `width`×`height` and `fps`, MP4 first. */
export async function recordableFormats(
  width: number,
  height: number,
  fps: number,
  host?: VideoHostEncoder | null
): Promise<VideoFormat[]> {
  const supported = await Promise.all(
    VIDEO_FORMATS.map((format) => canRecordFormat(format, width, height, fps, host))
  )
  return VIDEO_FORMATS.filter((_, index) => supported[index])
}

/**
 * The encoder for `format`: GIF everywhere, MP4 and WebM where WebCodecs (or an encoder registered
 * with mediabunny) can encode them, else through `host`. Throws a `VideoFormatError` naming the
 * formats that do work here.
 */
export async function openVideoSink(
  format: VideoFormat,
  options: VideoSinkOptions,
  host?: VideoHostEncoder | null
): Promise<VideoSink> {
  const { width, height, fps } = options
  if (format === 'gif' && fps <= MAX_GIF_FPS) return createGIFSink(options)
  if (format !== 'gif' && (await canRecordVideo(format, width, height, fps))) {
    return createWebCodecsSink(format, options)
  }
  if (format !== 'gif' && host && (await host.supports(format))) {
    return host.create(format, options)
  }
  if (format === 'gif') {
    throw new VideoFormatError(`GIF plays at most ${MAX_GIF_FPS} frames per second`)
  }
  const working = await recordableFormats(width, height, fps, host)
  throw new VideoFormatError(
    `${VIDEO_FORMAT_LABELS[format]} can’t be encoded here at ${width}×${height}. Formats that work here: ${working.map((entry) => VIDEO_FORMAT_LABELS[entry]).join(', ')}.`
  )
}
