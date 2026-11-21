import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

function tool(name: string) {
  const found = ALL_TOOLS.find((item) => item.name === name)
  if (!found) throw new Error(`No tool ${name}`)
  return (figma: FigmaAPI, args: Record<string, unknown>) => found.execute(figma, args)
}
const createSlot = { execute: tool('create_slot') }
const setBehaviour = { execute: tool('set_behaviour') }
const getBehaviour = { execute: tool('get_behaviour') }

/** A component with a Checked BOOLEAN property and a Box frame, as an agent finds it. */
function checkbox() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const component = figma.createComponent()
  component.name = 'Checkbox'
  component.addComponentProperty('Checked', 'BOOLEAN', false)
  const box = figma.createFrame()
  box.name = 'Box'
  component.appendChild(box)
  return { figma, component, box }
}

describe('behaviour tools', () => {
  test('an agent makes a slot, binds a behaviour by name, and reads it back', () => {
    const { figma, component, box } = checkbox()
    expect(createSlot.execute(figma, { id: box.id })).toEqual({ slot: 'Box' })
    expect(
      setBehaviour.execute(figma, {
        id: component.id,
        behaviour: { kind: 'checkbox', values: { value: 'Checked' }, parts: { indicator: 'Box' } }
      })
    ).toMatchObject({ kind: 'checkbox', parts: { indicator: 'Box' }, missing: [] })
    expect(getBehaviour.execute(figma, { id: component.id })).toMatchObject({
      values: { value: 'Checked' }
    })
    expect(setBehaviour.execute(figma, { id: component.id, behaviour: null })).toEqual({ ok: true })
    expect(getBehaviour.execute(figma, { id: component.id })).toEqual({ behaviour: null })
  })

  test('mistakes come back as errors naming what exists, and kinds are listed without an ID', () => {
    const { figma, component } = checkbox()
    expect(
      setBehaviour.execute(figma, {
        id: component.id,
        behaviour: { kind: 'checkbox', values: { value: 'State' } }
      })
    ).toEqual({
      error: 'value needs a VARIANT or BOOLEAN property named "State"; the component has "Checked"'
    })
    expect(JSON.stringify(getBehaviour.execute(figma, {}))).toContain('"kind":"accordion"')
  })
})

/** A Feature tabs set with a Tab variant property, a List slot, and labelled triggers. */
function tabs(triggers = ['AI', 'Browser'], options = triggers, missingList: string[] = []) {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const variants = options.map((option) => {
    const variant = figma.createComponent()
    variant.name = `Tab=${option}`
    variant.resize(200, 120)
    if (!missingList.includes(option)) {
      const list = figma.createFrame()
      list.name = 'List'
      variant.appendChild(list)
      for (const triggerLabel of triggers) {
        const trigger = figma.createFrame()
        trigger.name = `Trigger ${triggerLabel}`
        trigger.resize(80, 24)
        list.appendChild(trigger)
        graph.createNode('TEXT', trigger.id, { text: triggerLabel })
      }
    }
    return variant
  })
  const set = figma.combineAsVariants(variants, figma.currentPage)
  set.name = 'Feature tabs'
  set.addComponentProperty('List', 'SLOT', '')
  const slot = graph
    .getNode(set.id)
    ?.componentPropertyDefinitions.find((item) => item.name === 'List')?.id
  for (const variant of variants) {
    const list = variant.children.find((child) => child.name === 'List')
    if (list && slot)
      graph.updateNode(list.id, {
        componentPropertyReferences: [{ propertyId: slot, field: 'SLOT_CONTENT' }]
      })
  }
  return { figma, set }
}

describe('tabs bound to a variant choice', () => {
  test('set_behaviour accepts a VARIANT value whose options are the trigger words', () => {
    const { figma, set } = tabs()
    expect(
      setBehaviour.execute(figma, {
        id: set.id,
        behaviour: { kind: 'tabs', values: { value: 'Tab' }, parts: { list: 'List' } }
      })
    ).toMatchObject({ kind: 'tabs', missing: [] })
    expect(getBehaviour.execute(figma, { id: set.id })).toMatchObject({
      values: { value: 'Tab' },
      parts: { list: 'List' }
    })
  })

  test('a value the triggers do not draw is refused, naming both', () => {
    const { figma, set } = tabs(['AI', 'Docs'], ['AI', 'Browser'])
    expect(
      setBehaviour.execute(figma, {
        id: set.id,
        behaviour: { kind: 'tabs', values: { value: 'Tab' }, parts: { list: 'List' } }
      })
    ).toEqual({ error: '"Tab" offers AI, Browser; the tabs\' triggers are AI, Docs' })
  })

  test('a variant without a list frame is refused, naming it', () => {
    const { figma, set } = tabs(undefined, undefined, ['Browser'])
    expect(
      setBehaviour.execute(figma, {
        id: set.id,
        behaviour: { kind: 'tabs', values: { value: 'Tab' }, parts: { list: 'List' } }
      })
    ).toEqual({ error: 'The variant "Tab=Browser" has no frame bound to the tabs\' list slot' })
  })
})
