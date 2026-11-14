import { describe, expect, test } from 'bun:test'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { SceneGraph as Graph } from '@pairdraw/scene-graph'

import { edgePoint, prototypeConnections } from '#core/canvas/overlays/prototype'
import type { ViewportTransform } from '#core/geometry'

const VIEW: ViewportTransform = { panX: 0, panY: 0, zoom: 1 }

function node(graph: SceneGraph, id: string): SceneNode {
  const found = graph.getNode(id)
  if (!found) throw new Error(`no node ${id}`)
  return found
}

function pageId(graph: SceneGraph): string {
  const page = graph.getPages()[0]
  if (!page) throw new Error('no page')
  return page.id
}

function graphWithFrames() {
  const graph = new Graph()
  const page = pageId(graph)
  const source = graph.createNode('FRAME', page, { x: 0, y: 0, width: 100, height: 100 })
  const right = graph.createNode('FRAME', page, { x: 200, y: 0, width: 100, height: 100 })
  return { graph, source, right }
}

function connect(graph: SceneGraph, from: string, to: string | null) {
  graph.updateNode(from, {
    prototypeReactions: [
      {
        id: 'r1',
        trigger: { type: 'ON_CLICK', delay: 0 },
        actions: [
          {
            type: 'NODE',
            nodeId: to,
            navigation: 'NAVIGATE',
            transition: { type: 'INSTANT', duration: 0 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ]
  })
}

describe('prototype connection geometry', () => {
  test('leaves a box on the side the ray toward the other box crosses', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 }
    expect(edgePoint(box, { x: 500, y: 50 })).toEqual({ x: 100, y: 50 })
    expect(edgePoint(box, { x: 50, y: 500 })).toEqual({ x: 50, y: 100 })
    expect(edgePoint(box, { x: 50, y: 50 })).toEqual({ x: 50, y: 50 })
  })

  test('draws one arrow per action that shows another layer, edge to edge', () => {
    const { graph, source, right } = graphWithFrames()
    connect(graph, source.id, right.id)
    expect(prototypeConnections(graph, [node(graph, source.id)], VIEW)).toEqual([
      { from: { x: 100, y: 50 }, to: { x: 200, y: 50 } }
    ])
  })

  test('skips an action with no target, a deleted target, and BACK or CLOSE', () => {
    const { graph, source } = graphWithFrames()
    connect(graph, source.id, null)
    const layer = node(graph, source.id)
    graph.updateNode(source.id, {
      prototypeReactions: [
        {
          id: 'r1',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [...layer.prototypeReactions[0].actions, { type: 'BACK' }, { type: 'CLOSE' }]
        }
      ]
    })
    expect(prototypeConnections(graph, [node(graph, source.id)], VIEW)).toEqual([])
  })

  test('moves the arrow with the viewport and scales it by zoom', () => {
    const { graph, source, right } = graphWithFrames()
    connect(graph, source.id, right.id)
    const [connection] = prototypeConnections(graph, [node(graph, source.id)], {
      panX: 40,
      panY: 25,
      zoom: 2
    })
    expect(connection.from).toEqual({ x: 240, y: 125 })
    expect(connection.to).toEqual({ x: 440, y: 125 })
  })
})
