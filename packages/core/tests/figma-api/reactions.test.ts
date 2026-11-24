import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import {
  createPlayScenes,
  effectiveReactions,
  reactionAt,
  startSession
} from '@pairdraw/core/prototype'
import { SceneGraph } from '@pairdraw/scene-graph'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { setReactions } from '#core/tools/modify/reactions'
import { getReactions } from '#core/tools/read/reactions'
import { parseToolArgs } from '#core/tools/schema'

/** A home frame with a button on it, and the frame the button should open. */
function screen() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const home = figma.createFrame()
  home.name = 'Home'
  const details = figma.createFrame()
  details.name = 'Details'
  const button = figma.createRectangle()
  button.name = 'Open'
  home.appendChild(button)
  return { figma, graph, home, details, button }
}

/** A click on the layer that navigates to `destinationId`, as Figma's plugin API spells it. */
function clickTo(destinationId: string) {
  return {
    trigger: { type: 'ON_CLICK' as const },
    actions: [
      {
        type: 'NODE' as const,
        destinationId,
        navigation: 'NAVIGATE' as const,
        transition: { type: 'DISSOLVE' as const, duration: 0.3 },
        overlayRelativePosition: 'CENTER' as const
      }
    ]
  }
}

describe('prototype reactions in the plugin shape', () => {
  test('reads back what it wrote, with the frame as the destination', () => {
    const { graph, details, button } = screen()

    Reflect.set(button, 'reactions', [clickTo(details.id)])

    expect(button.reactions).toMatchObject([clickTo(details.id)])
    expect(graph.getNode(details.id)?.prototypeReactions).toEqual([])
  })

  test('keeps the reaction id it had when the connection is rewritten', () => {
    const { graph, details, button } = screen()

    Reflect.set(button, 'reactions', [clickTo(details.id)])
    const before = graph.getNode(button.id)?.prototypeReactions[0]?.id
    Reflect.set(button, 'reactions', [clickTo(details.id)])
    const after = graph.getNode(button.id)?.prototypeReactions[0]?.id

    expect(before).toBeDefined()
    expect(after).toBe(before)
  })

  test('reads a timeout in seconds, which is how the play schedules it', () => {
    const { details, button } = screen()

    Reflect.set(button, 'reactions', [
      {
        trigger: { type: 'AFTER_TIMEOUT', timeout: 2.5 },
        actions: [{ type: 'NODE', destinationId: details.id, navigation: 'NAVIGATE' }]
      }
    ])

    expect(button.reactions[0]?.trigger).toEqual({ type: 'AFTER_TIMEOUT', timeout: 2.5 })
    expect(button.reactions[0]?.actions[0]?.type).toBe('NODE')
  })

  test('reads and writes Smart animate with an easing, by the names Figma gives them', () => {
    const { graph, details, button } = screen()
    const smart = {
      trigger: { type: 'ON_CLICK' as const },
      actions: [
        {
          type: 'NODE' as const,
          destinationId: details.id,
          navigation: 'NAVIGATE' as const,
          transition: {
            type: 'SMART_ANIMATE' as const,
            duration: 0.4,
            easing: { type: 'EASE_IN_AND_OUT' as const }
          },
          overlayRelativePosition: 'CENTER' as const
        }
      ]
    }

    Reflect.set(button, 'reactions', [smart])

    expect(button.reactions).toMatchObject([smart])
    expect(graph.getNode(button.id)?.prototypeReactions[0]?.actions[0]).toMatchObject({
      transition: { type: 'SMART_ANIMATE', duration: 0.4, easing: 'EASE_IN_AND_OUT' }
    })
  })

  test('refuses an easing outside the presets play has', () => {
    const { details, button } = screen()
    const spring = clickTo(details.id)
    const [action] = spring.actions
    Reflect.set(action, 'transition', { ...action.transition, easing: { type: 'GENTLE' } })

    expect(() => Reflect.set(button, 'reactions', [spring])).toThrow('easing')
  })

  test('refuses a trigger the play cannot start from', () => {
    const { details, button } = screen()

    expect(() => {
      Reflect.set(button, 'reactions', [
        {
          trigger: { type: 'ON_DRAG' },
          actions: [{ type: 'NODE', destinationId: details.id, navigation: 'NAVIGATE' }]
        }
      ])
    }).toThrow('ON_CLICK, ON_HOVER, ON_PRESS, MOUSE_ENTER, MOUSE_LEAVE or AFTER_TIMEOUT')
  })

  test('refuses an action the play cannot run', () => {
    const { button } = screen()

    expect(() => {
      Reflect.set(button, 'reactions', [
        { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'URL', url: 'https://example.com' }] }
      ])
    }).toThrow('NODE, BACK or CLOSE')
  })

  test('refuses a destination that is not a top-level frame on the page', () => {
    const { button } = screen()

    expect(() => {
      Reflect.set(button, 'reactions', [clickTo(button.id)])
    }).toThrow('top-level frame on the same page')
  })
})

