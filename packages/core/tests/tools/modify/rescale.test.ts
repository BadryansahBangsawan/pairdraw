import { describe, expect, test } from 'bun:test'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'

function setup() {
  const { graph, figma } = setupToolTest()
  const page = expectDefined(graph.getPages()[0], 'page')
  const card = graph.createNode('FRAME', page.id, {
    name: 'Card',
    x: 0,
    y: 0,
    width: 100,
    height: 50,
    cornerRadius: 8,
    strokeWeight: 2
  })
  const label = graph.createNode('TEXT', card.id, {
    name: 'Label',
    x: 10,
    y: 10,
    width: 60,
    height: 20,
    text: 'Buy',
    fontSize: 16
  })
  return { graph, figma, page, card, label }
}

describe('rescale', () => {
  test('scales a layer with its text, strokes, and radii from its top left', async () => {
    const { graph, figma, card, label } = setup()
    expect(await runTool(figma, 'rescale', { ids: [card.id], factor: 2 })).toEqual({
      scaled: [card.id],
      factor: 2,
      anchor: 'top-left'
    })
    expect(getNodeOrThrow(graph, card.id)).toMatchObject({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      cornerRadius: 16,
      strokeWeight: 4
    })
    expect(getNodeOrThrow(graph, label.id)).toMatchObject({ x: 20, y: 20, fontSize: 32 })
  })

  test('scales several layers around one anchor of their joint bounds', async () => {
    const { graph, figma, page, card } = setup()
    const badge = graph.createNode('RECTANGLE', page.id, {
      name: 'Badge',
      x: 100,
      y: 50,
      width: 100,
      height: 50
    })
    await runTool(figma, 'rescale', { ids: [card.id, badge.id], factor: '0.5', anchor: 'center' })
    expect(getNodeOrThrow(graph, card.id)).toMatchObject({ x: 50, y: 25, width: 50, height: 25 })
    expect(getNodeOrThrow(graph, badge.id)).toMatchObject({ x: 100, y: 50, width: 50 })
  })

  test('a listed sublayer scales with its parent rather than twice', async () => {
    const { graph, figma, card, label } = setup()
    const result = await runTool(figma, 'rescale', { ids: [card.id, label.id], factor: 2 })
    expect(result).toEqual({ scaled: [card.id], factor: 2, anchor: 'top-left' })
    expect(getNodeOrThrow(graph, label.id).fontSize).toBe(32)
  })

  test('leaves locked layers and layers inside instances alone and lists them as skipped', async () => {
    const { graph, figma, page, card } = setup()
    const locked = graph.createNode('RECTANGLE', page.id, {
      name: 'Locked',
      x: 200,
      y: 0,
      width: 40,
      height: 40,
      locked: true
    })
    const component = graph.createNode('COMPONENT', page.id, {
      name: 'Chip',
      x: 400,
      y: 0,
      width: 40,
      height: 40
    })
    graph.createNode('RECTANGLE', component.id, { name: 'Dot', width: 10, height: 10 })
    const instance = graph.createInstance(component.id, page.id)
    const inner = expectDefined(instance?.childIds[0], 'instance child')

    const result = await runTool(figma, 'rescale', { ids: [card.id, locked.id, inner], factor: 2 })
    expect(result).toEqual({
      scaled: [card.id],
      factor: 2,
      anchor: 'top-left',
      skipped: [locked.id, inner]
    })
    expect(getNodeOrThrow(graph, locked.id)).toMatchObject({ width: 40, height: 40 })
    expect(getNodeOrThrow(graph, inner)).toMatchObject({ width: 10, height: 10 })
    expect(getNodeOrThrow(graph, card.id).width).toBe(200)
  })

  test('refuses when every layer is locked', async () => {
    const { graph, figma, card } = setup()
    graph.updateNode(card.id, { locked: true })
    expect(await runTool(figma, 'rescale', { ids: [card.id], factor: 2 })).toEqual({
      error: expect.stringContaining('they are locked')
    })
    expect(getNodeOrThrow(graph, card.id).width).toBe(100)
  })

  test('refuses a layer of a read-only library component without changing anything', async () => {
    const { graph, figma, page, card } = setup()
    const remote = graph.createNode('COMPONENT', page.id, {
      name: 'Remote button',
      width: 80,
      height: 30,
      librarySource: {
        identity: { libraryId: 'design-system', assetKey: 'button', revisionId: 'r1' },
        sourceNodeId: 'source',
        readOnly: true
      }
    })
    const result = await runTool(figma, 'rescale', { ids: [card.id, remote.id], factor: 2 })
    expect(result).toEqual({ error: expect.stringContaining('library design-system') })
    expect(getNodeOrThrow(graph, card.id).width).toBe(100)
    expect(getNodeOrThrow(graph, remote.id).width).toBe(80)
  })

  test('reports a missing layer and refuses a factor below the minimum', async () => {
    const { figma, card } = setup()
    expect(await runTool(figma, 'rescale', { ids: ['0:404'], factor: 2 })).toEqual({
      error: 'Node "0:404" not found'
    })
    await expect(runTool(figma, 'rescale', { ids: [card.id], factor: 0 })).rejects.toThrow(
      'Invalid arguments for rescale'
    )
  })
})
