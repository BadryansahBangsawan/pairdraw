import type { PrototypeOverlayPositionType, SceneGraph } from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

import { getPageColor } from '#core/figma-api/page-backgrounds'
import { computeContentBounds, type RGBAImage } from '#core/io/formats/raster'
import {
  createSmartAnimation,
  frameAt,
  sessionDrawKey,
  shownFrame,
  type PlaySession,
  type SmartAnimation,
  type Timeline,
  type TimelineSmartSegment
} from '#core/prototype'

import { crossfade, dim, drawOver, filledImage } from './composite'
import type { VideoSink } from './sink'

/**
 * Draws one top-level frame at `scale` as pixels, or null when it cannot be drawn: from the
 * document, or from `graph`, a Smart animate's copy of the frame posed at one moment.
 */
export type RenderFrame = (
  frameId: string,
  scale: number,
  graph?: SceneGraph
) => Promise<RGBAImage | null>

export interface RecordOptions {
  width: number
  height: number
  fps: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
  /** The most bytes the file may grow to before recording stops. */
  maxBytes?: number
}

export interface RecordResult {
  bytes: Uint8Array
  frameCount: number
}

/** How dark the screen under an open overlay is drawn, as the player's scrim. */
const OVERLAY_SCRIM = 0.4
/** Screens kept drawn at once: the two of a crossfade and the one after it. */
const CACHED_SCREENS = 3
/** Frames recorded between yields to the event loop, so the app keeps drawing. */
const FRAMES_PER_YIELD = 4

/** Where an overlay starts along one axis of the screen: its start, its end, or centred. */
function alignOnAxis(start: number, size: number, overlay: number, edge: string): number {
  if (edge === 'TOP' || edge === 'LEFT') return start
  if (edge === 'BOTTOM' || edge === 'RIGHT') return start + size - overlay
  return start + (size - overlay) / 2
}

/** Where an overlay of `width`×`height` sits on the screen `base`, as Figma positions overlays. */
function overlayOrigin(
  base: Rect,
  width: number,
  height: number,
  position: PrototypeOverlayPositionType
): Vector {
  const [vertical, horizontal] = position === 'CENTER' ? ['CENTER', 'CENTER'] : position.split('_')
  return {
    x: alignOnAxis(base.x, base.width, width, horizontal),
    y: alignOnAxis(base.y, base.height, height, vertical)
  }
}

function pageOf(graph: SceneGraph, frameId: string) {
  const parentId = graph.getNode(frameId)?.parentId
  return parentId ? graph.getNode(parentId) : undefined
}

/**
 * Draws the screens a timeline shows, each composited once onto a `width`×`height` canvas the
 * color of the page, the base frame fitted and centred as the player fits it, overlays over a scrim.
 */