/** A toggle set with Off and On variants, an instance of Off on a screen, and a lone frame. */
function toggle() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Toggle' })
  const off = graph.createNode('COMPONENT', set.id, { name: 'State=Off' })
  const on = graph.createNode('COMPONENT', set.id, { name: 'State=On', x: 100 })
  const other = graph.createNode('COMPONENT_SET', pageId, { name: 'Tabs' })
  const tab = graph.createNode('COMPONENT', other.id, { name: 'Selected=No' })
  const screen = graph.createNode('FRAME', pageId, { name: 'Screen' })
  const list = graph.createNode('FRAME', screen.id, { name: 'List', overflowDirection: 'VERTICAL' })
  const row = graph.createNode('FRAME', list.id, { name: 'Row' })
  const elsewhere = graph.createNode('FRAME', pageId, { name: 'Elsewhere' })
  const instance = graph.createInstance(off.id, screen.id)
  if (!instance) throw new Error('no instance')
  const figma = new FigmaAPI(graph)
  const proxy = (id: string) => {
    const node = figma.getNodeById(id)
    if (!node) throw new Error(`no node ${id}`)
    return node
  }
  return { graph, figma, proxy, set, off, on, tab, screen, list, row, elsewhere, instance }
}

function action(destinationId: string, navigation: 'CHANGE_TO' | 'SCROLL_TO') {
  return { type: 'NODE' as const, destinationId, navigation }
}

