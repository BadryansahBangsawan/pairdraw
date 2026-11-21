import { fromUint8Array } from 'js-base64'
import * as v from 'valibot'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import type { FigmaAPI } from '#core/figma-api'
import type { RenderFrame } from '#core/io/formats/video'
import { framesOnPage, startFrame } from '#core/prototype'
import { defineTool, toolNumber } from '#core/tools/schema'

/** Frame rates and long edges a format records at unless the call names its own. */
const DEFAULTS = { gif: { fps: 15, maxEdge: 960 } } as const

/** A top-level frame of the page by ID or name. */
function pageFrame(graph: SceneGraph, pageId: string, ref: string): SceneNode | null {
  const frames = framesOnPage(graph, pageId)
  return (
    frames.find((frame) => frame.id === ref) ?? frames.find((frame) => frame.name === ref) ?? null
  )
}

/** A layer on the page by ID or name, the first in layer order when names repeat. */
function pageNode(graph: SceneGraph, pageId: string, ref: string): SceneNode | null {
  const byId = graph.getNode(ref)
  if (byId) return byId
  const pending = [...graph.getChildren(pageId)]
  for (let node = pending.shift(); node; node = pending.shift()) {
    if (node.name === ref) return node
    pending.unshift(...graph.getChildren(node.id))
  }
  return null
}

/** Draws a frame through the host's raster export and decodes it to pixels. */
function hostRenderer(figma: FigmaAPI, pageId: string): RenderFrame | null {
  const { exportImage, rasterCodec } = figma
  if (!exportImage || !rasterCodec) return null
  return async (frameId, scale) => {
    const png = await exportImage([frameId], { scale, format: 'PNG', pageId })
    return png ? rasterCodec.decode(png) : null
  }
}

function seconds(ms: number): number {
  return Math.round(ms) / 1000
}

export const exportVideo = defineTool({
  name: 'export_video',
  description:
    'Record a prototype as a video, as Play shows it: start at a top-level frame, follow its After delay interactions (and optional scripted clicks) with their Dissolve transitions on a virtual clock, and return the file as base64 with the steps it recorded. ' +
    'The clip ends when play returns to the start frame (loops: true), when nothing else happens (the last frame is held `tail` seconds), or at maxDuration (truncated: true). Pass path to write the file instead of returning it.',
  execution: { kind: 'async', mutation: 'none', long: true },
  exposure: { webmcp: false },
  input: v.strictObject({
    start: v.optional(
      v.pipe(
        v.string(),
        v.description(
          'Top-level frame ID or name to start from (default: the selected frame, or the page’s first frame)'
        )
      )
    ),
    format: v.optional(v.pipe(v.picklist(['gif']), v.description('File format: gif')), 'gif'),
    fps: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.integer(),
          v.minValue(1),
          v.maxValue(50),
          v.description('Frames per second (default: 15 for GIF)')
        )
      )
    ),
    scale: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(0.1),
          v.maxValue(4),
          v.description('Size of the start frame in the video (default: 1)')
        )
      ),
      1
    ),
    maxEdge: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(64),
          v.maxValue(3840),
          v.description('Longest width or height in pixels (default: 960 for GIF)')
        )
      )
    ),
    maxDuration: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(1),
          v.maxValue(120),
          v.description('Seconds the clip may last at most (default: 30)')
        )
      ),
      30
    ),
    tail: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(0),
          v.maxValue(10),
          v.description('Seconds the last frame stays when the flow ends (default: 1)')
        )
      ),
      1
    ),
    clicks: v.optional(
      v.pipe(
        v.array(
          v.strictObject({
            at: toolNumber(
              v.pipe(v.number(), v.minValue(0), v.description('Seconds from the start'))
            ),
            node: v.pipe(v.string(), v.description('Layer ID or name to click'))
          })
        ),
        v.description(
          'Clicks to run as play goes, each on a layer of the frame shown at that time, as a click in Play'
        )
      )
    ),
    path: v.optional(
      v.pipe(
        v.string(),
        v.description(
          'Write the video to this path instead of returning it (requires PAIRDRAW_MCP_ROOT)'
        )
      )
    )
  }),
  execute: async (figma, args) => {
    const [{ planTimeline, TimelineError }, video] = await Promise.all([
      import('#core/prototype'),
      import('#core/io/formats/video')
    ])
    const graph = figma.graph
    const pageId = figma.currentPageId
    const selected = new Set(figma.currentPage.selection.map((node) => node.id))
    const startId = args.start
      ? pageFrame(graph, pageId, args.start)?.id
      : startFrame(graph, pageId, selected)
    const start = startId ? graph.getNode(startId) : undefined
    if (!start) {
      return {
        error: args.start
          ? `No top-level frame named or with ID '${args.start}' on this page`
          : 'This page has no frames to play'
      }
    }
    const clicks = []
    for (const click of args.clicks ?? []) {
      const node = pageNode(graph, pageId, click.node)
      if (!node) return { error: `No layer named or with ID '${click.node}' on this page` }
      clicks.push({ atMs: click.at * 1000, nodeId: node.id })
    }
    const render = hostRenderer(figma, pageId)
    if (!render) return { error: 'Video export is not available in this environment' }

    let timeline
    try {
      timeline = planTimeline(graph, {
        startFrameId: start.id,
        clicks,
        maxMs: args.maxDuration * 1000,
        tailMs: args.tail * 1000
      })
    } catch (error) {
      if (error instanceof TimelineError) return { error: error.message }
      throw error
    }

    const defaults = DEFAULTS[args.format]
    const fps = args.fps ?? defaults.fps
    const { width, height } = video.videoSize(start.width, start.height, {
      scale: args.scale,
      maxEdge: args.maxEdge ?? defaults.maxEdge,
      even: false
    })
    const sink = video.createGIFSink({ width, height, fps, loops: timeline.loops })
    const { bytes, frameCount } = await video.recordPrototype(graph, timeline, render, sink, {
      width,
      height,
      fps,
      maxBytes: video.MAX_VIDEO_BYTES
    })
    return {
      mimeType: video.VIDEO_MIME_TYPES[args.format],
      base64: fromUint8Array(bytes),
      byteLength: bytes.length,
      width,
      height,
      fps,
      durationMs: timeline.durationMs,
      frameCount,
      loops: timeline.loops,
      truncated: timeline.truncated,
      steps: timeline.steps.map((step) => ({
        at: seconds(step.atMs),
        frame: graph.getNode(step.frameId)?.name ?? step.frameId,
        frameId: step.frameId,
        trigger: step.trigger,
        transition: step.transition
      }))
    }
  }
})