function createScreens(
  graph: SceneGraph,
  timeline: Timeline,
  render: RenderFrame,
  width: number,
  height: number
) {
  const firstSegment = timeline.segments.at(0)
  const startId = firstSegment?.kind === 'hold' ? firstSegment.session.frameId : null
  const background = getPageColor(startId ? pageOf(graph, startId) : undefined)
  const cache = new Map<string, RGBAImage>()

  async function drawFrame(
    target: RGBAImage,
    frameId: string,
    scale: number,
    at: Vector,
    source = graph
  ) {
    const image = await render(frameId, scale, source === graph ? undefined : source)
    const node = source.getNode(frameId)
    if (!image || !node) throw new Error(`'${node?.name ?? frameId}' could not be drawn`)
    const box = source.getAbsoluteBounds(frameId)
    // A shadow or a layer past the frame's edge widens what is drawn; the frame stays in place.
    const content = computeContentBounds(source, [frameId]) ?? {
      minX: box.x,
      minY: box.y,
      maxX: box.x + box.width,
      maxY: box.y + box.height
    }
    drawOver(
      target,
      image,
      Math.round(at.x + (content.minX - box.x) * scale),
      Math.round(at.y + (content.minY - box.y) * scale)
    )
  }

  /** The screen `session` shows, its base frame drawn from `base` when given. */
  async function compose(session: PlaySession, base?: SceneGraph): Promise<RGBAImage> {
    const target = filledImage(width, height, background)
    const box = graph.getAbsoluteBounds(session.frameId)
    const scale = Math.min(width / box.width, height / box.height)
    const fitted: Rect = {
      x: (width - box.width * scale) / 2,
      y: (height - box.height * scale) / 2,
      width: box.width * scale,
      height: box.height * scale
    }
    await drawFrame(target, session.frameId, scale, fitted, base)
    if (session.overlays.length > 0) dim(target, OVERLAY_SCRIM)
    for (const overlayId of session.overlays) {
      const overlay = graph.getAbsoluteBounds(overlayId)
      const origin = overlayOrigin(
        fitted,
        overlay.width * scale,
        overlay.height * scale,
        timeline.overlayPositions[overlayId] ?? 'CENTER'
      )
      await drawFrame(target, overlayId, scale, origin)
    }
    return target
  }

  // The Smart animate being recorded, made once and posed for each of its frames.
  let animating: { segment: TimelineSmartSegment; animation: SmartAnimation } | null = null

  /** A Smart animate `progress` of the way through its time, drawn from its posed copy. */
  async function animated(segment: TimelineSmartSegment, progress: number): Promise<RGBAImage> {
    if (animating?.segment !== segment) {
      const from = { graph, rootId: shownFrame(segment.from) }
      const to = { graph, rootId: segment.to.frameId }
      animating = { segment, animation: createSmartAnimation(from, to, segment.easing) }
    }
    animating.animation.seek(progress)
    return compose(segment.to, animating.animation.graph)
  }

  async function screen(session: PlaySession): Promise<RGBAImage> {
    const key = sessionDrawKey(session)
    const cached = cache.get(key)
    if (cached) {
      // Most recently used last, so the oldest screen is the one dropped.
      cache.delete(key)
      cache.set(key, cached)
      return cached
    }
    const drawn = await compose(session)
    cache.set(key, drawn)
    for (const old of cache.keys()) {
      if (cache.size <= CACHED_SCREENS) break
      cache.delete(old)
    }
    return drawn
  }

  return { screen, animated }
}

/**
 * Records a planned timeline frame by frame at `fps` into `sink` and returns the file. Each screen
 * is drawn once and reused while it holds, so a held screen reaches the sink as the same image; a
 * crossfade blends its two screens per frame, and a Smart animate draws its animation posed at
 * each frame, as the player poses it. Cancelling through `signal` stops before the next
 * frame, and passing `maxBytes` stops with an error naming the limit.
 */
export async function recordPrototype(
  graph: SceneGraph,
  timeline: Timeline,
  render: RenderFrame,
  sink: VideoSink,
  options: RecordOptions
): Promise<RecordResult> {
  const { screen, animated } = createScreens(graph, timeline, render, options.width, options.height)
  const frameMs = 1000 / options.fps
  const frameCount = Math.max(1, Math.round(timeline.durationMs / frameMs))
  try {
    for (let index = 0; index < frameCount; index++) {
      options.signal?.throwIfAborted()
      // A clip that does not loop ends on its last screen, even one the flow leaves no time.
      const last = index === frameCount - 1 && !timeline.loops
      const shown = frameAt(timeline, last ? timeline.durationMs : index * frameMs)
      let image: RGBAImage
      if ('session' in shown) image = await screen(shown.session)
      else if ('smart' in shown) image = await animated(shown.smart, shown.progress)
      else image = crossfade(await screen(shown.from), await screen(shown.to), shown.mix)
      await sink.add(image, index * frameMs, frameMs)
      if (options.maxBytes !== undefined && sink.byteLength > options.maxBytes) {
        throw new Error(
          `The video passed ${Math.round(options.maxBytes / 1024 / 1024)} MB; lower the size or frame rate`
        )
      }
      options.onProgress?.(index + 1, frameCount)
      if ((index + 1) % FRAMES_PER_YIELD === 0) {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0)
        })
      }
    }
    options.signal?.throwIfAborted()
    return { bytes: await sink.finish(), frameCount }
  } catch (error) {
    await sink.cancel()
    throw error
  }
}
