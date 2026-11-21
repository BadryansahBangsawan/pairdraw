import { fromUint8Array } from 'js-base64'
import * as v from 'valibot'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import { framesOnPage, startFrame } from '#core/prototype'
import { defineTool, toolNumber } from '#core/tools/schema'
import { getVideoEncoder } from '#core/tools/video-host'

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
    format: v.optional(
      v.pipe(
        v.picklist(['mp4', 'gif', 'webm']),
        v.description(
          'File format: mp4 (H.264, default), gif, or webm (VP9). MP4 and WebM need WebCodecs, which the app has, or headlessly an ffmpeg on the path'
        )
      ),
      'mp4'
    ),
    fps: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.integer(),
          v.minValue(1),
          v.maxValue(60),
          v.description('Frames per second (default: 30, or 15 for GIF, which plays at most 50)')
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
          v.description(
            'Longest width or height in pixels (default: 1920). A GIF is capped at 960 even when this is larger'
          )
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
  execute: async (figma, args, signal) => {
    const [{ TimelineError }, video] = await Promise.all([
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
    const { exportImage, rasterCodec } = figma
    if (!exportImage || !rasterCodec) {
      return { error: 'Video export is not available in this environment' }
    }
    const render = video.exportedFrameRenderer(
      (frameId, scale) => exportImage([frameId], { scale, format: 'PNG', pageId }),
      rasterCodec
    )

    let plan
    let recorded
    try {
      plan = video.planPrototypeVideo(graph, {
        startFrameId: start.id,
        format: args.format,
        scale: args.scale,
        maxEdge: args.maxEdge,
        fps: args.fps,
        maxMs: args.maxDuration * 1000,
        tailMs: args.tail * 1000,
        clicks
      })
      recorded = await video.recordPrototypeVideo(graph, plan, render, {
        host: getVideoEncoder(graph),
        signal
      })
    } catch (error) {
      if (signal?.aborted) return { error: 'Video export was cancelled' }
      if (error instanceof TimelineError || error instanceof video.VideoFormatError) {
        return { error: error.message }
      }
      throw error
    }
    const { timeline, width, height, fps } = plan
    const { bytes, frameCount } = recorded
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
