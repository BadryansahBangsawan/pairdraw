import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  createShaderPaint,
  createShaderSourcePaint,
  withShaderPaints,
  type ShaderPreset
} from '@pairdraw/scene-graph/shaders'

import { onScreen, shadersOnPage } from '#vue/canvas/surface/shader/plan'

const PRESET: ShaderPreset = { components: [{ type: 'Aurora' }] }

/** A layer painted with a preset shader, a source shader, or both, and the paints it holds. */
function shaderLayer(
  graph: SceneGraph,
  options: {
    parentId?: string
    x?: number
    y?: number
    width?: number
    height?: number
    visible?: boolean
    preset?: boolean
    source?: boolean
    paintVisible?: boolean
  } = {}
) {
  const pageId = graph.getPages()[0].id
  const node = graph.createNode('RECTANGLE', options.parentId ?? pageId, {
    name: 'Shader',
    x: options.x ?? 0,
    y: options.y ?? 0,
    width: options.width ?? 120,
    height: options.height ?? 80,
    visible: options.visible ?? true
  })
  const paints = []
  const shaders = []
  if (options.preset !== false) {
    const created = createShaderPaint(PRESET)
    paints.push({ ...created.paint, visible: options.paintVisible ?? true })
    shaders.push(created.shader)
  }
  if (options.source) {
    const created = createShaderSourcePaint('void main() {}')
    paints.push({ ...created.paint, visible: options.paintVisible ?? true })
    shaders.push(created.shader)
  }
  graph.updateNode(node.id, {
    fills: paints,
    pluginData: withShaderPaints(node, paints, shaders)
  })
  return { id: node.id, shaders }
}

describe('shadersOnPage', () => {
  test('collects the preset shaders a page draws, with the layers painting each', () => {
    const graph = new SceneGraph()
    const first = shaderLayer(graph)
    const second = shaderLayer(graph, { x: 200 })
    const pageId = graph.getPages()[0].id
    const found = shadersOnPage(graph, pageId)
    expect(found.size).toBe(2)
    expect([...found.values()].map((entry) => entry.nodeIds)).toEqual([
      new Set([first.id]),
      new Set([second.id])
    ])
    expect([...found.values()].every((entry) => entry.preset.components.length === 1)).toBe(true)
  })

  test('one shader image painted by several layers is one entry', () => {
    const graph = new SceneGraph()
    const first = shaderLayer(graph)
    const pageId = graph.getPages()[0].id
    const node = graph.getNode(first.id)
    if (!node) throw new Error('layer')
    const second = graph.createNode('RECTANGLE', pageId, {
      name: 'Same shader',
      x: 200,
      y: 0,
      width: 120,
      height: 80,
      fills: node.fills
    })
    graph.updateNode(second.id, { pluginData: node.pluginData })
    const found = shadersOnPage(graph, pageId)
    expect(found.size).toBe(1)
    const [entry] = [...found.values()]
    expect(entry?.nodeIds).toEqual(new Set([first.id, second.id]))
    expect(entry?.bounds).toHaveLength(2)
    expect(entry?.preset).toEqual(PRESET)
  })

  test('leaves out hidden layers, hidden ancestors, and hidden paints', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, { visible: false })
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Frame',
      x: 0,
      y: 0,
      width: 400,
      height: 400,
      visible: false
    })
    shaderLayer(graph, { parentId: frame.id })
    shaderLayer(graph, { paintVisible: false })
    expect(shadersOnPage(graph, pageId).size).toBe(0)
  })

  test('leaves out another page and source shaders the canvas compiles itself', () => {
    const graph = new SceneGraph()
    shaderLayer(graph, { preset: false, source: true })
    const other = graph.addPage('Page 2')
    expect(shadersOnPage(graph, graph.getPages()[0].id).size).toBe(0)
    expect(shadersOnPage(graph, other.id).size).toBe(0)
  })
})

describe('onScreen', () => {
  const view = { panX: 0, panY: 0, zoom: 1 }
  const viewport = { width: 800, height: 600 }

  test('is true for a layer inside the view and false outside it', () => {
    expect(onScreen([{ x: 10, y: 10, width: 100, height: 100 }], view, viewport)).toBe(true)
    expect(onScreen([{ x: -200, y: 10, width: 100, height: 100 }], view, viewport)).toBe(false)
    expect(onScreen([{ x: 10, y: 700, width: 100, height: 100 }], view, viewport)).toBe(false)
  })

  test('follows pan and zoom', () => {
    const layer = { x: 0, y: 0, width: 100, height: 100 }
    expect(onScreen([layer], { panX: -50, panY: 0, zoom: 1 }, viewport)).toBe(true)
    expect(onScreen([layer], { panX: -150, panY: 0, zoom: 1 }, viewport)).toBe(false)
    expect(onScreen([layer], { panX: 0, panY: 0, zoom: 0.1 }, viewport)).toBe(true)
  })

  test('is true when any painted layer is in view', () => {
    const bounds = [
      { x: -200, y: 0, width: 50, height: 50 },
      { x: 100, y: 100, width: 50, height: 50 }
    ]
    expect(onScreen(bounds, view, viewport)).toBe(true)
  })
})