describe('interactive components and scrolling in the plugin shape', () => {
  test('an instance of a variant changes to another variant of its set', () => {
    const { proxy, graph, on, instance } = toggle()
    Reflect.set(proxy(instance.id), 'reactions', [
      { trigger: { type: 'ON_CLICK' }, actions: [action(on.id, 'CHANGE_TO')] }
    ])
    expect(graph.getNode(instance.id)?.prototypeReactions[0]?.actions[0]).toMatchObject({
      type: 'NODE',
      nodeId: on.id,
      navigation: 'CHANGE_TO'
    })
  })

  test('refuses a Change to a variant of another set, or to a frame', () => {
    const { proxy, off, tab, elsewhere } = toggle()
    for (const destination of [tab.id, elsewhere.id]) {
      expect(() => {
        Reflect.set(proxy(off.id), 'reactions', [
          { trigger: { type: 'ON_CLICK' }, actions: [action(destination, 'CHANGE_TO')] }
        ])
      }).toThrow('a variant of Toggle')
    }
  })

  test('refuses a Change to on a layer that is no variant', () => {
    const { proxy, on, elsewhere } = toggle()
    expect(() => {
      Reflect.set(proxy(elsewhere.id), 'reactions', [
        { trigger: { type: 'ON_CLICK' }, actions: [action(on.id, 'CHANGE_TO')] }
      ])
    }).toThrow('only a variant, an instance of one, or a layer inside one can Change to')
  })

  test('scrolls to a layer in the same top-level frame, and refuses one outside it', () => {
    const { proxy, graph, instance, row, elsewhere } = toggle()
    Reflect.set(proxy(instance.id), 'reactions', [
      { trigger: { type: 'ON_PRESS' }, actions: [action(row.id, 'SCROLL_TO')] }
    ])
    expect(graph.getNode(instance.id)?.prototypeReactions[0]?.actions[0]).toMatchObject({
      navigation: 'SCROLL_TO',
      nodeId: row.id
    })
    expect(() => {
      Reflect.set(proxy(instance.id), 'reactions', [
        { trigger: { type: 'ON_CLICK' }, actions: [action(elsewhere.id, 'SCROLL_TO')] }
      ])
    }).toThrow('a layer inside the same top-level frame')
  })

  test('reads and writes a mouse enter delay in seconds', () => {
    const { proxy, row, instance } = toggle()
    const reactions = [
      { trigger: { type: 'MOUSE_ENTER', delay: 0.4 }, actions: [action(row.id, 'SCROLL_TO')] },
      { trigger: { type: 'MOUSE_LEAVE', delay: 0 }, actions: [{ type: 'BACK' }] }
    ]
    const node = proxy(instance.id)
    Reflect.set(node, 'reactions', reactions)
    expect(node.reactions.map((reaction) => reaction.trigger)).toEqual([
      { type: 'MOUSE_ENTER', delay: 0.4 },
      { type: 'MOUSE_LEAVE', delay: 0 }
    ])
  })

  test("a frame's overflowDirection reads and writes its overflow scrolling", () => {
    const { proxy, graph, list, screen } = toggle()
    expect(proxy(list.id).overflowDirection).toBe('VERTICAL')
    proxy(screen.id).overflowDirection = 'HORIZONTAL'
    expect(graph.getNode(screen.id)?.overflowDirection).toBe('HORIZONTAL')
    expect(() => {
      Reflect.set(proxy(screen.id), 'overflowDirection', 'SIDEWAYS')
    }).toThrow('overflowDirection')
  })

  test("an edit to Figma's copy of the main's interaction on an instance is the instance's own", () => {
    const { proxy, graph, off, on, instance, elsewhere } = toggle()
    graph.updateNode(off.id, {
      prototypeReactions: [
        {
          id: '9:1',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: on.id,
              navigation: 'CHANGE_TO',
              transition: { type: 'INSTANT', duration: 0 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    // As Figma writes it: the instance carries the main's interaction under the main's id.
    graph.updateNode(instance.id, {
      prototypeReactions: graph.getNode(off.id)?.prototypeReactions ?? []
    })
    const node = proxy(instance.id)
    Reflect.set(node, 'reactions', node.reactions)
    expect(graph.getNode(instance.id)?.prototypeReactions[0]?.id).toBe('9:1')

    Reflect.set(node, 'reactions', [
      {
        trigger: { type: 'ON_CLICK' },
        actions: [{ type: 'NODE', destinationId: elsewhere.id, navigation: 'NAVIGATE' }]
      }
    ])
    expect(graph.getNode(instance.id)?.prototypeReactions[0]?.id).not.toBe('9:1')
  })

  test("writing an instance's reactions back unchanged keeps Figma's copy, which runs the main's edit", async () => {
    const { figma, graph, off, on, instance, elsewhere } = toggle()
    const changeTo = {
      id: '9:1',
      trigger: { type: 'ON_CLICK' as const, delay: 0 },
      actions: [
        {
          type: 'NODE' as const,
          nodeId: on.id,
          navigation: 'CHANGE_TO' as const,
          transition: { type: 'INSTANT' as const, duration: 0 },
          overlayPosition: 'CENTER' as const
        }
      ]
    }
    graph.updateNode(off.id, { prototypeReactions: [changeTo] })
    graph.updateNode(instance.id, { prototypeReactions: [{ ...changeTo }] })
    // The designer edits the main; the instance still carries the old copy.
    graph.updateNode(off.id, {
      prototypeReactions: [
        {
          ...changeTo,
          actions: [
            { ...changeTo.actions[0], nodeId: elsewhere.id, navigation: 'NAVIGATE' as const }
          ]
        }
      ]
    })
    const read = figma.getNodeById(instance.id)?.reactions ?? []
    await setReactions.execute(figma, { id: instance.id, reactions: [...read] })

    const held = graph.getNode(instance.id)
    expect(held?.prototypeReactions[0]?.id).toBe('9:1')
    if (!held) throw new Error('no instance')
    expect(effectiveReactions(graph, held)[0]?.actions[0]).toMatchObject({ nodeId: elsewhere.id })
  })

  test('refuses overflow scrolling on a layer that cannot scroll', () => {
    const { figma, graph } = toggle()
    const rect = figma.createRectangle()
    expect(() => {
      Reflect.set(rect, 'overflowDirection', 'VERTICAL')
    }).toThrow('Only a frame, component or instance scrolls')
    expect(graph.getNode(rect.id)?.overflowDirection).toBe('NONE')
  })
})

describe('reactions on layers inside a component', () => {
  function childToggle() {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Button' })
    const main = graph.createNode('COMPONENT', set.id, { width: 60, height: 30 })
    const label = graph.createNode('RECTANGLE', main.id, {
      name: 'Label',
      width: 60,
      height: 30
    })
    const screen = graph.createNode('FRAME', pageId, { width: 200, height: 200 })
    const elsewhere = graph.createNode('FRAME', pageId, { x: 300, name: 'Elsewhere' })
    const instance = graph.createInstance(main.id, screen.id)
    if (!instance) throw new Error('no instance')
    const copy = graph.getChildren(instance.id)[0]
    if (!copy) throw new Error('no copied label')
    return { graph, main, label, screen, elsewhere, instance, copy }
  }

  const navigate = (id: string, nodeId: string) => ({
    id,
    trigger: { type: 'ON_CLICK' as const, delay: 0 },
    actions: [
      {
        type: 'NODE' as const,
        nodeId,
        navigation: 'NAVIGATE' as const,
        transition: { type: 'INSTANT' as const, duration: 0 },
        overlayPosition: 'CENTER' as const
      }
    ]
  })

  test("a child's click reaction runs from its copy in play", () => {
    const { graph, label, screen, elsewhere, copy } = childToggle()
    graph.updateNode(label.id, { prototypeReactions: [navigate('child-nav', elsewhere.id)] })

    const hit = reactionAt(graph, startSession(screen.id), 30, 15)
    expect(hit?.action).toMatchObject({ nodeId: elsewhere.id, navigation: 'NAVIGATE' })
    expect(effectiveReactions(graph, copy).map((reaction) => reaction.id)).toEqual([
      'child-nav'
    ])
  })

  test('hover, press, and After delay on a child are inherited from the main', () => {
    const { graph, label, screen, elsewhere, copy } = childToggle()
    const triggers = ['ON_HOVER', 'ON_PRESS', 'AFTER_TIMEOUT'] as const
    graph.updateNode(label.id, {
      prototypeReactions: triggers.map((type) => ({
        ...navigate(`child-${type}`, elsewhere.id),
        trigger: { type, delay: type === 'AFTER_TIMEOUT' ? 2 : 0 }
      }))
    })

    expect(effectiveReactions(graph, copy).map((reaction) => reaction.id)).toEqual([
      'child-ON_HOVER',
      'child-ON_PRESS',
      'child-AFTER_TIMEOUT'
    ])
    const session = startSession(screen.id)
    for (const trigger of triggers)
      expect(reactionAt(graph, session, 30, 15, trigger)?.action).toMatchObject({
        nodeId: elsewhere.id
      })
  })

  test('a child of a nested instance sees a reaction added to its main afterwards', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const leaf = graph.createNode('COMPONENT', pageId, { width: 60, height: 30 })
    const label = graph.createNode('RECTANGLE', leaf.id, {
      name: 'Label',
      width: 60,
      height: 30
    })
    const middle = graph.createNode('COMPONENT', pageId, { width: 60, height: 30 })
    graph.createInstance(leaf.id, middle.id)
    const outer = graph.createNode('COMPONENT', pageId, { width: 60, height: 30 })
    graph.createInstance(middle.id, outer.id)
    const screen = graph.createNode('FRAME', pageId, { width: 200, height: 200 })
    const elsewhere = graph.createNode('FRAME', pageId, { x: 300, name: 'Elsewhere' })
    const outerCopy = graph.createInstance(outer.id, screen.id)
    if (!outerCopy) throw new Error('no outer instance')
    const middleCopy = graph.getChildren(outerCopy.id)[0]
    if (!middleCopy) throw new Error('no middle copy')
    const leafCopy = graph.getChildren(middleCopy.id)[0]
    if (!leafCopy) throw new Error('no leaf copy')
    const deepLabel = graph.getChildren(leafCopy.id)[0]
    if (!deepLabel) throw new Error('no deep label')

    // The reaction arrives after every instance exists.
    graph.updateNode(label.id, { prototypeReactions: [navigate('late-nav', elsewhere.id)] })

    expect(effectiveReactions(graph, deepLabel).map((reaction) => reaction.id)).toEqual([
      'late-nav'
    ])
    expect(reactionAt(graph, startSession(screen.id), 30, 15)?.action).toMatchObject({
      nodeId: elsewhere.id
    })
  })

  test("an edited child's own reaction replaces the main's, and a copied id follows the main", () => {
    const { graph, label, elsewhere, copy, screen } = childToggle()
    graph.updateNode(label.id, { prototypeReactions: [navigate('main-nav', elsewhere.id)] })
    const copied = graph.getNode(copy.id)
    if (!copied) throw new Error('no copy')
    graph.updateNode(copy.id, {
      prototypeReactions: [navigate('main-nav', 'old-destination')]
    })
    // The copy still carries the main's id, so the main's current edit is what runs.
    expect(effectiveReactions(graph, copied)[0]?.actions[0]).toMatchObject({
      nodeId: elsewhere.id
    })

    graph.updateNode(copy.id, {
      prototypeReactions: [navigate('own-nav', screen.id)]
    })
    expect(effectiveReactions(graph, graph.getNode(copy.id) ?? copied).map((r) => r.id)).toEqual([
      'own-nav'
    ])
  })
})

describe('a Change to named by variant properties', () => {
  test('resolves the variant of the layer\'s set and reads back its id', () => {
    const { proxy, graph, off, on } = toggle()
    Reflect.set(proxy(off.id), 'reactions', [
      {
        trigger: { type: 'ON_HOVER' },
        actions: [{ type: 'NODE', variantProperties: { State: 'On' }, navigation: 'CHANGE_TO' }]
      }
    ])
    expect(graph.getNode(off.id)?.prototypeReactions[0]?.actions[0]).toMatchObject({
      type: 'NODE',
      nodeId: on.id,
      navigation: 'CHANGE_TO'
    })
  })

  test('matches a variant whose values are stored, as an imported slash set names them', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const set = graph.createNode('COMPONENT_SET', pageId, { name: 'Tabs' })
    const off = graph.createNode('COMPONENT', set.id, {
      name: 'Off',
      componentPropertyValues: { Variant: 'Off' }
    })
    graph.createNode('COMPONENT', set.id, {
      name: 'On',
      componentPropertyValues: { Variant: 'On' }
    })
    const proxy = new FigmaAPI(graph).getNodeById(off.id)
    if (!proxy) throw new Error('no variant')
    Reflect.set(proxy, 'reactions', [
      {
        trigger: { type: 'ON_CLICK' },
        actions: [{ type: 'NODE', variantProperties: { Variant: 'On' }, navigation: 'CHANGE_TO' }]
      }
    ])
    const destination = graph.getNode(off.id)?.prototypeReactions[0]?.actions[0]
    expect(destination).toMatchObject({ navigation: 'CHANGE_TO' })
    if (destination?.type !== 'NODE' || !destination.nodeId) throw new Error('no NODE action')
    expect(graph.getNode(destination.nodeId)?.name).toBe('On')
  })

  test('refuses properties no variant of the set has', () => {
    const { proxy, off } = toggle()
    expect(() => {
      Reflect.set(proxy(off.id), 'reactions', [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', variantProperties: { State: 'Pressed' }, navigation: 'CHANGE_TO' }]
        }
      ])
    }).toThrow('no variant of Toggle with State=Pressed')
  })

  test('refuses variant properties on a navigation that is not Change to', () => {
    const { proxy, off } = toggle()
    expect(() => {
      Reflect.set(proxy(off.id), 'reactions', [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [{ type: 'NODE', variantProperties: { State: 'On' }, navigation: 'NAVIGATE' }]
        }
      ])
    }).toThrow('variantProperties is for CHANGE_TO')
  })

  test('refuses an action naming both a destination id and variant properties', () => {
    const { proxy, off, on } = toggle()
    expect(() => {
      Reflect.set(proxy(off.id), 'reactions', [
        {
          trigger: { type: 'ON_CLICK' },
          actions: [
            {
              type: 'NODE',
              destinationId: on.id,
              variantProperties: { State: 'On' },
              navigation: 'CHANGE_TO'
            }
          ]
        }
      ])
    }).toThrow('both destinationId and variantProperties')
  })

  test('refuses an action that names no destination at all', () => {
    const { proxy, off } = toggle()
    expect(() => {
      Reflect.set(proxy(off.id), 'reactions', [
        { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'CHANGE_TO' }] }
      ])
    }).toThrow('name the variant it Changes to')
  })
})

