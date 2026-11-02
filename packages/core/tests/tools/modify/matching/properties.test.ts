import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core/figma-api'
import { ALL_TOOLS } from '@open-pencil/core/tools'
import { SceneGraph, type Fill } from '@open-pencil/scene-graph'
import { hasInstanceOverride } from '@open-pencil/scene-graph/instances'

const replace = ALL_TOOLS.find((tool) => tool.name === 'replace_matching_properties')
if (!replace) throw new Error('replace_matching_properties tool missing')

type ReplaceResult = {
  replaced?: Record<string, number>
  changed?: number
  ids?: string[]
  read_only?: string[]
  error?: string
}

function run(figma: FigmaAPI, args: Record<string, unknown>): ReplaceResult {
  return replace?.execute(figma, args) as ReplaceResult
}

const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0, g: 0, b: 1, a: 1 }

function solid(color: typeof RED, opacity = 1): Fill {
  return { type: 'SOLID', color, opacity, visible: true }
}

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const pageId = figma.currentPage.id
  const card = graph.createNode('FRAME', pageId, {
    name: 'Card',
    width: 200,
    height: 100,
    fills: [solid(RED)],
    strokes: [{ ...solid(RED), weight: 1, align: 'INSIDE' }],
    strokeWeight: 1,
    cornerRadius: 8,
    topLeftRadius: 8,
    topRightRadius: 8,
    bottomRightRadius: 8,
    bottomLeftRadius: 8
  })
  const badge = graph.createNode('RECTANGLE', card.id, {
    name: 'Badge',
    fills: [solid(RED, 0.5)],
    cornerRadius: 4,
    topLeftRadius: 4,
    topRightRadius: 4,
    bottomRightRadius: 4,
    bottomLeftRadius: 4
  })
  const other = graph.createNode('RECTANGLE', pageId, { name: 'Other', fills: [solid(BLUE)] })
  return { graph, figma, card, badge, other }
}

