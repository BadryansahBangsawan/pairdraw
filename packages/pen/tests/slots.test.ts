import { describe, expect, test } from 'bun:test'

import type { PenNode } from '@pairdraw/pen'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { syncInstance } from '@pairdraw/scene-graph/instances'
import { ownsSlotContent, slotPropertyId } from '@pairdraw/scene-graph/slots'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { penPluginData } from './helpers/plugin-data'

const item: PenNode = {
  id: 'item',
  type: 'frame',
  reusable: true,
  children: [{ id: 'itemLabel', type: 'text', content: 'Item' }]
}

const divider: PenNode = { id: 'divider', type: 'frame', reusable: true, height: 1 }

// As pen.dev's own design libraries write a panel: an empty slot frame suggesting components.
const panel: PenNode = {
  id: 'panel',
  type: 'frame',
  reusable: true,
  layout: 'vertical',
  children: [
    { id: 'header', type: 'text', content: 'Panel' },
    { id: 'body', type: 'frame', name: 'Body', slot: ['item', 'divider', 'elsewhere'] }
  ]
}

function slotFrameIn(graph: SceneGraph, instanceId: string): SceneNode {
  return expectDefined(
    graph.getChildren(instanceId).find((node) => slotPropertyId(node) !== undefined),
    `slot frame in ${instanceId}`
  )
}

describe('parsePenFile — slots', () => {
  test('makes a slot frame a slot property of its component, suggesting its components', () => {
    const graph = parseDocument([item, divider, panel])
    const component = getNodeOrThrow(graph, 'panel')
    const body = getNodeOrThrow(graph, 'body')
    const definition = expectDefined(
      component.componentPropertyDefinitions.find((entry) => entry.type === 'SLOT'),
      'slot property'
    )
    expect(definition.name).toBe('Body')
    expect(definition.preferredValues).toEqual(['item', 'divider'])
    expect(slotPropertyId(body)).toBe(definition.id)
    // The whole list stays for a writer, the component the document lacks included.
    expect(penPluginData(body, 'slot')).toEqual(['item', 'divider', 'elsewhere'])
  })

  test('leaves a frame outside a component a plain frame', () => {
    const graph = parseDocument([
      item,
      { id: 'loose', type: 'frame', children: [{ id: 'area', type: 'frame', slot: ['item'] }] }
    ])
    const area = getNodeOrThrow(graph, 'area')
    expect(slotPropertyId(area)).toBeUndefined()
    expect(penPluginData(area, 'slot')).toEqual(['item'])
  })

  test('makes a slot without suggestions, but not a frame marked not to be one', () => {
    const graph = parseDocument([
      {
        id: 'box',
        type: 'frame',
        reusable: true,
        children: [
          { id: 'open', type: 'frame', slot: [] },
          { id: 'closed', type: 'frame', slot: false }
        ]
      }
    ])
    expect(slotPropertyId(getNodeOrThrow(graph, 'open'))).toBeDefined()
    expect(slotPropertyId(getNodeOrThrow(graph, 'closed'))).toBeUndefined()
  })

  test('keeps an instance whose slot an override fills, owning that content', () => {
    const graph = parseDocument([
      item,
      divider,
      panel,
      {
        id: 'filled',
        type: 'ref',
        ref: 'panel',
        descendants: {
          body: { children: [{ id: 'first', type: 'ref', ref: 'item' }] }
        }
      }
    ])
    const instance = getNodeOrThrow(graph, 'filled')
    expect(instance.type).toBe('INSTANCE')
    const slot = slotFrameIn(graph, instance.id)
    expect(ownsSlotContent(graph, slot)).toBe(true)
    const [content] = graph.getChildren(slot.id)
    expect(content).toMatchObject({ id: 'first', type: 'INSTANCE', componentId: 'item' })

    syncInstance(graph, instance.id)

    expect(graph.getChildren(slotFrameIn(graph, instance.id).id).map((node) => node.id)).toEqual([
      'first'
    ])
  })

  test('still detaches an instance whose other layer an override gives children', () => {
    const graph = parseDocument([
      item,
      divider,
      {
        ...panel,
        children: [...(panel.children ?? []), { id: 'footer', type: 'frame' }]
      },
      {
        id: 'rebuilt',
        type: 'ref',
        ref: 'panel',
        descendants: { footer: { children: [{ id: 'note', type: 'text', content: 'Footer' }] } }
      }
    ])
    expect(getNodeOrThrow(graph, 'rebuilt').type).toBe('FRAME')
  })
})
