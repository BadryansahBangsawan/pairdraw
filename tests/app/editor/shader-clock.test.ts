import { describe, expect, test } from 'bun:test'

import type { Editor } from '@pairdraw/core'
import { SceneGraph } from '@pairdraw/scene-graph'
import { createShaderSourcePaint, withShaderPaints } from '@pairdraw/scene-graph/shaders'

import { repaintsForTime } from '@/app/editor/shader-clock/create'

/** The smallest shader that counts time, and one that draws the same picture every frame. */
const TIMED = `#version 300 es
precision highp float;
/** @time */
uniform float u_time;
void main() { gl_FragColor = vec4(u_time, 0.0, 0.0, 1.0); }`
const STILL = `#version 300 es
precision highp float;
void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }`

type ClockSource = Pick<Editor, 'graph' | 'state' | 'getViewportSize'>

function clockSource(
  graph: SceneGraph,
  view: { pageId?: string; panX?: number; panY?: number; zoom?: number } = {}
): ClockSource {
  return {
    graph,
    state: {
      currentPageId: view.pageId ?? graph.getPages()[0].id,
      panX: view.panX ?? 0,
      panY: view.panY ?? 0,
      zoom: view.zoom ?? 1
    },
    getViewportSize: () => ({ width: 800, height: 600 })
  } as ClockSource
}

/** A layer painted with shader `source`, which returns the layer's id. */
function shaderLayer(
  graph: SceneGraph,
  source: string,
  options: { parentId?: string; x?: number; y?: number; visible?: boolean } = {}
) {
  const pageId = graph.getPages()[0].id
  const node = graph.createNode('RECTANGLE', options.parentId ?? pageId, {
    name: 'Shader',
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: 120,
    height: 80,
    visible: options.visible ?? true
  })
  const { paint, shader } = createShaderSourcePaint(source)
  graph.updateNode(node.id, {
    fills: [paint],
    pluginData: withShaderPaints(node, [paint], [shader])
  })
  return node.id
}

describe('repaintsForTime', () => {
  test('a timed shader on screen repaints', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, TIMED)
    expect(repaintsForTime(clockSource(graph))).toBe(true)
  })

  test('a shader that draws no clock never repaints', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, STILL)
    expect(repaintsForTime(clockSource(graph))).toBe(false)
  })

  test('a timed shader scrolled off screen does not repaint', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, TIMED)
    expect(repaintsForTime(clockSource(graph, { panX: -2000 }))).toBe(false)
    expect(repaintsForTime(clockSource(graph, { panY: -2000 }))).toBe(false)
    expect(repaintsForTime(clockSource(graph, { zoom: 0.01, panX: -5000 }))).toBe(false)
  })

  test('a timed shader on another page does not repaint', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, TIMED)
    const other = graph.addPage('Page 2')
    expect(repaintsForTime(clockSource(graph, { pageId: other.id }))).toBe(false)
  })

  test('a hidden layer does not repaint, nor one inside a hidden frame', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, TIMED, { visible: false })
    expect(repaintsForTime(clockSource(graph))).toBe(false)

    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Frame',
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      visible: false
    })
    shaderLayer(graph, TIMED, { parentId: frame.id })
    expect(repaintsForTime(clockSource(graph))).toBe(false)
  })

  test('a hidden paint does not repaint', () => {
    const graph = new SceneGraph()
    const id = shaderLayer(graph, TIMED)
    const node = graph.getNode(id)
    if (!node) throw new Error('layer')
    graph.updateNode(id, { fills: node.fills.map((fill) => ({ ...fill, visible: false })) })
    expect(repaintsForTime(clockSource(graph))).toBe(false)
  })
})