describe('prototype connection tools', () => {
  test('set_reactions writes what get_reactions reads back', async () => {
    const { figma, details, button } = screen()
    const connection = clickTo(details.id)

    const written = await setReactions.execute(figma, {
      id: button.id,
      reactions: [connection]
    })
    const read = await getReactions.execute(figma, { id: button.id })

    expect(written).toMatchObject({ id: button.id, reactions: [connection] })
    expect(read).toMatchObject({ id: button.id, reactions: [connection] })
  })

  test('set_reactions refuses a trigger the play cannot start from', () => {
    const { button } = screen()

    // The tool contract rejects it before it can reach the layer, naming the allowed triggers.
    expect(() =>
      parseToolArgs('set_reactions', setReactions.input, {
        id: button.id,
        reactions: [
          {
            trigger: { type: 'ON_DRAG' },
            actions: [{ type: 'NODE', destinationId: button.id, navigation: 'NAVIGATE' }]
          }
        ]
      })
    ).toThrow('ON_CLICK')
  })

  test('authors a hover Change to by variant properties, which plays and survives a .fig round trip', async () => {
    const { graph, figma, screen, instance, off, on } = toggle()
    const args = parseToolArgs('set_reactions', setReactions.input, {
      id: instance.id,
      reactions: [
        {
          trigger: { type: 'ON_HOVER' },
          actions: [
            {
              type: 'NODE',
              variantProperties: { State: 'On' },
              navigation: 'CHANGE_TO',
              transition: { type: 'SMART_ANIMATE', duration: 0.3, easing: { type: 'EASE_OUT' } }
            }
          ]
        }
      ]
    })
    const written = await setReactions.execute(figma, args)
    expect(written).toMatchObject({
      reactions: [
        {
          trigger: { type: 'ON_HOVER' },
          actions: [{ destinationId: on.id, navigation: 'CHANGE_TO' }]
        }
      ]
    })

    const stored = graph.getNode(instance.id)?.prototypeReactions[0]
    if (!stored) throw new Error('no reaction')
    const scenes = createPlayScenes(() => graph)
    const action = stored.actions[0]
    const played = scenes.run(startSession(screen.id), {
      sourceId: instance.id,
      action,
      transition: action.type === 'NODE' ? action.transition : null
    })
    expect(played.changed).toMatchObject({ instanceId: instance.id, from: off.id, to: on.id })
    const shown = scenes.graphFor(screen.id).getNode(instance.id)
    const kept = graph.getNode(instance.id)
    if (!shown || !kept) throw new Error('no instance')
    expect(instanceMainComponent(scenes.graphFor(screen.id), shown)?.id).toBe(on.id)
    expect(instanceMainComponent(graph, kept)?.id).toBe(off.id)

    const reopened = await parseFigFile((await exportFigFile(graph)).slice().buffer, {
      populate: 'first-page'
    })
    expect(reopened.getNode(instance.id)?.prototypeReactions[0]).toMatchObject({
      trigger: { type: 'ON_HOVER' },
      actions: [{ nodeId: on.id, navigation: 'CHANGE_TO' }]
    })
  })

  test('set_reactions writes a Change to on a variant, and get_reactions reads it back', async () => {
    const { figma, off, on } = toggle()
    const changeTo = {
      trigger: { type: 'ON_HOVER' as const },
      actions: [
        {
          type: 'NODE' as const,
          destinationId: on.id,
          navigation: 'CHANGE_TO' as const,
          transition: { type: 'DISSOLVE' as const, duration: 0.2 },
          overlayRelativePosition: 'CENTER' as const
        }
      ]
    }
    const args = parseToolArgs('set_reactions', setReactions.input, {
      id: off.id,
      reactions: [changeTo]
    })
    await setReactions.execute(figma, args)
    expect(await getReactions.execute(figma, { id: off.id })).toMatchObject({
      reactions: [changeTo]
    })
  })
})
