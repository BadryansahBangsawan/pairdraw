import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import {
  inheritedReactionCount,
  scrollDestinations,
  variantDestinations
} from '@/app/editor/prototype/destinations'
import {
  actionChoice,
  createReaction,
  setActionChoice,
  setDelay,
  setTarget,
  setTriggerType
} from '@/app/editor/prototype/reactions'

/** A Toggle set with one property, a Button set with two, and an instance of each on a screen. */
function components() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const toggles = graph.createNode('COMPONENT_SET', pageId, { name: 'Toggle' })
  const off = graph.createNode('COMPONENT', toggles.id, { name: 'State=Off' })
  const on = graph.createNode('COMPONENT', toggles.id, { name: 'State=On', x: 50 })
  const buttons = graph.createNode('COMPONENT_SET', pageId, { name: 'Button', y: 200 })
  const small = graph.createNode('COMPONENT', buttons.id, { name: 'Size=S, State=Default' })
  const large = graph.createNode('COMPONENT', buttons.id, { name: 'Size=L, State=Hover', x: 50 })
  graph.createInstance(off.id, small.id)
  const screen = graph.createNode('FRAME', pageId, { name: 'Screen', x: 500 })
  const toggle = graph.createInstance(off.id, screen.id)
  if (!toggle) throw new Error('no instance')
  return { graph, off, on, small, large, screen, toggle }
}

describe('the variants a Change to can show', () => {
  test("are the variants of the layer's set, named by the value that tells them apart", () => {
    const { graph, toggle, off, on } = components()
    expect(variantDestinations(graph, toggle.id)).toEqual([
      { value: off.id, label: 'Off' },
      { value: on.id, label: 'On' }
    ])
  })

  test('keep every property in the name when a set has several', () => {
    const { graph, small, large } = components()
    expect(variantDestinations(graph, small.id).slice(0, 2)).toEqual([
      { value: small.id, label: 'Size=S, State=Default' },
      { value: large.id, label: 'Size=L, State=Hover' }
    ])
  })

  test('name the set when a layer sits in variants of more than one', () => {
    const { graph, small, off, on } = components()
    const nested = graph.getChildren(small.id)[0]
    expect(variantDestinations(graph, nested.id).slice(0, 2)).toEqual([
      { value: off.id, label: 'Toggle: Off' },
      { value: on.id, label: 'Toggle: On' }
    ])
  })

  test('are none for a layer outside any variant', () => {
    const { graph, screen } = components()
    expect(variantDestinations(graph, screen.id)).toEqual([])
  })
})

describe("an instance's interactions from its main component", () => {
  test('count those its own do not replace', () => {
    const { graph, toggle, off, on } = components()
    const click = setTarget(setActionChoice(createReaction(), 'CHANGE_TO'), on.id)
    const hover = setTriggerType(click, 'ON_HOVER')
    graph.updateNode(off.id, { prototypeReactions: [click, hover] })
    expect(inheritedReactionCount(graph, toggle.id)).toBe(2)
    graph.updateNode(toggle.id, { prototypeReactions: [createReaction()] })
    expect(inheritedReactionCount(graph, toggle.id)).toBe(1)
    expect(inheritedReactionCount(graph, off.id)).toBe(0)
  })

  test("count Figma's copies of them on the instance, which play does not run as its own", () => {
    const { graph, toggle, off, on } = components()
    const click = setTarget(setActionChoice(createReaction(), 'CHANGE_TO'), on.id)
    graph.updateNode(off.id, { prototypeReactions: [click] })
    graph.updateNode(toggle.id, { prototypeReactions: [{ ...click }] })
    expect(inheritedReactionCount(graph, toggle.id)).toBe(1)
  })
})

describe('editing an interaction', () => {
  test('a Change to drops a frame picked for a navigation, and keeps its variant while it stays one', () => {
    const navigate = setTarget(createReaction(), '1:2')
    const change = setActionChoice(navigate, 'CHANGE_TO')
    expect(actionChoice(change)).toBe('CHANGE_TO')
    expect(change.actions[0]).toMatchObject({ type: 'NODE', nodeId: null })
    const picked = setTarget(change, '1:9')
    expect(setActionChoice(picked, 'CHANGE_TO')).toBe(picked)
    // An overlay points at a frame as a navigation does, so the frame stays.
    expect(setActionChoice(navigate, 'OVERLAY').actions[0]).toMatchObject({ nodeId: '1:2' })
  })

  test('a mouse enter or leave keeps its delay between them and starts at none', () => {
    const enter = setTriggerType(createReaction(), 'MOUSE_ENTER')
    expect(enter.trigger).toEqual({ type: 'MOUSE_ENTER', delay: 0 })
    const waited = setDelay(enter, 0.4)
    expect(setTriggerType(waited, 'MOUSE_LEAVE').trigger).toEqual({
      type: 'MOUSE_LEAVE',
      delay: 0.4
    })
    expect(setTriggerType(waited, 'ON_HOVER').trigger).toEqual({ type: 'ON_HOVER', delay: 0 })
  })
})

describe('the layers a Scroll to can bring into view', () => {
  /** A screen holding a button and a list that scrolls, with two rows and a hidden third. */
  function screenWithList(overflow: 'VERTICAL' | 'NONE') {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const screen = graph.createNode('FRAME', pageId, { name: 'Screen' })
    const button = graph.createNode('RECTANGLE', screen.id, { name: 'Jump' })
    const list = graph.createNode('FRAME', screen.id, {
      name: 'List',
      clipsContent: true,
      overflowDirection: overflow
    })
    const first = graph.createNode('FRAME', list.id, { name: 'Account' })
    const deep = graph.createNode('TEXT', first.id, { name: 'Email' })
    const second = graph.createNode('FRAME', list.id, { name: 'Privacy' })
    graph.createNode('FRAME', list.id, { name: 'Hidden', visible: false })
    return { graph, screen, button, first, deep, second }
  }

  test('are the visible layers inside frames that scroll on the same screen, indented by depth', () => {
    const { graph, button, first, deep, second } = screenWithList('VERTICAL')
    expect(scrollDestinations(graph, button.id)).toEqual([
      { value: first.id, label: 'Account' },
      { value: deep.id, label: '\u00a0\u00a0Email' },
      { value: second.id, label: 'Privacy' }
    ])
  })

  test('are none on a screen where nothing scrolls', () => {
    const { graph, button } = screenWithList('NONE')
    expect(scrollDestinations(graph, button.id)).toEqual([])
  })

  test("include a screen's own layers when the screen scrolls by panning", () => {
    const { graph, screen, button } = screenWithList('NONE')
    graph.updateNode(screen.id, { overflowDirection: 'VERTICAL' })
    expect(scrollDestinations(graph, button.id).map((option) => option.label)).toContain('List')
  })
})
