import { describe, expect, test } from 'bun:test'

import type { PenNode } from '@pairdraw/pen'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { STICKY_COLORS, stickySublayers } from '@pairdraw/scene-graph/generated'
import { hasInstanceOverride, syncInstance } from '@pairdraw/scene-graph/instances'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { penPluginData } from './helpers/plugin-data'

function sublayers(graph: SceneGraph, node: SceneNode) {
  return expectDefined(stickySublayers(graph, node), `sublayers of ${node.id}`)
}

describe('parsePenFile — notes, prompts, and context', () => {
  test('reads a note as a sticky note holding its text', () => {
    const graph = parseDocument([
      { id: 'note', type: 'note', x: 20, y: 30, width: 240, height: 100, content: 'Ship it' }
    ])
    const note = getNodeOrThrow(graph, 'note')
    expect(note.type).toBe('STICKY')
    expect(note).toMatchObject({ x: 20, y: 30, width: 240, name: 'note' })
    const { body, author } = sublayers(graph, note)
    expect(body.text).toBe('Ship it')
    expect(author.visible).toBe(false)
    expect(note.fills[0]?.color).toEqual(STICKY_COLORS.yellow)
  })

  test('scales a note to the width pen.dev gives it, wide when it is wide', () => {
    const graph = parseDocument([
      { id: 'small', type: 'note', width: 120, content: 'Small' },
      { id: 'wide', type: 'note', width: 416, content: 'Wide' }
    ])
    expect(getNodeOrThrow(graph, 'small').width).toBe(120)
    expect(getNodeOrThrow(graph, 'wide').width).toBe(416)
  })

  test('keeps the box pen.dev gives a card, whatever its text needs', () => {
    const graph = parseDocument([
      { id: 'note', type: 'note', width: 150, height: 100, content: 'A note' },
      { id: 'prompt', type: 'prompt', width: 150, height: 100, content: 'Prompt' },
      { id: 'tall', type: 'context', width: 150, height: 400, content: 'Context' }
    ])
    for (const [id, height] of [
      ['note', 100],
      ['prompt', 100],
      ['tall', 400]
    ] as const) {
      expect(getNodeOrThrow(graph, id)).toMatchObject({
        width: 150,
        height,
        primaryAxisSizing: 'FIXED',
        minHeight: null
      })
    }
  })

  test('lets a card with no height, or one fitting its content, grow to its text', () => {
    const graph = parseDocument([
      { id: 'free', type: 'note', width: 240, content: 'Free' },
      { id: 'fit', type: 'note', width: 240, height: 'fit_content(80)', content: 'Fit' }
    ])
    expect(getNodeOrThrow(graph, 'free')).toMatchObject({
      primaryAxisSizing: 'HUG',
      minHeight: 240
    })
    expect(getNodeOrThrow(graph, 'fit')).toMatchObject({ primaryAxisSizing: 'HUG', minHeight: 80 })
  })

  test('fills its row when pen.dev fills the card', () => {
    const graph = parseDocument([
      {
        id: 'row',
        type: 'frame',
        layout: 'horizontal',
        width: 400,
        height: 120,
        children: [{ id: 'wide', type: 'note', width: 'fill_container', height: 100 }]
      }
    ])
    expect(getNodeOrThrow(graph, 'wide')).toMatchObject({ layoutGrow: 1, height: 100 })
  })

  test('reads a prompt and a context note as sticky notes that keep what they were', () => {
    const graph = parseDocument([
      { id: 'prompt', type: 'prompt', content: 'Make it pop', model: 'claude-opus' },
      { id: 'context', type: 'context', content: 'Button opens the modal' }
    ])
    const prompt = getNodeOrThrow(graph, 'prompt')
    const context = getNodeOrThrow(graph, 'context')
    expect([prompt.type, context.type]).toEqual(['STICKY', 'STICKY'])
    expect(sublayers(graph, prompt).body.text).toBe('Make it pop')
    expect(sublayers(graph, context).body.text).toBe('Button opens the modal')
    expect(penPluginData(prompt, 'type')).toBe('prompt')
    expect(penPluginData(prompt, 'model')).toBe('claude-opus')
    expect(penPluginData(context, 'type')).toBe('context')
    expect(prompt.fills[0]?.color).toEqual(STICKY_COLORS.blue)
    expect(context.fills[0]?.color).toEqual(STICKY_COLORS.gray)
  })

  test('hides a disabled note and keeps its place out of an auto layout flow', () => {
    const graph = parseDocument([
      {
        id: 'row',
        type: 'frame',
        layout: 'horizontal',
        children: [
          { id: 'hidden', type: 'note', enabled: false, content: 'Hidden' },
          { id: 'pinned', type: 'note', layoutPosition: 'absolute', x: 8, y: 9, content: 'Pin' }
        ]
      }
    ])
    expect(getNodeOrThrow(graph, 'hidden').visible).toBe(false)
    expect(getNodeOrThrow(graph, 'pinned')).toMatchObject({
      layoutPositioning: 'ABSOLUTE',
      x: 8,
      y: 9
    })
  })

  test('gives a note in an instance the text an override sets, which a sync keeps', () => {
    const card: PenNode = {
      id: 'card',
      type: 'frame',
      reusable: true,
      layout: 'none',
      children: [{ id: 'hint', type: 'note', content: 'Default hint' }]
    }
    const graph = parseDocument([
      card,
      { id: 'used', type: 'ref', ref: 'card', descendants: { hint: { content: 'Own hint' } } }
    ])
    const instance = getNodeOrThrow(graph, 'used')
    const copy = expectDefined(
      graph.getChildren(instance.id).find((node) => node.type === 'STICKY'),
      'note copy'
    )
    const { body } = sublayers(graph, copy)
    expect(body.text).toBe('Own hint')
    expect(hasInstanceOverride(graph, body.id, 'text')).toBe(true)

    syncInstance(graph, instance.id)

    expect(sublayers(graph, copy).body.text).toBe('Own hint')
  })
})
