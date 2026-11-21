import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import { FigmaAPI, type FigmaSlotNode } from '@pairdraw/core/figma-api'
import { slotPropertyId } from '@pairdraw/scene-graph/slots'

/** A Card with a Body slot, a preferred Item component, and a non-preferred Other component. */
function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const card = editor.graph.createNode('COMPONENT', pageId, { name: 'Card' })
  const body = editor.graph.createNode('FRAME', card.id, { name: 'Body' })
  const slotId = expectDefined(editor.convertToSlot(body.id))
  const item = editor.graph.createNode('COMPONENT', pageId, { name: 'Item' })
  editor.graph.createNode('TEXT', item.id, { name: 'T', text: 'item' })
  const other = editor.graph.createNode('COMPONENT', pageId, { name: 'Other' })
  editor.graph.createNode('TEXT', other.id, { name: 'T', text: 'other' })
  const instance = expectDefined(editor.graph.createInstance(card.id, pageId))
  const slotFrame = expectDefined(
    editor.graph.getChildren(instance.id).find((child) => slotPropertyId(child))
  )
  return { editor, pageId, card, body, slotId, item, other, instance, slotFrame }
}

describe('a preferred-only slot', () => {
  test('reports a non-preferred instance as a limit violation, and a preferred one as none', () => {
    const { editor, card, slotId, item, other, slotFrame } = setup()
    editor.updateSlot(card.id, slotId, {
      preferredValues: [item.id],
      slotSettings: { allowPreferredValuesOnly: true }
    })
    const figma = new FigmaAPI(editor.graph)
    const preferred = expectDefined(editor.graph.createInstance(item.id, slotFrame.id))
    const slotProxy = figma.wrapNode(slotFrame.id) as FigmaSlotNode
    expect(slotProxy.limitViolations).toEqual([])
    const nonPreferred = expectDefined(editor.graph.createInstance(other.id, slotFrame.id))
    expect(slotProxy.limitViolations).toContain('HAS_NON_PREFERRED')
    // Removing the non-preferred instance clears the violation.
    editor.graph.deleteNode(nonPreferred.id)
    expect(slotProxy.limitViolations).toEqual([])
    expect(preferred.componentId).toBe(item.id)
  })

  test('a plain shape in a preferred-only slot is a violation; an instance of the preferred component is not', () => {
    const { editor, card, slotId, item, slotFrame } = setup()
    editor.updateSlot(card.id, slotId, {
      preferredValues: [item.id],
      slotSettings: { allowPreferredValuesOnly: true }
    })
    const figma = new FigmaAPI(editor.graph)
    const slotProxy = figma.wrapNode(slotFrame.id) as FigmaSlotNode
    const shape = editor.graph.createNode('RECTANGLE', slotFrame.id, { name: 'Box' })
    expect(slotProxy.limitViolations).toContain('HAS_NON_PREFERRED')
    editor.graph.deleteNode(shape.id)
    expectDefined(editor.graph.createInstance(item.id, slotFrame.id))
    expect(slotProxy.limitViolations).toEqual([])
  })

  test('preferredValues match by component key as well as id', () => {
    const { editor, card, slotId, item, slotFrame } = setup()
    editor.graph.updateNode(item.id, { componentKey: 'item-key' })
    editor.updateSlot(card.id, slotId, {
      preferredValues: ['item-key'],
      slotSettings: { allowPreferredValuesOnly: true }
    })
    const figma = new FigmaAPI(editor.graph)
    expectDefined(editor.graph.createInstance(item.id, slotFrame.id))
    expect((figma.wrapNode(slotFrame.id) as FigmaSlotNode).limitViolations).toEqual([])
  })

  test('turning allowPreferredValuesOnly off clears the violation for the same content', () => {
    const { editor, card, slotId, other, slotFrame } = setup()
    editor.updateSlot(card.id, slotId, {
      preferredValues: [],
      slotSettings: { allowPreferredValuesOnly: true }
    })
    const figma = new FigmaAPI(editor.graph)
    expectDefined(editor.graph.createInstance(other.id, slotFrame.id))
    const slotProxy = figma.wrapNode(slotFrame.id) as FigmaSlotNode
    expect(slotProxy.limitViolations).toContain('HAS_NON_PREFERRED')
    editor.updateSlot(card.id, slotId, { slotSettings: { allowPreferredValuesOnly: false } })
    expect(slotProxy.limitViolations).toEqual([])
  })
})

describe('swapping an instance that holds slot content', () => {
  test('keeps claimed slot content across a variant swap that shares the slot', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const set = editor.graph.createNode('COMPONENT_SET', pageId, { name: 'Switch' })
    const on = editor.graph.createNode('COMPONENT', set.id, { name: 'State=On' })
    const off = editor.graph.createNode('COMPONENT', set.id, { name: 'State=Off' })
    const thumbOn = editor.graph.createNode('FRAME', on.id, { name: 'Thumb' })
    const thumbOff = editor.graph.createNode('FRAME', off.id, { name: 'Thumb' })
    const slotId = expectDefined(editor.convertToSlot(thumbOn.id))
    // The other variant's frame binds the same set slot, as variants share one slot property.
    editor.graph.updateNode(thumbOff.id, {
      componentPropertyReferences: [{ propertyId: slotId, field: 'SLOT_CONTENT' }]
    })
    const item = editor.graph.createNode('COMPONENT', pageId, { name: 'Item' })
    const instance = expectDefined(editor.graph.createInstance(on.id, pageId))
    const slotFrame = expectDefined(
      editor.graph.getChildren(instance.id).find((child) => slotPropertyId(child))
    )
    // addInstanceToSlot claims the slot (records the assignment), as the editor does.
    const contentId = expectDefined(editor.addInstanceToSlot(slotFrame.id, item.id))
    editor.graph.updateNode(contentId, { name: 'Chosen' })
    expect(editor.graph.getNode(instance.id)?.componentPropertyAssignments).toEqual({
      [slotId]: ''
    })

    editor.graph.swapInstanceComponent(instance.id, off.id)

    const swapped = expectDefined(editor.graph.getNode(instance.id))
    expect(swapped.componentId).toBe(off.id)
    expect(swapped.componentPropertyAssignments).toEqual({ [slotId]: '' })
    const swappedSlot = expectDefined(
      editor.graph.getChildren(instance.id).find((child) => slotPropertyId(child))
    )
    expect(editor.graph.getChildren(swappedSlot.id).map((child) => child.name)).toEqual(['Chosen'])
    expect(editor.graph.getNode(contentId)).toBeDefined()
  })
})
