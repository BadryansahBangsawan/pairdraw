import { describe, expect, test } from 'bun:test'

import { distilDesignValues, proposesValue } from '@pairdraw/core/design-memory'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import { allowDesignValue, createDesignMemory } from '@pairdraw/scene-graph/design-memory'

const BRAND = { r: 26 / 255, g: 115 / 255, b: 232 / 255, a: 1 }
const INK = { r: 0, g: 0, b: 0, a: 1 }

function solid(color: SceneNode['fills'][number]['color']): SceneNode['fills'] {
  return [{ type: 'SOLID', visible: true, opacity: 1, color }]
}

describe('learning design values from a frame', () => {
  test('counts each value under the frame, most used first, and counts an instance once', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, {
      name: 'Card',
      fills: solid(BRAND),
      layoutMode: 'VERTICAL',
      itemSpacing: 16,
      paddingTop: 16
    })
    graph.createNode('TEXT', frame.id, { fontFamily: 'Inter', fontSize: 16, fills: solid(INK) })
    graph.createNode('TEXT', frame.id, { fontFamily: 'Inter', fontSize: 24, fills: solid(INK) })
    graph.createNode('RECTANGLE', frame.id, { fills: solid(BRAND), cornerRadius: 8 })
    graph.createNode('RECTANGLE', pageId, { fills: solid({ r: 1, g: 0, b: 0, a: 1 }) })
    const component = graph.createNode('COMPONENT', pageId, { name: 'Button' })
    graph.createNode('RECTANGLE', component.id, { fills: solid({ r: 0, g: 1, b: 0, a: 1 }) })
    const instance = graph.createInstance(component.id, frame.id)
    if (!instance) throw new Error('no instance')

    const learned = distilDesignValues(graph, [frame.id])
    expect(learned.colors.slice(0, 2).map(({ value, count }) => [value, count])).toEqual([
      ['#1A73E8', 2],
      ['#000000', 2]
    ])
    // The instance shows its component, whose own layers are not counted again here.
    expect(learned.colors.map(({ value }) => value)).not.toContain('#00FF00')
    expect(learned.colors.map(({ value }) => value)).not.toContain('#FF0000')
    expect(learned.fonts).toEqual([{ value: 'Inter', count: 2, fromSystem: false }])
    expect(learned.fontSizes.map(({ value }) => value).sort()).toEqual([16, 24])
    expect(learned.spacing).toEqual([{ value: 16, count: 2, fromSystem: false }])
    expect(learned.radius).toEqual([{ value: 8, count: 1, fromSystem: false }])
  })

  test('proposes values used more than once that the memory does not already list', () => {
    const memory = allowDesignValue(createDesignMemory(), 'colors', '#1A73E8')
    expect(proposesValue(memory, 'colors', { value: '#1A73E8', count: 5, fromSystem: false })).toBe(false)
    expect(proposesValue(memory, 'colors', { value: '#000000', count: 2, fromSystem: false })).toBe(true)
    expect(proposesValue(null, 'spacing', { value: 13, count: 1, fromSystem: false })).toBe(false)
  })
})
