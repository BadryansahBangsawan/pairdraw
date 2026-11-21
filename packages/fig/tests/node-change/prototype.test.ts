import { beforeAll, describe, expect, test } from 'bun:test'

import type { KiwiNodeChange } from '#fig/node-change/export/node'
import { nodeChangeToProps, sceneNodeToKiwi } from '#fig/node-change/index'
import { extractPrototypeReactions } from '#fig/node-change/prototype'

import { getCompiledSchema, initCodec, type NodeChange } from '@pairdraw/kiwi/fig/codec'
import type { SceneNode } from '@pairdraw/scene-graph'
import { SceneGraph } from '@pairdraw/scene-graph'
import { createDefaultSourceMetadata } from '@pairdraw/scene-graph/node-defaults'

import accordion from '../instance-overrides/fixtures/accordion-source-closure.json'

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

  test('one export reads the overlay placements once, however many roots it writes', () => {
    const { graph, frame, target } = importedGraph()
    const scans = { count: 0 }
    const getAllNodes = graph.getAllNodes.bind(graph)
    graph.getAllNodes = (...args) => {
      scans.count += 1
      return getAllNodes(...args)
    }
    const writeRoots = (roots: number): number => {
      scans.count = 0
      // An export writes each root through its own call and shares these maps between them.
      const shared = { propertyIdToGuid: new Map(), componentPropertyDefinitionsById: new Map() }
      for (let index = 0; index < roots; index++) {
        const node = index % 2 === 0 ? frame : target
        sceneNodeToKiwi(node, { sessionID: 1, localID: 1 }, index, { value: 2 }, graph, [], shared)
      }
      return scans.count
    }
    expect(writeRoots(40)).toBe(writeRoots(1))
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

  test("imports Figma's Change to (SWAP_STATE) on a variant, as the accordion file has it", () => {
    const closed = (accordion as NodeChange[]).find(
      (record) => record.type === 'SYMBOL' && record.name === 'State=Closed'
    )
    if (!closed) throw new Error('fixture has no State=Closed variant')
    // Figma's Smart animate plays as a dissolve, the closest animation play has.
    expect(extractPrototypeReactions(closed)).toEqual([
      {
        id: '11:87',
        trigger: { type: 'ON_CLICK', delay: 0 },
        actions: [
          {
            type: 'NODE',
            nodeId: '7:251',
            navigation: 'CHANGE_TO',
            transition: { type: 'DISSOLVE', duration: 0.30000001192092896 },
            overlayPosition: 'CENTER'
          }
        ]
      }
    ])
  })

  test('imports Scroll to and the hover, press, enter and leave triggers with their delays', () => {
    const action = {
      transitionNodeID: { sessionID: 2, localID: 8 },
      connectionType: 'INTERNAL_NODE',
      navigationType: 'SCROLL_TO',
      extraScrollOffset: { x: 0, y: 24 }
    }
    const interaction = (localID: number, event: Record<string, unknown>) => ({
      id: { sessionID: 2, localID },
      event,
      actions: [action]
    })
    const reactions = extractPrototypeReactions({
      prototypeInteractions: [
        interaction(1, { interactionType: 'ON_HOVER' }),
        interaction(2, { interactionType: 'ON_PRESS' }),
        interaction(3, { interactionType: 'MOUSE_ENTER', transitionTimeout: 0.5 }),
        interaction(4, { interactionType: 'MOUSE_LEAVE' }),
        // Legacy mouse-in and drag stay in the record, unplayed.
        interaction(5, { interactionType: 'MOUSE_IN' }),
        interaction(6, { interactionType: 'DRAG' })
      ]
    } as NodeChange)
    expect(reactions.map((reaction) => reaction.trigger)).toEqual([
      { type: 'ON_HOVER', delay: 0 },
      { type: 'ON_PRESS', delay: 0 },
      { type: 'MOUSE_ENTER', delay: 0.5 },
      { type: 'MOUSE_LEAVE', delay: 0 }
    ])
    expect(reactions[0]?.actions[0]).toMatchObject({
      type: 'NODE',
      nodeId: '2:8',
      navigation: 'SCROLL_TO'
    })
  })

  test('writes Change to as SWAP_STATE and keeps the smart animate and easing an edit did not touch', () => {
    const { graph, frame } = importedGraph()
    const variant = graph.createNode('COMPONENT', graph.getPages()[0].id, {
      id: '2:20',
      source: { ...frame.source, id: '2:20', fig: { ...frame.source.fig, rawNodeFields: {} } }
    })
    const raw = {
      id: { sessionID: 2, localID: 7 },
      event: { interactionType: 'ON_CLICK' },
      actions: [
        {
          transitionNodeID: { sessionID: 2, localID: 20 },
          transitionType: 'SMART_ANIMATE',
          transitionDuration: 0.3,
          easingType: 'OUT_CUBIC',
          easingFunction: [0, 0, 0.58, 1],
          connectionType: 'INTERNAL_NODE',
          navigationType: 'SWAP_STATE'
        }
      ]
    }
    const props = importNode({ type: 'FRAME', prototypeInteractions: [raw] })
    graph.updateNode(frame.id, {
      source: { ...frame.source, fig: props.source?.fig ?? frame.source.fig },
      prototypeReactions: props.prototypeReactions
    })
    const [reaction] = graph.getNode(frame.id)?.prototypeReactions ?? []
    if (!reaction) throw new Error('no reaction')
    // Only the duration changes; the action stays a dissolve-like Smart animate Change to.
    graph.updateNode(frame.id, {
      prototypeReactions: [
        {
          ...reaction,
          actions: reaction.actions.map((action) =>
            action.type === 'NODE'
              ? { ...action, transition: { ...action.transition, duration: 0.5 } }
              : action
          )
        }
      ]
    })
    expect(write(graph, frame.id).prototypeInteractions).toEqual([
      {
        ...raw,
        actions: [{ ...raw.actions[0], transitionDuration: 0.5 }]
      }
    ])
    expect(variant.id).toBe('2:20')
  })

  test('an edited Navigate keeps the slide the file gave it while its animation stays put', () => {
    const { graph, frame } = importedGraph()
    const raw = {
      id: { sessionID: 2, localID: 7 },
      event: { interactionType: 'ON_CLICK' },
      actions: [
        {
          transitionNodeID: { sessionID: 2, localID: 8 },
          transitionType: 'SLIDE_FROM_LEFT',
          transitionDuration: 0.3,
          connectionType: 'INTERNAL_NODE',
          navigationType: 'NAVIGATE'
        }
      ]
    }
    const props = importNode({ type: 'FRAME', prototypeInteractions: [raw] })
    graph.updateNode(frame.id, {
      source: { ...frame.source, fig: props.source?.fig ?? frame.source.fig },
      prototypeReactions: props.prototypeReactions
    })
    const [reaction] = graph.getNode(frame.id)?.prototypeReactions ?? []
    if (!reaction) throw new Error('no reaction')
    graph.updateNode(frame.id, {
      prototypeReactions: [{ ...reaction, trigger: { type: 'ON_HOVER', delay: 0 } }]
    })
    expect(write(graph, frame.id).prototypeInteractions).toEqual([
      { ...raw, event: { interactionType: 'ON_HOVER' } }
    ])
  })

  test('a mouse enter delay goes back to the file only where the file stored one', () => {
    const { graph, frame } = importedGraph()
    const enter = (localID: number, event: Record<string, unknown>) => ({
      id: { sessionID: 2, localID },
      event: { interactionType: 'MOUSE_ENTER', ...event },
      actions: [{ connectionType: 'BACK' }]
    })
    const props = importNode({
      type: 'FRAME',
      prototypeInteractions: [enter(1, { transitionTimeout: 0.5 }), enter(2, {})]
    })
    graph.updateNode(frame.id, {
      source: { ...frame.source, fig: props.source?.fig ?? frame.source.fig }
    })
    graph.updateNode(frame.id, {
      prototypeReactions: (props.prototypeReactions ?? []).map((reaction) => ({
        ...reaction,
        trigger: { ...reaction.trigger, delay: 2 }
      }))
    })
    // The second came without a stored delay: where Figma keeps one Pairdraw has not confirmed,
    // so the delay plays here but is not written.
    expect(write(graph, frame.id).prototypeInteractions).toEqual([
      enter(1, { transitionTimeout: 2 }),
      enter(2, {})
    ])
  })

  test('writes Scroll to as SCROLL_TO and keeps the scroll offset the file stored', () => {
    const { graph, frame } = importedGraph()
    const raw = {
      id: { sessionID: 2, localID: 7 },
      event: { interactionType: 'ON_CLICK' },
      actions: [
        {
          transitionNodeID: { sessionID: 2, localID: 8 },
          connectionType: 'INTERNAL_NODE',
          navigationType: 'SCROLL_TO',
          transitionType: 'INSTANT_TRANSITION',
          transitionDuration: 0,
          extraScrollOffset: { x: 0, y: 24 }
        }
      ]
    }
    const props = importNode({ type: 'FRAME', prototypeInteractions: [raw] })
    graph.updateNode(frame.id, {
      source: { ...frame.source, fig: props.source?.fig ?? frame.source.fig },
      prototypeReactions: props.prototypeReactions
    })
    const [reaction] = graph.getNode(frame.id)?.prototypeReactions ?? []
    if (!reaction) throw new Error('no reaction')
    graph.updateNode(frame.id, {
      prototypeReactions: [{ ...reaction, trigger: { type: 'ON_PRESS', delay: 0 } }]
    })
    const record = write(graph, frame.id)
    expect(record.prototypeInteractions).toEqual([
      { ...raw, event: { interactionType: 'ON_PRESS' } }
    ])
    expect(() => getCompiledSchema().encodeNodeChange(record as never)).not.toThrow()
  })
})

