import { describe, expect, test } from 'bun:test'

import { planPrototypeVideo } from '@pairdraw/core/io/formats/video'
import { SceneGraph } from '@pairdraw/scene-graph'

/** A 1000×800 frame that goes to another after a second. */
function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const start = graph.createNode('FRAME', pageId, { name: 'Start', width: 1000, height: 800 })
  const next = graph.createNode('FRAME', pageId, {
    name: 'Next',
    x: 1200,
    width: 1000,
    height: 800
  })
  graph.updateNode(start.id, {
    prototypeReactions: [
      {
        id: '9:1',
        trigger: { type: 'AFTER_TIMEOUT', delay: 1 },
        actions: [
          {
            type: 'NODE',
            nodeId: next.id,
            navigation: 'NAVIGATE',
            transition: { type: 'INSTANT', duration: 0 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ]
  })
  return { graph, start: start.id }
}

describe('planning a prototype video', () => {
  test('keeps a GIF within 960 pixels whatever size is asked', () => {
    const { graph, start } = setup()

    const plan = planPrototypeVideo(graph, {
      startFrameId: start,
      format: 'gif',
      scale: 4,
      maxEdge: 3840,
      maxMs: 30_000
    })

    expect([plan.width, plan.height]).toEqual([960, 768])
  })

  test('lets an MP4 grow to the size asked', () => {
    const { graph, start } = setup()

    const plan = planPrototypeVideo(graph, {
      startFrameId: start,
      format: 'mp4',
      scale: 2,
      maxEdge: 3840,
      maxMs: 30_000
    })

    expect([plan.width, plan.height]).toEqual([2000, 1600])
  })
})
