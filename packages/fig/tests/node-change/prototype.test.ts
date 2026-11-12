import { beforeAll, describe, expect, test } from 'bun:test'

import type { KiwiNodeChange } from '#fig/node-change/export/node'
import { nodeChangeToProps, sceneNodeToKiwi } from '#fig/node-change/index'
import { extractPrototypeReactions } from '#fig/node-change/prototype'

import { getCompiledSchema, initCodec, type NodeChange } from '@open-pencil/kiwi/fig/codec'
import type { SceneNode } from '@open-pencil/scene-graph'
import { SceneGraph } from '@open-pencil/scene-graph'
import { createDefaultSourceMetadata } from '@open-pencil/scene-graph/node-defaults'

const importNode = (nc: NodeChange): Partial<SceneNode> =>
  nodeChangeToProps(nc, []) as Partial<SceneNode>

function importedGraph(): { graph: SceneGraph; frame: SceneNode; target: SceneNode } {
  const nc: NodeChange = {
    type: 'FRAME',
    name: 'Home',
    prototypeInteractions: [
      {
        id: { sessionID: 2, localID: 7 },
        event: { interactionType: 'ON_CLICK' },
        actions: [
          {
            transitionNodeID: { sessionID: 2, localID: 8 },
            connectionType: 'INTERNAL_NODE',
            navigationType: 'NAVIGATE',
            transitionType: 'DISSOLVE',
            transitionDuration: 0.3
          }
        ]
      },
      // A hover reaction: real in the file, not in this model, so it must survive untouched.
      { id: { sessionID: 2, localID: 9 }, event: { interactionType: 'ON_HOVER' }, actions: [] }
    ]
  }
  const props = importNode(nc)
  const graph = new SceneGraph()
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    ...props,
    id: '2:7',
    source: { ...createDefaultSourceMetadata(), ...props.source, id: '2:7' }
  })
  const fig = frame.source.fig ?? {}
  const target = graph.createNode('FRAME', graph.getPages()[0].id, {
    id: '2:8',
    source: { ...frame.source, id: '2:8', fig: { ...fig, rawNodeFields: {} } }
  })
  return { graph, frame, target }
}

const write = (graph: SceneGraph, nodeId: string): KiwiNodeChange => {
  const node = graph.getNode(nodeId) as SceneNode
  const [change] = sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, 0, { value: 2 }, graph, [])
  if (!change) throw new Error(`no record for ${nodeId}`)
  return change
}

describe('prototype reactions in .fig records', () => {
  beforeAll(() => initCodec())

  test('imports a click connection as a node reaction', () => {
    const props = importNode({
      type: 'FRAME',
      prototypeInteractions: [
        {
          id: { sessionID: 2, localID: 7 },
          event: { interactionType: 'ON_CLICK' },
          actions: [
            {
              transitionNodeID: { sessionID: 2, localID: 8 },
              connectionType: 'INTERNAL_NODE',
              transitionType: 'DISSOLVE',
              transitionDuration: 0.3
            }
          ]
        }
      ]
    })
    expect(props.prototypeReactions).toEqual([
      {
        id: '2:7',
        trigger: { type: 'ON_CLICK', delay: 0 },
        actions: [
          {
            type: 'NODE',
            nodeId: '2:8',
            navigation: 'NAVIGATE',
            transition: { type: 'DISSOLVE', duration: 0.3 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ])
  })

  test('keeps a delay on an AFTER_TIMEOUT reaction and skips interactions the model cannot show', () => {
    const reactions = extractPrototypeReactions({
      prototypeInteractions: [
        {
          id: { sessionID: 2, localID: 7 },
          event: { interactionType: 'AFTER_TIMEOUT', transitionTimeout: 2 },
          actions: [{ connectionType: 'BACK' }]
        },
        { id: { sessionID: 2, localID: 8 }, event: { interactionType: 'DRAG' }, actions: [] }
      ]
    } as NodeChange)
    expect(reactions).toEqual([
      { id: '2:7', trigger: { type: 'AFTER_TIMEOUT', delay: 2 }, actions: [{ type: 'BACK' }] }
    ])
  })

  test('an untouched imported layer writes the file payload verbatim', () => {
    const { graph, frame } = importedGraph()
    const record = write(graph, frame.id)
    // The raw payload, not the model, is what an untouched record writes: the hover reaction and
    // every field this model does not read come back byte-identical.
    const raw = frame.source.fig?.rawNodeFields?.prototypeInteractions as unknown[] | undefined
    expect(record.prototypeInteractions).toEqual(raw)
  })

  test('an edited layer writes its reactions and drops the stale raw payload', () => {
    const { graph, frame } = importedGraph()
    graph.updateNode(frame.id, {
      prototypeReactions: [
        {
          id: '2:7',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: '2:8',
              navigation: 'OVERLAY',
              transition: { type: 'INSTANT', duration: 0 },
              overlayPosition: 'TOP_RIGHT'
            }
          ]
        }
      ]
    })

    const record = write(graph, frame.id)
    expect(record.prototypeInteractions).toEqual([
      {
        id: { sessionID: 2, localID: 7 },
        event: { interactionType: 'ON_CLICK' },
        actions: [
          {
            transitionNodeID: { sessionID: 2, localID: 8 },
            connectionType: 'INTERNAL_NODE',
            navigationType: 'OVERLAY',
            transitionType: 'INSTANT_TRANSITION',
            transitionDuration: 0
          }
        ]
      },
      // The hover reaction the model never showed stays in the record.
      { id: { sessionID: 2, localID: 9 }, event: { interactionType: 'ON_HOVER' }, actions: [] }
    ])
  })

  test('an imported overlay frame keeps the placement the file recorded', () => {
    const { graph, frame, target } = importedGraph()
    graph.updateNode(target.id, {})
    expect(write(graph, frame.id).overlayPositionType).toBeUndefined()
  })

  test('a frame opened as an overlay records its placement on its own record', () => {
    const { graph, frame, target } = importedGraph()
    graph.updateNode(frame.id, {
      prototypeReactions: [
        {
          id: '2:7',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: '2:8',
              navigation: 'OVERLAY',
              transition: { type: 'INSTANT', duration: 0 },
              overlayPosition: 'BOTTOM_LEFT'
            }
          ]
        }
      ]
    })
    const targetRecord = write(graph, target.id)
    expect(targetRecord.navigationType).toBe('OVERLAY')
    expect(targetRecord.overlayPositionType).toBe('BOTTOM_LEFT')
  })

  test('an emptied reaction list writes no field, so an edited layer stops carrying reactions', () => {
    const { graph, frame } = importedGraph()
    graph.updateNode(frame.id, {
      prototypeReactions: [],
      source: { ...frame.source, editedFields: ['prototypeReactions'] }
    })
    const record = write(graph, frame.id)
    // Only the unmodeled hover reaction survives; the modeled one is gone.
    expect(record.prototypeInteractions).toEqual([
      { id: { sessionID: 2, localID: 9 }, event: { interactionType: 'ON_HOVER' }, actions: [] }
    ])
  })

  test('a reaction record encodes with the .fig schema', () => {
    const { graph, frame } = importedGraph()
    graph.updateNode(frame.id, {
      prototypeReactions: [
        {
          id: '2:7',
          trigger: { type: 'AFTER_TIMEOUT', delay: 1 },
          actions: [{ type: 'CLOSE' }]
        }
      ]
    })
    const record = write(graph, frame.id)
    expect(() => getCompiledSchema().encodeNodeChange(record as never)).not.toThrow()
  })
})