describe('overflow scrolling in .fig records', () => {
  beforeAll(() => initCodec())

  test('reads scrollDirection as the frame overflow', () => {
    expect(importNode({ type: 'FRAME', scrollDirection: 'VERTICAL' }).overflowDirection).toBe(
      'VERTICAL'
    )
    expect(importNode({ type: 'FRAME' }).overflowDirection).toBe('NONE')
  })

  test('writes the overflow a frame was given, and none when it does not scroll', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const list = graph.createNode('FRAME', pageId, { overflowDirection: 'BOTH' })
    const plain = graph.createNode('FRAME', pageId)
    const record = write(graph, list.id)
    expect(record.scrollDirection).toBe('BOTH')
    expect(write(graph, plain.id).scrollDirection).toBeUndefined()
    expect(() => getCompiledSchema().encodeNodeChange(record as never)).not.toThrow()
  })

  test('writes no overflow on a layer that cannot scroll', () => {
    const graph = new SceneGraph()
    const rect = graph.createNode('RECTANGLE', graph.getPages()[0].id, {
      overflowDirection: 'VERTICAL'
    })
    expect(write(graph, rect.id).scrollDirection).toBeUndefined()
  })

  test('an edited overflow replaces the one the file recorded', () => {
    const graph = new SceneGraph()
    const props = importNode({ type: 'FRAME', name: 'List', scrollDirection: 'VERTICAL' })
    const list = graph.createNode('FRAME', graph.getPages()[0].id, {
      ...props,
      id: '3:1',
      source: { ...createDefaultSourceMetadata(), ...props.source, id: '3:1' }
    })
    expect(write(graph, list.id).scrollDirection).toBe('VERTICAL')
    graph.updateNode(list.id, { overflowDirection: 'NONE' })
    expect(write(graph, list.id).scrollDirection).toBeUndefined()
  })
})

