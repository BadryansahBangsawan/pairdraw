import { describe, expect, test } from 'bun:test'

import {
  asInstanceEdit,
  createPlayScenes,
  effectiveReactions,
  reactionAt,
  startSession,
  type PlayClick
} from '@pairdraw/core/prototype'
import { SceneGraph, type PrototypeReaction, type SceneNode } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

function changeTo(variantId: string, trigger: PrototypeReaction['trigger']['type'] = 'ON_CLICK') {
  return {
    id: `change-${variantId}`,
    trigger: { type: trigger, delay: trigger === 'AFTER_TIMEOUT' ? 2 : 0 },
    actions: [
      {
        type: 'NODE',
        nodeId: variantId,
        navigation: 'CHANGE_TO',
        transition: { type: 'INSTANT', duration: 0 },
        overlayPosition: 'CENTER'
      }
    ]
  } satisfies PrototypeReaction
}

/**
 * A Toggle set whose Off variant (40×20) changes to On (40×40) on click and back, and a screen
 * whose vertical auto layout holds an instance of Off above a 10 px bar, plus a second screen.
 */
function toggleScreen() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Toggle', x: 0, y: 500 })
  const off = graph.createNode('COMPONENT', set.id, {
    name: 'State=Off',
    width: 40,
    height: 20,
    componentPropertyValues: { State: 'Off' }
  })
  const on = graph.createNode('COMPONENT', set.id, {
    name: 'State=On',
    x: 60,
    width: 40,
    height: 40,
    componentPropertyValues: { State: 'On' }
  })
  graph.createNode('RECTANGLE', on.id, { name: 'Knob', width: 10, height: 10 })
  graph.updateNode(off.id, { prototypeReactions: [changeTo(on.id)] })
  graph.updateNode(on.id, { prototypeReactions: [changeTo(off.id)] })
  const screen = graph.createNode('FRAME', pageId, {
    name: 'Screen',
    width: 200,
    height: 100,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG'
  })
  const instance = graph.createInstance(off.id, screen.id)
  if (!instance) throw new Error('no instance')
  const bar = graph.createNode('RECTANGLE', screen.id, {
    name: 'Bar',
    y: 20,
    width: 200,
    height: 10
  })
  const other = graph.createNode('FRAME', pageId, {
    name: 'Other',
    x: 400,
    width: 100,
    height: 100
  })
  return { graph, pageId, set, off, on, screen, instance, bar, other }
}

function click(sourceId: string, action: PrototypeReaction['actions'][number]): PlayClick {
  return { sourceId, action, transition: null }
}

function mainOf(graph: SceneGraph, node: SceneNode | undefined): string | undefined {
  return node ? instanceMainComponent(graph, node)?.id : undefined
}

