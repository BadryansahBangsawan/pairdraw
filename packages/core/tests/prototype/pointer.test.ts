import { describe, expect, test } from 'bun:test'

import {
  createPlayScenes,
  hasPointerTriggers,
  pathChanges,
  pointerPath,
  pointerReactions,
  revertFor,
  startSession
} from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction, type SceneNode } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

type Trigger = PrototypeReaction['trigger']['type']

function reaction(
  trigger: Trigger,
  nodeId: string,
  navigation: 'CHANGE_TO' | 'OVERLAY' | 'NAVIGATE'
): PrototypeReaction {
  return {
    id: `${trigger}-${nodeId}`,
    trigger: { type: trigger, delay: 0 },
    actions: [
      {
        type: 'NODE',
        nodeId,
        navigation,
        transition: { type: 'INSTANT', duration: 0 },
        overlayPosition: 'CENTER'
      }
    ]
  }
}

/** A button set, Default changing to Hover while hovered, placed in a card on a screen. */
function buttonScreen() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { y: 500 })
  const base = graph.createNode('COMPONENT', set.id, {
    name: 'State=Default',
    width: 40,
    height: 20
  })
  graph.createNode('TEXT', base.id, { name: 'Label', width: 10, height: 10 })
  const hover = graph.createNode('COMPONENT', set.id, {
    name: 'State=Hover',
    x: 60,
    width: 40,
    height: 20
  })
  graph.updateNode(base.id, { prototypeReactions: [reaction('ON_HOVER', hover.id, 'CHANGE_TO')] })
  const screen = graph.createNode('FRAME', pageId, { width: 200, height: 200 })
  const card = graph.createNode('FRAME', screen.id, { x: 10, y: 10, width: 100, height: 100 })
  const button = graph.createInstance(base.id, card.id, { x: 10, y: 10 })
  if (!button) throw new Error('no button')
  const tooltip = graph.createNode('FRAME', pageId, { x: 400, width: 50, height: 20 })
  return { graph, screen, card, button, base, hover, tooltip }
}

function shows(graph: SceneGraph, node: SceneNode | undefined): string | undefined {
  return node ? instanceMainComponent(graph, node)?.id : undefined
}

describe('the pointer in play', () => {
  test('lies over a path of layers from the frame down to the deepest', () => {
    const { graph, screen, card, button } = buttonScreen()
    const label = graph.getChildren(button.id)[0]
    expect(pointerPath(graph, screen.id, 22, 22)).toEqual([screen.id, card.id, button.id, label.id])
    expect(pointerPath(graph, screen.id, 150, 150)).toEqual([screen.id])
    expect(pointerPath(graph, screen.id, 900, 900)).toEqual([])
  })

  test('leaves the layers it left, innermost first, and enters the new ones, outermost first', () => {
    expect(pathChanges(['f', 'a', 'b'], ['f', 'c', 'd'])).toEqual({
      left: ['b', 'a'],
      entered: ['c', 'd']
    })
    expect(pathChanges(['f', 'a'], ['f', 'a'])).toEqual({ left: [], entered: [] })
  })

  test('a frame without hover, press, enter or leave reactions needs no pointer tracking', () => {
    const { graph, screen, base } = buttonScreen()
    expect(hasPointerTriggers(graph, screen.id)).toBe(true)
    graph.updateNode(base.id, { prototypeReactions: [] })
    expect(hasPointerTriggers(graph, screen.id)).toBe(false)
  })

  test("reads a layer's reactions to a trigger, an instance's from its variant", () => {
    const { graph, button, hover } = buttonScreen()
    expect(pointerReactions(graph, button.id, 'ON_HOVER')).toEqual([
      {
        sourceId: button.id,
        action: reaction('ON_HOVER', hover.id, 'CHANGE_TO').actions[0],
        transition: { type: 'INSTANT', duration: 0 },
        delayMs: 0
      }
    ])
    expect(pointerReactions(graph, button.id, 'ON_PRESS')).toEqual([])
  })
})

describe('undoing a While hovering or While pressing reaction', () => {
  test('a Change to switches back to the variant it left', () => {
    const { graph, screen, button, base, hover } = buttonScreen()
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)
    const [enter] = pointerReactions(graph, button.id, 'ON_HOVER')
    if (!enter) throw new Error('no hover reaction')
    const done = scenes.run(session, enter)
    const revert = revertFor(session, done, enter, scenes.graphFor(screen.id))
    expect(revert).toEqual({
      kind: 'change',
      watchId: button.id,
      rootId: screen.id,
      instanceId: button.id,
      from: base.id,
      to: hover.id
    })
    if (!revert) throw new Error('no revert')
    scenes.revert(done.session, revert)
    const played = scenes.graphFor(screen.id)
    expect(shows(played, played.getNode(button.id))).toBe(base.id)
  })

  test('a Change to leaves the variant alone once something else changed it', () => {
    const { graph, screen, button, base, hover } = buttonScreen()
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)
    const [enter] = pointerReactions(graph, button.id, 'ON_HOVER')
    if (!enter) throw new Error('no hover reaction')
    const done = scenes.run(session, enter)
    const revert = revertFor(session, done, enter, scenes.graphFor(screen.id))
    if (!revert) throw new Error('no revert')
    // A click meanwhile showed Default; leaving must not switch it again.
    scenes.run(done.session, {
      ...enter,
      action: reaction('ON_CLICK', base.id, 'CHANGE_TO').actions[0]
    })
    scenes.revert(done.session, revert)
    const played = scenes.graphFor(screen.id)
    expect(shows(played, played.getNode(button.id))).toBe(base.id)
    expect(hover.id).toBeDefined()
  })

  test('an overlay it opened closes, and a navigation goes back', () => {
    const { graph, screen, button, tooltip } = buttonScreen()
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)
    const overlay = {
      sourceId: button.id,
      action: reaction('ON_HOVER', tooltip.id, 'OVERLAY').actions[0],
      transition: null
    }
    const opened = scenes.run(session, overlay)
    expect(opened.session.overlays).toEqual([tooltip.id])
    const closing = revertFor(session, opened, overlay, graph)
    if (!closing) throw new Error('no revert')
    expect(scenes.revert(opened.session, closing).session.overlays).toEqual([])

    const navigate = { ...overlay, action: reaction('ON_PRESS', tooltip.id, 'NAVIGATE').actions[0] }
    const moved = scenes.run(session, navigate)
    const back = revertFor(session, moved, navigate, graph)
    if (!back) throw new Error('no revert')
    expect(scenes.revert(moved.session, back).session.frameId).toBe(screen.id)
  })

  test('a reaction that did nothing has nothing to undo', () => {
    const { graph, screen, button, base } = buttonScreen()
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)
    const same = {
      sourceId: button.id,
      action: reaction('ON_HOVER', base.id, 'CHANGE_TO').actions[0],
      transition: null
    }
    expect(revertFor(session, scenes.run(session, same), same, graph)).toBeNull()
  })
})