describe('replace_matching_properties', () => {
  test('swaps a fill color on every layer of the page, keeping each paint’s opacity', () => {
    const { graph, figma, card, badge, other } = setup()
    const result = run(figma, { fill_color: [{ from: '#FF0000', to: '#00FF00' }] })
    expect(result.replaced).toEqual({ fill_color: 2 })
    expect(result.ids?.toSorted()).toEqual([card.id, badge.id].toSorted())
    expect(graph.getNode(card.id)?.fills[0]).toMatchObject({
      color: { r: 0, g: 1, b: 0, a: 1 },
      opacity: 1
    })
    expect(graph.getNode(badge.id)?.fills[0]).toMatchObject({ opacity: 0.5 })
    expect(graph.getNode(other.id)?.fills[0]?.color).toEqual(BLUE)
    // Strokes are their own property.
    expect(graph.getNode(card.id)?.strokes[0]?.color).toEqual(RED)
  })

  test('a color with alpha matches only that opacity', () => {
    const { graph, figma, card, badge } = setup()
    expect(run(figma, { fill_color: [{ from: '#FF000080', to: '#000000' }] }).ids).toEqual([
      badge.id
    ])
    expect(graph.getNode(card.id)?.fills[0]?.color).toEqual(RED)
  })

  test('leaves a fill bound to a variable alone', () => {
    const { graph, figma, card } = setup()
    graph.updateNode(card.id, { boundVariables: { 'fills/0/color': 'VariableID:1' } })
    run(figma, { fill_color: [{ from: '#FF0000', to: '#00FF00' }] })
    expect(graph.getNode(card.id)?.fills[0]?.color).toEqual(RED)
  })

  test('swaps stroke colors, stroke weights, and corner radii', () => {
    const { graph, figma, card, badge } = setup()
    const result = run(figma, {
      stroke_color: [{ from: '#ff0000', to: '#0000ff' }],
      stroke_weight: [{ from: 1, to: 2 }],
      corner_radius: [{ from: 8, to: 12 }]
    })
    expect(result.replaced).toEqual({ stroke_color: 1, stroke_weight: 1, corner_radius: 1 })
    expect(graph.getNode(card.id)).toMatchObject({
      strokeWeight: 2,
      cornerRadius: 12,
      topLeftRadius: 12,
      independentCorners: false
    })
    expect(graph.getNode(card.id)?.strokes[0]?.color).toEqual(BLUE)
    expect(graph.getNode(badge.id)?.cornerRadius).toBe(4)
  })

  test('matches the radius of corners set together, whatever the corner fields hold', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    // As JSX rounded={12} leaves it: one radius, corner fields untouched.
    const frame = graph.createNode('FRAME', figma.currentPage.id, { cornerRadius: 12 })
    expect(graph.getNode(frame.id)).toMatchObject({ topLeftRadius: 0, independentCorners: false })

    expect(run(figma, { corner_radius: [{ from: 0, to: 4 }] }).changed).toBe(0)
    expect(graph.getNode(frame.id)?.cornerRadius).toBe(12)

    const result = run(figma, { corner_radius: [{ from: 12, to: 4 }] })
    expect(result.replaced).toEqual({ corner_radius: 1 })
    expect(graph.getNode(frame.id)).toMatchObject({
      cornerRadius: 4,
      topLeftRadius: 4,
      bottomRightRadius: 4,
      independentCorners: false
    })
  })

  test('matches corners set one by one each on its own', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const frame = graph.createNode('FRAME', figma.currentPage.id, {
      cornerRadius: 0,
      topLeftRadius: 8,
      topRightRadius: 2,
      bottomRightRadius: 8,
      bottomLeftRadius: 2,
      independentCorners: true
    })
    expect(run(figma, { corner_radius: [{ from: 8, to: 6 }] }).replaced).toEqual({
      corner_radius: 2
    })
    expect(graph.getNode(frame.id)).toMatchObject({
      topLeftRadius: 6,
      topRightRadius: 2,
      bottomRightRadius: 6,
      independentCorners: true
    })
  })

  test('gives every stroke the new weight', () => {
    const { graph, figma, card } = setup()
    run(figma, { stroke_weight: [{ from: 1, to: 3 }] })
    expect(graph.getNode(card.id)?.strokes[0]?.weight).toBe(3)
  })

  test('records an override on a layer inside an instance, which survives a component edit', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const component = figma.createComponent()
    const shape = figma.createRectangle()
    component.appendChild(shape)
    shape.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
    const instance = component.createInstance()
    const [copy] = graph.getChildren(instance.id)
    if (!copy) throw new Error('missing instance child')

    expect(
      run(figma, { ids: [instance.id], fill_color: [{ from: '#ff0000', to: '#0000ff' }] })
    ).toMatchObject({ ids: [copy.id] })
    expect(hasInstanceOverride(graph, copy.id, 'fills')).toBe(true)

    shape.opacity = 0.5
    graph.syncInstances(component.id)
    expect(graph.getNode(copy.id)).toMatchObject({ opacity: 0.5 })
    expect(graph.getNode(copy.id)?.fills[0]?.color).toEqual(BLUE)
  })

  test('leaves the fill style of a layer whose fill it swaps', () => {
    const { graph, figma, card } = setup()
    graph.updateNode(card.id, { fillStyleId: 'style:fill', strokeStyleId: 'style:stroke' })
    run(figma, { ids: [card.id], fill_color: [{ from: '#ff0000', to: '#00ff00' }] })
    expect(graph.getNode(card.id)).toMatchObject({
      fillStyleId: null,
      strokeStyleId: 'style:stroke'
    })
  })

  test('reports layers of read-only library components instead of changing them', () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const pageId = figma.currentPage.id
    const component = graph.createNode('COMPONENT', pageId, {
      name: 'Remote button',
      librarySource: {
        identity: { libraryId: 'design-system', assetKey: 'button', revisionId: 'r1' },
        sourceNodeId: 'source',
        readOnly: true
      }
    })
    const locked = graph.createNode('RECTANGLE', component.id, { fills: [solid(RED)] })
    const own = graph.createNode('RECTANGLE', pageId, { fills: [solid(RED)] })

    const result = run(figma, { fill_color: [{ from: '#ff0000', to: '#00ff00' }] })
    expect(result).toMatchObject({ ids: [own.id], read_only: [locked.id] })
    expect(result.replaced).toEqual({ fill_color: 1 })
    expect(graph.getNode(locked.id)?.fills[0]?.color).toEqual(RED)
  })

  test('searches only the given layers or the selection', () => {
    const { graph, figma, card, badge, other } = setup()
    run(figma, { ids: [badge.id], fill_color: [{ from: '#ff0000', to: '#00ff00' }] })
    expect(graph.getNode(card.id)?.fills[0]?.color).toEqual(RED)
    expect(
      run(figma, { within: 'selection', fill_color: [{ from: '#0000ff', to: '#fff' }] })
    ).toEqual({ error: 'Nothing is selected' })
    const proxy = figma.getNodeById(other.id)
    if (!proxy) throw new Error('missing proxy')
    figma.currentPage.selection = [proxy]
    expect(
      run(figma, { within: 'selection', fill_color: [{ from: '#0000ff', to: '#fff' }] }).ids
    ).toEqual([other.id])
  })

  test('reports a bad color or an empty request without changing anything', () => {
    const { graph, figma, card } = setup()
    expect(run(figma, { fill_color: [{ from: 'reddish', to: '#000' }] })).toEqual({
      error: '"reddish" is not a color'
    })
    expect(run(figma, {})).toEqual({ error: 'Name at least one property to replace' })
    expect(run(figma, { ids: ['9:9'], font_size: [{ from: 1, to: 2 }] })).toEqual({
      error: 'Node "9:9" not found'
    })
    expect(graph.getNode(card.id)?.fills[0]?.color).toEqual(RED)
  })
})
