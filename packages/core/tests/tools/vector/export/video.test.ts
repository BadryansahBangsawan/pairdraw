import { describe, expect, test } from 'bun:test'

import { toUint8Array } from 'js-base64'

import { runTool, setupToolTest } from '#core-tests/helpers/tools'

import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit
} from '@pairdraw/core/io/formats/raster'
import type { PrototypeReaction } from '@pairdraw/scene-graph'

const ck = await initCanvasKit()

function solid(r: number, g: number, b: number) {
  return [
    { type: 'SOLID' as const, color: { r, g, b, a: 1 }, opacity: 1, visible: true, blendMode: 'NORMAL' as const }
  ]
}

function after(seconds: number, nodeId: string, dissolve = 0): PrototypeReaction {
  return {
    id: `t-${nodeId}`,
    trigger: { type: 'AFTER_TIMEOUT', delay: seconds },
    actions: [
      {
        type: 'NODE',
        nodeId,
        navigation: 'NAVIGATE',
        transition: { type: dissolve > 0 ? 'DISSOLVE' : 'INSTANT', duration: dissolve },
        overlayPosition: 'CENTER'
      }
    ]
  }
}

/** Three 40×20 frames, red then green then blue, joined by After delays. */
function setup() {
  const { graph, figma } = setupToolTest()
  const pageId = figma.currentPageId
  figma.exportImage = (nodeIds, options) =>
    headlessRenderNodes(graph, options.pageId ?? pageId, nodeIds, options, ck)
  figma.rasterCodec = createCanvasKitRasterCodec(ck)
  const frame = (name: string, x: number, fills: ReturnType<typeof solid>) =>
    graph.createNode('FRAME', pageId, { name, x, y: 0, width: 40, height: 20, fills }).id
  const red = frame('Red', 0, solid(1, 0, 0))
  const green = frame('Green', 100, solid(0, 1, 0))
  const blue = frame('Blue', 200, solid(0, 0, 1))
  graph.updateNode(red, { prototypeReactions: [after(0.2, green, 0.1)] })
  graph.updateNode(green, { prototypeReactions: [after(0.2, blue)] })
  return { graph, figma, red, green, blue }
}

describe('export_video', () => {
  test('records the After delay chain from the start frame as a GIF', async () => {
    const { figma, green, blue } = setup()

    const result = await runTool(figma, 'export_video', {
      start: 'Red',
      format: 'gif',
      fps: 10,
      tail: 0.2
    })

    expect(result).toMatchObject({
      mimeType: 'image/gif',
      width: 40,
      height: 20,
      fps: 10,
      durationMs: 700,
      frameCount: 7,
      loops: false,
      truncated: false,
      steps: [
        { at: 0.2, frame: 'Green', frameId: green, trigger: 'AFTER_TIMEOUT', transition: 'DISSOLVE' },
        { at: 0.5, frame: 'Blue', frameId: blue, trigger: 'AFTER_TIMEOUT', transition: 'INSTANT' }
      ]
    })
    const { base64, byteLength } = result as { base64: string; byteLength: number }
    const bytes = toUint8Array(base64)
    expect(bytes.length).toBe(byteLength)
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe('GIF89a')
  })

  test('fits the long edge into maxEdge', async () => {
    const { figma } = setup()

    const result = await runTool(figma, 'export_video', {
      start: 'Red',
      format: 'gif',
      fps: 10,
      maxEdge: 64,
      scale: 4
    })

    expect(result).toMatchObject({ width: 64, height: 32 })
  })

  test('names the frame when there is nothing to follow', async () => {
    const { figma } = setup()

    expect(await runTool(figma, 'export_video', { start: 'Blue', format: 'gif' })).toEqual({
      error: "'Blue' has no After delay interaction to follow"
    })
  })

  test('names a start frame that is not on the page', async () => {
    const { figma } = setup()

    expect(await runTool(figma, 'export_video', { start: 'Purple', format: 'gif' })).toEqual({
      error: "No top-level frame named or with ID 'Purple' on this page"
    })
  })
})
