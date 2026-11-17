import { describe, expect, test } from 'bun:test'

import { SceneGraph, type Effect } from '@pairdraw/scene-graph'
import { copyEffect } from '@pairdraw/scene-graph/copy'
import type { Vector } from '@pairdraw/scene-graph/primitives'

function pageId(graph: SceneGraph): string {
  const page = graph.getPages()[0]
  if (!page) throw new Error('missing page')
  return page.id
}

function dropShadow(offset?: Partial<Vector>): Effect {
  const effect: Effect = {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.35 },
    offset: { x: offset?.x ?? 0, y: offset?.y ?? 4 },
    radius: 16,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }
  if (offset === undefined) {
    Reflect.deleteProperty(effect, 'offset')
    return effect
  }
  if (offset.x === undefined) Reflect.deleteProperty(effect.offset, 'x')
  if (offset.y === undefined) Reflect.deleteProperty(effect.offset, 'y')
  return effect
}

function layerBlurWithoutOffset(): Effect {
  const effect: Effect = {
    type: 'LAYER_BLUR',
    color: { r: 0, g: 0, b: 0, a: 0 },
    offset: { x: 1, y: 1 },
    radius: 8,
    spread: 0,
    visible: true
  }
  Reflect.deleteProperty(effect, 'offset')
  return effect
}

const shader: Effect = { type: 'SHADER', source: 'void main() {}', visible: true }

function storedOffset(effect: Effect | undefined): Vector | null {
  if (!effect || effect.type === 'SHADER') return null
  return effect.offset
}

describe('effect offsets on the graph', () => {
  test('creating a drop shadow without an offset stores 0, 4', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph), { effects: [dropShadow()] })
    expect(node.effects[0]).toMatchObject({ type: 'DROP_SHADOW', offset: { x: 0, y: 4 } })
  })

  test('creating a drop shadow that only sets x keeps that x and fills y', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph), { effects: [dropShadow({ x: 5 })] })
    expect(storedOffset(node.effects[0])).toEqual({ x: 5, y: 4 })
  })

  test('creating a drop shadow that already has an offset keeps it', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph), { effects: [dropShadow({ x: 2, y: 3 })] })
    expect(storedOffset(node.effects[0])).toEqual({ x: 2, y: 3 })
  })

  test('creating a layer blur without an offset stores 0, 0', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph), { effects: [layerBlurWithoutOffset()] })
    expect(storedOffset(node.effects[0])).toEqual({ x: 0, y: 0 })
  })

  test('creating a shader effect leaves it unchanged', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph), { effects: [shader] })
    expect(node.effects[0]).toEqual(shader)
  })

  test('updating a node with a drop shadow without an offset stores 0, 4', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph))
    graph.updateNode(node.id, { effects: [dropShadow()] })
    expect(storedOffset(graph.getNode(node.id)?.effects[0])).toEqual({ x: 0, y: 4 })
  })

  test('previewing a drop shadow without an offset stores 0, 4', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('FRAME', pageId(graph))
    graph.updateNodePreview(node.id, { effects: [dropShadow()] })
    expect(storedOffset(graph.getNode(node.id)?.effects[0])).toEqual({ x: 0, y: 4 })
  })

  test('copying a drop shadow without an offset yields 0, 4', () => {
    const copy = copyEffect(dropShadow())
    expect(copy.type === 'SHADER' ? null : copy.offset).toEqual({ x: 0, y: 4 })
  })
})
