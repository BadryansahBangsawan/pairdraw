import type { RGBAImage } from '#core/io/formats/raster'

/** The video formats a prototype records to. */
export const VIDEO_FORMATS = ['mp4', 'gif', 'webm'] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

export const VIDEO_MIME_TYPES: Record<VideoFormat, string> = {
  mp4: 'video/mp4',
  gif: 'image/gif',
  webm: 'video/webm'
}

export interface VideoSinkOptions {
  width: number
  height: number
  fps: number
  /** The clip ends where it started, so a GIF repeats forever. */
  loops: boolean
}

/**
 * Where recorded frames go: an encoder that takes them in time order and returns the file. A
 * frame passed again as the same image is the screen held still, which a format may store once.
 */
export interface VideoSink {
  add(image: RGBAImage, timestampMs: number, durationMs: number): Promise<void>
  finish(): Promise<Uint8Array>
  /** Bytes encoded so far, which the recorder caps. */
  readonly byteLength: number
}