describe('Scroll to animations in .fig records', () => {
  beforeAll(() => initCodec())

  const scrollTo = (transitionType: string) => ({
    id: { sessionID: 2, localID: 7 },
    event: { interactionType: 'ON_CLICK' },
    actions: [
      {
        transitionNodeID: { sessionID: 2, localID: 8 },
        connectionType: 'INTERNAL_NODE',
        navigationType: 'SCROLL_TO',
        transitionType,
        transitionDuration: 0.4
      }
    ]
  })

  test("plays Figma's animated scroll as an eased one and writes it back as Figma saved it", () => {
    const { graph, frame } = importedGraph()
    const raw = scrollTo('SCROLL_ANIMATE')
    const props = importNode({ type: 'FRAME', prototypeInteractions: [raw] })
    expect(props.prototypeReactions?.[0]?.actions[0]).toMatchObject({
      navigation: 'SCROLL_TO',
      transition: { type: 'DISSOLVE', duration: 0.4 }
    })
    graph.updateNode(frame.id, {
      source: { ...frame.source, fig: props.source?.fig ?? frame.source.fig }
    })
    const [reaction] = props.prototypeReactions ?? []
    if (!reaction) throw new Error('no reaction')
    graph.updateNode(frame.id, {
      prototypeReactions: [{ ...reaction, trigger: { type: 'ON_PRESS', delay: 0 } }]
    })
    expect(write(graph, frame.id).prototypeInteractions).toEqual([
      { ...raw, event: { interactionType: 'ON_PRESS' } }
    ])
  })

  test('writes an animated Scroll to made in Pairdraw as an instant one, which Figma is known to read', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const target = graph.createNode('FRAME', pageId)
    const button = graph.createNode('FRAME', pageId, {
      prototypeReactions: [
        {
          id: '2:30',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: target.id,
              navigation: 'SCROLL_TO',
              transition: { type: 'DISSOLVE', duration: 0.4 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    const [interaction] = (write(graph, button.id).prototypeInteractions ?? []) as {
      actions: { transitionType?: string }[]
    }[]
    expect(interaction?.actions[0]?.transitionType).toBe('INSTANT_TRANSITION')
  })

  test('leaves an action whose navigation is an inherited object key unread', () => {
    const reactions = extractPrototypeReactions({
      prototypeInteractions: [
        {
          id: { sessionID: 2, localID: 7 },
          event: { interactionType: 'ON_CLICK' },
          actions: [{ connectionType: 'INTERNAL_NODE', navigationType: 'constructor' }]
        }
      ]
    } as NodeChange)
    expect(reactions).toEqual([])
  })
})
