import { describe, expect, test } from 'bun:test'

import { setPageBackgrounds } from '@pairdraw/core/figma-api'
import type { RGBAImage } from '@pairdraw/core/io/formats/raster'
import {
  filledImage,
  recordPrototype,
  type RenderFrame,
  type VideoSink
} from '@pairdraw/core/io/formats/video'
import { planTimeline } from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction } from '@pairdraw/scene-graph'

const PAGE = { r: 0, g: 0, b: 0, a: 1 }

interface Added {
  image: RGBAImage
  timestampMs: number
  durationMs: number
}

function recordingSink(): VideoSink & { frames: Added[]; cancelled: () => boolean } {
  const frames: Added[] = []
  let cancelled = false
  return {
    frames,
    cancelled: () => cancelled,
    cancel: () => {
      cancelled = true
      return Promise.resolve()
    },
    add: (image, timestampMs, durationMs) => {
      frames.push({ image, timestampMs, durationMs })
      return Promise.resolve()
    },
    finish: () => Promise.resolve(new Uint8Array([1, 2, 3])),
    byteLength: 0
  }
}

/** Draws every frame as a flat color named by the frame, and counts the renders. */
function flatRenderer(graph: SceneGraph, colors: Record<string, number>) {
  const calls: string[] = []
  const render: RenderFrame = (frameId, scale) => {
    calls.push(frameId)
    const bounds = graph.getAbsoluteBounds(frameId)
    const value = colors[frameId] ?? 0
    return Promise.resolve(
      filledImage(Math.ceil(bounds.width * scale), Math.ceil(bounds.height * scale), {
        r: value / 255,
        g: value / 255,
        b: value / 255,
        a: 1
      })
    )
  }
  return { render, calls }
}

function after(seconds: number, action: PrototypeReaction['actions'][number]): PrototypeReaction {
  return {
    id: `t-${seconds}`,
    trigger: { type: 'AFTER_TIMEOUT', delay: seconds },
    actions: [action]
  }
}

function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const page = graph.getNode(pageId)
  if (!page) throw new Error('The graph has no page')
  setPageBackgrounds(graph, page, [
    { type: 'SOLID', color: PAGE, opacity: 1, visible: true, blendMode: 'NORMAL' }
  ])
  const a = graph.createNode('FRAME', pageId, { name: 'A', x: 0, y: 0, width: 40, height: 20 })
  const b = graph.createNode('FRAME', pageId, { name: 'B', x: 100, y: 0, width: 20, height: 20 })
  return { graph, a: a.id, b: b.id }
}

/** The gray value of a pixel, which the flat renderer writes to every channel. */
function grayAt(image: RGBAImage, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4]
}

describe('recording a prototype', () => {
  test('renders each screen once and samples crossfades frame by frame', async () => {
    const { graph, a, b } = setup()
    graph.updateNode(a, {
      prototypeReactions: [
        after(0.3, {
          type: 'NODE',
          nodeId: b,
          navigation: 'NAVIGATE',
          transition: { type: 'DISSOLVE', duration: 0.2 },
          overlayPosition: 'CENTER'
        })
      ]
    })
    const timeline = planTimeline(graph, { startFrameId: a, maxMs: 10_000, tailMs: 200 })
    const { render, calls } = flatRenderer(graph, { [a]: 200, [b]: 100 })
    const sink = recordingSink()

    const result = await recordPrototype(graph, timeline, render, sink, {
      width: 4,
      height: 2,
      fps: 10
    })

    expect(result.frameCount).toBe(7)
    expect([...result.bytes]).toEqual([1, 2, 3])
    expect(calls).toEqual([a, b])
    expect(sink.frames.map((frame) => frame.timestampMs)).toEqual([0, 100, 200, 300, 400, 500, 600])
    // The held start screen is one image passed again, which a GIF stores once.
    expect(sink.frames[1].image).toBe(sink.frames[0].image)
    expect(grayAt(sink.frames[0].image, 0, 0)).toBe(200)
    // Half way through the dissolve (400 ms) the eased share of B is 0.5 by x → 0.684 by ease-out.
    const midway = sink.frames[4].image
    expect(grayAt(midway, 1, 0)).toBe(Math.round(200 + (100 - 200) * 0.6847))
    // B is square, so it is letterboxed into the wide start frame's box with the page behind.
    const last = sink.frames[6].image
    expect([
      grayAt(last, 0, 0),
      grayAt(last, 1, 0),
      grayAt(last, 2, 1),
      grayAt(last, 3, 1)
    ]).toEqual([0, 100, 100, 0])
  })

  test('dims the screen under an overlay and centres the overlay on it', async () => {
    const { graph, a, b } = setup()
    graph.updateNode(a, {
      prototypeReactions: [
        after(0.1, {
          type: 'NODE',
          nodeId: b,
          navigation: 'OVERLAY',
          transition: { type: 'INSTANT', duration: 0 },
          overlayPosition: 'CENTER'
        })
      ]
    })
    graph.updateNode(b, { width: 10, height: 10 })
    const timeline = planTimeline(graph, { startFrameId: a, maxMs: 10_000, tailMs: 100 })
    const { render } = flatRenderer(graph, { [a]: 200, [b]: 100 })
    const sink = recordingSink()

    await recordPrototype(graph, timeline, render, sink, { width: 4, height: 2, fps: 10 })

    const overlaid = sink.frames[1].image
    // 200 dimmed by 40% is 120; the 1×1 overlay sits at the centre of the 4×2 frame.
    expect(grayAt(overlaid, 0, 0)).toBe(120)
    expect(grayAt(overlaid, 1, 0)).toBe(120)
    expect(grayAt(overlaid, 2, 1)).toBe(100)
  })

  test('ends on the last screen even when the flow leaves it no time', async () => {
    const { graph, a, b } = setup()
    graph.updateNode(a, {
      prototypeReactions: [
        after(0.3, {
          type: 'NODE',
          nodeId: b,
          navigation: 'NAVIGATE',
          transition: { type: 'INSTANT', duration: 0 },
          overlayPosition: 'CENTER'
        })
      ]
    })
    const timeline = planTimeline(graph, { startFrameId: a, maxMs: 10_000, tailMs: 0 })
    const { render } = flatRenderer(graph, { [a]: 200, [b]: 100 })
    const sink = recordingSink()

    await recordPrototype(graph, timeline, render, sink, { width: 4, height: 2, fps: 10 })

    expect(sink.frames.map((frame) => grayAt(frame.image, 1, 0))).toEqual([200, 200, 100])
  })

  test('stops when cancelled', async () => {
    const { graph, a, b } = setup()
    graph.updateNode(a, {
      prototypeReactions: [
        after(1, {
          type: 'NODE',
          nodeId: b,
          navigation: 'NAVIGATE',
          transition: { type: 'INSTANT', duration: 0 },
          overlayPosition: 'CENTER'
        })
      ]
    })
    const timeline = planTimeline(graph, { startFrameId: a, maxMs: 10_000, tailMs: 100 })
    const controller = new AbortController()
    const sink = recordingSink()
    const { render } = flatRenderer(graph, {})

    const recording = recordPrototype(graph, timeline, render, sink, {
      width: 4,
      height: 2,
      fps: 10,
      signal: controller.signal,
      onProgress: (done) => {
        if (done === 3) controller.abort()
      }
    })

    await expect(recording).rejects.toThrow()
    expect(sink.frames.length).toBeLessThan(5)
    // The encoder is released rather than left holding frames it will never finish.
    expect(sink.cancelled()).toBe(true)
  })
})