describe('Change to in play', () => {
  test('switches the instance on a private copy and leaves the document alone', () => {
    const { graph, screen, instance, on, off } = toggleScreen()
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)
    let documentEvents = 0
    graph.onNodeEvents({ updated: () => documentEvents++, created: () => documentEvents++ })

    const result = scenes.run(session, click(instance.id, changeTo(on.id).actions[0]))

    expect(result.session).toEqual(session)
    expect(result.changed).toEqual({
      rootId: screen.id,
      instanceId: instance.id,
      from: off.id,
      to: on.id
    })
    const played = scenes.graphFor(screen.id)
    expect(mainOf(played, played.getNode(instance.id))).toBe(on.id)
    expect(mainOf(graph, graph.getNode(instance.id))).toBe(off.id)
    expect(documentEvents).toBe(0)
  })

  test('a Smart animate Change to moves from the variant it left to the one it shows', () => {
    const { graph, screen, instance, bar, on, off } = toggleScreen()
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)
    const action = changeTo(on.id).actions[0]
    const smart = {
      ...action,
      transition: { type: 'SMART_ANIMATE' as const, duration: 0.3, easing: 'LINEAR' as const }
    }

    const result = scenes.run(session, {
      sourceId: instance.id,
      action: smart,
      transition: smart.transition
    })
    const animation = result.animation
    if (!animation) throw new Error('no animation')

    expect(animation.rootId).toBe(screen.id)
    animation.seek(0)
    expect(animation.graph.getNode(instance.id)?.height).toBe(20)
    expect(animation.graph.getNode(bar.id)?.y).toBe(20)
    const knob = animation.graph.getChildren(instance.id).find((child) => child.name === 'Knob')
    expect(knob?.opacity).toBe(0)
    animation.seek(0.5)
    expect(animation.graph.getNode(instance.id)?.height).toBe(30)
    expect(animation.graph.getNode(bar.id)?.y).toBe(30)
    // The copy play keeps shows the new variant at once; the animation is drawn over it.
    const played = scenes.graphFor(screen.id)
    expect(mainOf(played, played.getNode(instance.id))).toBe(on.id)

    // Switching back animates from the copy as it is now, which the animation left alone.
    const back = scenes.run(result.session, {
      sourceId: instance.id,
      action: { ...smart, nodeId: off.id },
      transition: smart.transition
    })
    back.animation?.seek(0)
    expect(back.animation?.graph.getNode(instance.id)?.height).toBe(40)
  })

  test('a Change to that does not Smart animate has no animation', () => {
    const { graph, screen, instance, on } = toggleScreen()
    const scenes = createPlayScenes(() => graph)

    const result = scenes.run(
      startSession(screen.id),
      click(instance.id, changeTo(on.id).actions[0])
    )

    expect(result.animation ?? null).toBeNull()
  })

  test('lays out the auto layout around the switched instance, and nothing else', () => {
    const { graph, screen, instance, on, other } = toggleScreen()
    // A size the document recorded but never laid out, which a full layout would change.
    graph.createNode('RECTANGLE', other.id, { width: 10, height: 300 })
    graph.updateNode(other.id, { layoutMode: 'VERTICAL', primaryAxisSizing: 'HUG', height: 100 })
    const scenes = createPlayScenes(() => graph)

    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))

    const played = scenes.graphFor(screen.id)
    expect(played.getNode(instance.id)?.height).toBe(40)
    expect(played.getNode(screen.id)?.height).toBe(50)
    expect(scenes.graphFor(other.id).getNode(other.id)?.height).toBe(100)
  })

  test("runs the variant's reaction on its instances, the one it shows now", () => {
    const { graph, screen, instance, on, off } = toggleScreen()
    const scenes = createPlayScenes(() => graph)
    let session = startSession(screen.id)
    for (const expected of [on.id, off.id, on.id]) {
      const played = scenes.graphFor(screen.id)
      const hit = reactionAt(played, session, 5, 5)
      if (!hit) throw new Error('no reaction under the instance')
      expect(hit.sourceId).not.toBe(screen.id)
      session = scenes.run(session, hit).session
      const after = scenes.graphFor(screen.id)
      expect(mainOf(after, after.getNode(instance.id))).toBe(expected)
    }
  })

  test("drops an instance's copy of the reaction it inherited, as Figma writes one, once it switches", () => {
    const { graph, screen, instance, on, off } = toggleScreen()
    // Figma's files carry the main component's interactions on each instance, too.
    graph.updateNode(instance.id, { prototypeReactions: [{ ...changeTo(on.id), id: 'copy' }] })
    const scenes = createPlayScenes(() => graph)
    let session = startSession(screen.id)
    const first = reactionAt(scenes.graphFor(screen.id), session, 5, 5)
    if (!first) throw new Error('no reaction')
    session = scenes.run(session, first).session
    const second = reactionAt(scenes.graphFor(screen.id), session, 5, 5)
    expect(second?.action).toMatchObject({ nodeId: off.id })
  })

  test("runs a variant's edited reaction on instances that carry Figma's copy of the old one", () => {
    const { graph, screen, instance, on, off, other } = toggleScreen()
    // Figma writes the main's interaction on each instance, with the main's id.
    graph.updateNode(instance.id, { prototypeReactions: [changeTo(on.id)] })
    const navigate: PrototypeReaction = {
      id: changeTo(on.id).id,
      trigger: { type: 'ON_CLICK', delay: 0 },
      actions: [
        {
          type: 'NODE',
          nodeId: other.id,
          navigation: 'NAVIGATE',
          transition: { type: 'INSTANT', duration: 0 },
          overlayPosition: 'CENTER'
        }
      ]
    }
    graph.updateNode(off.id, { prototypeReactions: [navigate] })
    const hit = reactionAt(graph, startSession(screen.id), 5, 5)
    expect(hit?.action).toMatchObject({ nodeId: other.id })

    // The copy goes with a switch even when the main it came from was edited since.
    graph.updateNode(off.id, {
      prototypeReactions: [{ ...changeTo(on.id), actions: [{ type: 'BACK' }] }]
    })
    const scenes = createPlayScenes(() => graph)
    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))
    const after = reactionAt(scenes.graphFor(screen.id), startSession(screen.id), 5, 5)
    expect(after?.action).toMatchObject({ nodeId: off.id })
  })

  test("an edit to Figma's copy on an instance becomes the instance's own, which play runs", () => {
    const { graph, screen, instance, on, other } = toggleScreen()
    const off = instanceMainComponent(graph, instance)
    const [main] = off?.prototypeReactions ?? []
    if (!off || !main) throw new Error('no main reaction')
    const copy = { ...main }
    // Unchanged, the copy keeps the main's id and stays a copy.
    expect(asInstanceEdit(copy, off.prototypeReactions)).toBe(copy)
    const navigate: PrototypeReaction = {
      ...copy,
      actions: [
        {
          type: 'NODE',
          nodeId: other.id,
          navigation: 'NAVIGATE',
          transition: { type: 'INSTANT', duration: 0 },
          overlayPosition: 'CENTER'
        }
      ]
    }
    const edited = asInstanceEdit(navigate, off.prototypeReactions)
    expect(edited.id).not.toBe(main.id)
    graph.updateNode(instance.id, { prototypeReactions: [edited] })
    expect(reactionAt(graph, startSession(screen.id), 5, 5)?.action).toMatchObject({
      nodeId: other.id
    })
    expect(on.id).toBeDefined()
  })

  test("an instance's own reaction replaces the main's of the same trigger", () => {
    const { graph, instance, other, on } = toggleScreen()
    const navigate: PrototypeReaction = {
      id: 'own',
      trigger: { type: 'ON_CLICK', delay: 0 },
      actions: [
        {
          type: 'NODE',
          nodeId: other.id,
          navigation: 'NAVIGATE',
          transition: { type: 'INSTANT', duration: 0 },
          overlayPosition: 'CENTER'
        }
      ]
    }
    const hover = { ...changeTo(on.id, 'ON_HOVER'), id: 'own-hover' }
    graph.updateNode(instance.id, { prototypeReactions: [navigate, hover] })
    const node = graph.getNode(instance.id)
    if (!node) throw new Error('no instance')
    expect(effectiveReactions(graph, node).map((reaction) => reaction.id)).toEqual([
      'own',
      hover.id
    ])
  })

  test('switches the nearest instance of the target variant set', () => {
    const { graph, pageId, screen, off, on } = toggleScreen()
    const rows = graph.createNode('COMPONENT_SET', pageId, { name: 'Row', y: 800 })
    const closed = graph.createNode('COMPONENT', rows.id, {
      name: 'Open=No',
      width: 100,
      height: 40
    })
    const open = graph.createNode('COMPONENT', rows.id, {
      name: 'Open=Yes',
      width: 100,
      height: 80
    })
    graph.createInstance(off.id, closed.id)
    const row = graph.createInstance(closed.id, screen.id, { x: 0 })
    if (!row) throw new Error('no row')
    const nestedToggle = graph.getChildren(row.id)[0]
    const scenes = createPlayScenes(() => graph)
    const session = startSession(screen.id)

    scenes.run(session, click(nestedToggle.id, changeTo(on.id).actions[0]))
    let played = scenes.graphFor(screen.id)
    expect(mainOf(played, played.getNode(nestedToggle.id))).toBe(on.id)
    expect(mainOf(played, played.getNode(row.id))).toBe(closed.id)

    scenes.run(session, click(nestedToggle.id, changeTo(open.id).actions[0]))
    played = scenes.graphFor(screen.id)
    expect(mainOf(played, played.getNode(row.id))).toBe(open.id)
  })

  test('does nothing for a variant of a set the layer is not in', () => {
    const { graph, screen, bar, on } = toggleScreen()
    const scenes = createPlayScenes(() => graph)
    const result = scenes.run(startSession(screen.id), click(bar.id, changeTo(on.id).actions[0]))
    expect(result.changed).toBeNull()
    expect(scenes.views.size).toBe(0)
  })

  test('the canvas draws a changed frame from its copy, and knows what the change touched', () => {
    const { graph, screen, instance, on, off } = toggleScreen()
    const scenes = createPlayScenes(() => graph)
    expect(scenes.views.size).toBe(0)
    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))
    const view = scenes.views.get(screen.id)
    expect(view?.graph).toBe(scenes.graphFor(screen.id))
    expect(view?.graph).not.toBe(graph)
    expect(view?.touched.has(instance.id)).toBe(true)
    expect(view?.touched.has(screen.id)).toBe(true)
    const revision = view?.revision ?? 0
    // Already showing On: nothing changes.
    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))
    expect(scenes.views.get(screen.id)?.revision).toBe(revision)
    scenes.run(startSession(screen.id), click(instance.id, changeTo(off.id).actions[0]))
    expect(scenes.views.get(screen.id)?.revision).toBeGreaterThan(revision)
  })

  test('keeps a bounded number of changed frames and forgets one the document changed', () => {
    const { graph, pageId, off, on, screen, instance } = toggleScreen()
    const screens = [screen.id]
    const instances = [instance.id]
    for (let index = 0; index < 2; index++) {
      const extra = graph.createNode('FRAME', pageId, {
        x: 1000 + index * 300,
        width: 100,
        height: 100
      })
      const copy = graph.createInstance(off.id, extra.id)
      if (!copy) throw new Error('no instance')
      screens.push(extra.id)
      instances.push(copy.id)
    }
    const scenes = createPlayScenes(() => graph, 2)
    screens.forEach((rootId, index) =>
      scenes.run(startSession(rootId), click(instances[index], changeTo(on.id).actions[0]))
    )
    expect([...scenes.views.keys()]).toEqual(screens.slice(1))

    scenes.forget([instances[2]])
    expect([...scenes.views.keys()]).toEqual([screens[1]])
    scenes.clear()
    expect(scenes.views.size).toBe(0)
  })

  test('forgets a changed frame when the document edits or deletes a variant its copy holds', () => {
    const { graph, set, screen, instance, on } = toggleScreen()
    const spare = graph.createNode('COMPONENT', set.id, { name: 'State=Spare', x: 120 })
    const scenes = createPlayScenes(() => graph)
    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))
    expect(scenes.views.size).toBe(1)

    // The variants live outside the frame, on the page; the copy holds them all the same.
    scenes.forget([on.id])
    expect(scenes.views.size).toBe(0)

    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))
    graph.deleteNode(spare.id)
    scenes.forget([spare.id])
    expect(scenes.views.size).toBe(0)
    // A Change to the deleted variant then does nothing.
    const gone = scenes.run(
      startSession(screen.id),
      click(instance.id, changeTo(spare.id).actions[0])
    )
    expect(gone.changed).toBeNull()
  })

  test('lists the After delay reactions of the instances a frame shows, by the variant they show', () => {
    const { graph, screen, instance, on, off } = toggleScreen()
    graph.updateNode(on.id, { prototypeReactions: [changeTo(off.id, 'AFTER_TIMEOUT')] })
    const scenes = createPlayScenes(() => graph)
    expect(scenes.instanceTimeouts(screen.id)).toEqual([])

    scenes.run(startSession(screen.id), click(instance.id, changeTo(on.id).actions[0]))
    expect(scenes.instanceTimeouts(screen.id)).toEqual([
      {
        sourceId: instance.id,
        variantId: on.id,
        reactionId: changeTo(off.id, 'AFTER_TIMEOUT').id,
        action: changeTo(off.id).actions[0],
        delayMs: 2000
      }
    ])
  })
})
