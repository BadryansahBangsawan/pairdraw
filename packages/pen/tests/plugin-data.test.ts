import { describe, expect, test } from 'bun:test'

import type { PenNode } from '@open-pencil/pen'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { penPluginData } from './helpers/plugin-data'

describe('parsePenFile — fields kept as plugin data', () => {
  test('keeps context, metadata, and placeholder on the layer', () => {
    const graph = parseDocument([
      {
        id: 'screen',
        type: 'frame',
        context: 'Settings screen; the save button submits the form',
        metadata: { type: 'screen', route: '/settings' },
        placeholder: true
      }
    ])
    const screen = getNodeOrThrow(graph, 'screen')
    expect(penPluginData(screen, 'context')).toBe(
      'Settings screen; the save button submits the form'
    )
    expect(penPluginData(screen, 'metadata')).toEqual({ type: 'screen', route: '/settings' })
    expect(penPluginData(screen, 'placeholder')).toBe(true)
    expect(penPluginData(screen, 'type')).toBeUndefined()
  })

  test('keeps metadata that is not an object instead of rejecting the document', () => {
    const graph = parseDocument([{ id: 'tagged', type: 'frame', metadata: 'screen' }])
    expect(penPluginData(getNodeOrThrow(graph, 'tagged'), 'metadata')).toBe('screen')
  })

  test('writes no plugin data for a layer without such fields', () => {
    const graph = parseDocument([{ id: 'plain', type: 'rectangle', width: 10, height: 10 }])
    expect(getNodeOrThrow(graph, 'plain').pluginData).toEqual([])
  })

  test('gives an instance its own context over its component’s, once', () => {
    const button: PenNode = {
      id: 'button',
      type: 'frame',
      reusable: true,
      context: 'A button',
      metadata: { type: 'control' },
      children: [{ id: 'label', type: 'text', content: 'Go', context: 'The label' }]
    }
    const graph = parseDocument([
      button,
      { id: 'inherits', type: 'ref', ref: 'button' },
      {
        id: 'own',
        type: 'ref',
        ref: 'button',
        context: 'The primary action',
        descendants: { label: { context: 'Says what happens' } }
      }
    ])
    const inherits = getNodeOrThrow(graph, 'inherits')
    const own = getNodeOrThrow(graph, 'own')
    expect(penPluginData(inherits, 'context')).toBe('A button')
    expect(penPluginData(own, 'context')).toBe('The primary action')
    expect(penPluginData(own, 'metadata')).toEqual({ type: 'control' })
    const label = expectDefined(graph.getChildren(own.id)[0], 'label copy')
    expect(penPluginData(label, 'context')).toBe('Says what happens')
  })
})
