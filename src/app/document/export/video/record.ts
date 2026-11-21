import { getCanvasKit } from '@pairdraw/core/canvaskit'
import { createCanvasKitRasterCodec, type RasterCodec } from '@pairdraw/core/io/formats/raster'
import {
  canRecordFormat,
  MAX_VIDEO_EDGE,
  planPrototypeVideo,
  recordPrototypeVideo,
  VIDEO_DEFAULTS,
  VIDEO_FORMAT_LABELS,
  VIDEO_FORMATS,
  VIDEO_MIME_TYPES,
  type PrototypeVideoPlan,
  type RenderFrame,
  type VideoFormat
} from '@pairdraw/core/io/formats/video'
import { startFrame, TimelineError } from '@pairdraw/core/prototype'

import { saveExportedFile } from '@/app/document/export/files'
import { downloadBlob } from '@/app/document/io/browser'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * How far a long-edge preset may enlarge a small frame to reach its edge. Frames are drawn from
 * vectors, so they stay sharp; the edge itself is the real limit.
 */
const FIT_EDGE_SCALE = 16

/**
 * The sizes the dialog offers: the start frame at 1× or 2×, or its long edge fitted. A GIF stays
 * within `MAX_GIF_EDGE` whichever is chosen.
 */
export const VIDEO_SIZE_PRESETS = {
  '1x': { scale: 1, maxEdge: MAX_VIDEO_EDGE },
  '2x': { scale: 2, maxEdge: MAX_VIDEO_EDGE },
  '1920': { scale: FIT_EDGE_SCALE, maxEdge: 1920 },
  '1280': { scale: FIT_EDGE_SCALE, maxEdge: 1280 }
} as const

export type VideoSizePreset = keyof typeof VIDEO_SIZE_PRESETS

/** The presets in the order the dialog lists them. */
export const VIDEO_SIZE_PRESET_IDS: readonly VideoSizePreset[] = ['1x', '2x', '1920', '1280']

/** The choices the dialog holds. */
export interface VideoExportSettings {
  startFrameId: string
  format: VideoFormat
  size: VideoSizePreset
  fps: number
  maxSeconds: number
}

/** What the dialog says a recording will hold, or why there is nothing to record. */
export type VideoExportPlan =
  | {
      kind: 'ready'
      steps: number
      durationMs: number
      width: number
      height: number
      loops: boolean
      truncated: boolean
    }
  | { kind: 'nothing-to-follow'; frame: string }
  | { kind: 'invalid'; message: string }

const DEFAULT_MAX_SECONDS = 30

/**
 * The dialog's first choices: the frame Play would start from, as an MP4 at the frame's own size;
 * null when the page has no frame to play.
 */
export function videoExportDefaults(store: EditorStore): VideoExportSettings | null {
  const startFrameId = startFrame(store.graph, store.state.currentPageId, store.state.selectedIds)
  if (!startFrameId) return null
  return {
    startFrameId,
    format: 'mp4',
    size: '1x',
    fps: VIDEO_DEFAULTS.mp4.fps,
    maxSeconds: DEFAULT_MAX_SECONDS
  }
}

function plan(store: EditorStore, settings: VideoExportSettings): PrototypeVideoPlan {
  const size = VIDEO_SIZE_PRESETS[settings.size]
  return planPrototypeVideo(store.graph, {
    startFrameId: settings.startFrameId,
    format: settings.format,
    scale: size.scale,
    maxEdge: size.maxEdge,
    fps: settings.fps,
    maxMs: settings.maxSeconds * 1000
  })
}

/** Plans the recording the settings describe, as the dialog's summary shows it. */
export function planVideoExport(
  store: EditorStore,
  settings: VideoExportSettings
): VideoExportPlan {
  try {
    const { timeline, width, height } = plan(store, settings)
    return {
      kind: 'ready',
      steps: timeline.steps.length,
      durationMs: timeline.durationMs,
      width,
      height,
      loops: timeline.loops,
      truncated: timeline.truncated
    }
  } catch (error) {
    if (!(error instanceof TimelineError)) throw error
    if (error.reason === 'nothing-to-follow') {
      return {
        kind: 'nothing-to-follow',
        frame: store.graph.getNode(settings.startFrameId)?.name ?? ''
      }
    }
    return { kind: 'invalid', message: error.message }
  }
}

/**
 * The formats this engine can record the settings in, each checked as choosing it would plan it:
 * at its own size (even for MP4 and WebM) and at the frame rate it would start with.
 */
export async function videoFormatsHere(
  store: EditorStore,
  settings: VideoExportSettings
): Promise<VideoFormat[]> {
  const available = await Promise.all(
    VIDEO_FORMATS.map(async (format) => {
      const fps = format === settings.format ? settings.fps : VIDEO_DEFAULTS[format].fps
      try {
        const { width, height } = plan(store, { ...settings, format, fps })
        return await canRecordFormat(format, width, height, fps)
      } catch (error) {
        if (error instanceof TimelineError) return false
        throw error
      }
    })
  )
  return VIDEO_FORMATS.filter((_, index) => available[index])
}

/**
 * Records the prototype as the settings describe, drawing each screen with the document's own
 * renderer, and saves the file where the person picks. Resolves `false` when they cancel the save;
 * aborting `signal` stops the recording with an `AbortError`.
 */
export async function exportPrototypeVideo(
  store: EditorStore,
  settings: VideoExportSettings,
  options: { signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {}
): Promise<boolean> {
  const pageId = store.state.currentPageId
  // CanvasKit loads only once there is something to draw, after the encoder has opened.
  let codec: RasterCodec | null = null
  const render: RenderFrame = async (frameId, scale) => {
    codec ??= createCanvasKitRasterCodec(store.renderer?.ck ?? (await getCanvasKit()))
    const png = await store.renderExportImage([frameId], scale, 'PNG', pageId)
    return png ? codec.decode(png) : null
  }
  const { bytes } = await recordPrototypeVideo(store.graph, plan(store, settings), render, options)
  const name = store.graph.getNode(settings.startFrameId)?.name ?? 'Prototype'
  return saveExportedFile(
    bytes,
    `${name}.${settings.format}`,
    VIDEO_FORMAT_LABELS[settings.format],
    `.${settings.format}`,
    VIDEO_MIME_TYPES[settings.format],
    downloadBlob
  )
}
