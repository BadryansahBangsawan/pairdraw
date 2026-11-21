import type { SceneGraph } from '@pairdraw/scene-graph'

import type { RasterCodec } from '#core/io/formats/raster'
import { planTimeline, TimelineError, type Timeline, type TimelineClick } from '#core/prototype'

import { openVideoSink, type VideoHostEncoder } from './formats'
import { recordPrototype, type RecordResult, type RenderFrame } from './record'
import type { VideoFormat } from './sink'
import { MAX_VIDEO_BYTES, MAX_VIDEO_EDGE, videoSize } from './size'

/**
 * The longest edge a GIF may have. Every GIF frame is quantized on its own and a held screen is
 * stored whole, so a larger GIF costs far more memory and time than it is worth.
 */
export const MAX_GIF_EDGE = 960

/** Frame rates and long edges each format records at unless asked otherwise. */
export const VIDEO_DEFAULTS: Record<VideoFormat, { fps: number; maxEdge: number }> = {
  mp4: { fps: 30, maxEdge: 1920 },
  gif: { fps: 15, maxEdge: MAX_GIF_EDGE },
  webm: { fps: 30, maxEdge: 1920 }
}

/** How long the last screen stays when the flow ends, unless asked otherwise. */
export const DEFAULT_VIDEO_TAIL_MS = 1000

export interface PrototypeVideoOptions {
  startFrameId: string
  format: VideoFormat
  /** The start frame's size in the video, before `maxEdge` fits it. */
  scale: number
  maxEdge?: number
  fps?: number
  maxMs: number
  tailMs?: number
  clicks?: readonly TimelineClick[]
}

/** What a recording will hold: the planned timeline, and the video's size and frame rate. */
export interface PrototypeVideoPlan {
  format: VideoFormat
  timeline: Timeline
  width: number
  height: number
  fps: number
}

/**
 * Plans a recording of the prototype from `startFrameId`: its timeline, and a size fitted from the
 * start frame (even for MP4 and WebM). Throws a `TimelineError` naming what cannot be played.
 */
export function planPrototypeVideo(
  graph: SceneGraph,
  options: PrototypeVideoOptions
): PrototypeVideoPlan {
  const start = graph.getNode(options.startFrameId)
  if (!start) throw new TimelineError(`No frame with ID '${options.startFrameId}'`)
  const timeline = planTimeline(graph, {
    startFrameId: start.id,
    clicks: options.clicks,
    maxMs: options.maxMs,
    tailMs: options.tailMs ?? DEFAULT_VIDEO_TAIL_MS
  })
  const defaults = VIDEO_DEFAULTS[options.format]
  const { width, height } = videoSize(start.width, start.height, {
    scale: options.scale,
    maxEdge: Math.min(
      options.maxEdge ?? defaults.maxEdge,
      options.format === 'gif' ? MAX_GIF_EDGE : MAX_VIDEO_EDGE
    ),
    even: options.format !== 'gif'
  })
  return { format: options.format, timeline, width, height, fps: options.fps ?? defaults.fps }
}

/**
 * Records a planned video with `render` drawing its frames. Throws a `VideoFormatError` when this
 * engine cannot encode the format, and stops at `MAX_VIDEO_BYTES` or when `signal` aborts.
 */
export async function recordPrototypeVideo(
  graph: SceneGraph,
  plan: PrototypeVideoPlan,
  render: RenderFrame,
  options: {
    signal?: AbortSignal
    onProgress?: (done: number, total: number) => void
    /** The host's encoder for what WebCodecs cannot encode there, such as the CLI's ffmpeg. */
    host?: VideoHostEncoder | null
  } = {}
): Promise<RecordResult> {
  const { width, height, fps, timeline } = plan
  const { host, ...progress } = options
  const sink = await openVideoSink(plan.format, { width, height, fps, loops: timeline.loops }, host)
  return recordPrototype(graph, timeline, render, sink, {
    width,
    height,
    fps,
    maxBytes: MAX_VIDEO_BYTES,
    ...progress
  })
}

/**
 * Draws frames through a host's raster export, as PNG, and decodes them to pixels; the app and the
 * CLI each export through their own renderer.
 */
export function exportedFrameRenderer(
  exportPNG: (frameId: string, scale: number) => Promise<Uint8Array | null>,
  codec: RasterCodec
): RenderFrame {
  return async (frameId, scale) => {
    const png = await exportPNG(frameId, scale)
    return png ? codec.decode(png) : null
  }
}
