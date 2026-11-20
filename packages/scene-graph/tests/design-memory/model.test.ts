import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  addDesignDecision,
  allowDesignValue,
  createDesignMemory,
  DESIGN_MEMORY_LIMITS,
  pinDesignExample,
  readDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'
import { PAIRDRAW_PLUGIN_DATA, withPluginData } from '@pairdraw/scene-graph/plugin-data'

function root(graph: SceneGraph) {
  const node = graph.getNode(graph.rootId)
  if (!node) throw new Error('missing root')
  return node
}

describe('design memory', () => {
  test('a document without one has none', () => {
    expect(readDesignMemory(new SceneGraph())).toBeNull()
  })

  test('starts from the document system, refusing colors and fonts and warning on numbers', () => {
    const memory = createDesignMemory()
    expect(memory.colors).toEqual({ fromSystem: true, values: [], enforce: 'refuse' })
    expect(memory.fonts.enforce).toBe('refuse')
    expect(memory.fontSizes.enforce).toBe('warn')
    expect(memory.spacing.enforce).toBe('warn')
    expect(memory.radius.enforce).toBe('warn')
    expect(memory.decisions).toEqual([])
    expect(memory.examples).toEqual([])
  })

  test('is stored on the document node and read back', () => {
    const graph = new SceneGraph()
    const memory = allowDesignValue(createDesignMemory(), 'colors', '#1a73e8')
    writeDesignMemory(graph, memory)
    expect(readDesignMemory(graph)).toEqual(memory)
    expect(readDesignMemory(graph)?.colors.values).toEqual(['#1A73E8'])
  })

  test('writing none removes it', () => {
    const graph = new SceneGraph()
    writeDesignMemory(graph, createDesignMemory())
    writeDesignMemory(graph, null)
    expect(readDesignMemory(graph)).toBeNull()
  })

  test('a malformed entry reads as no memory', () => {
    const graph = new SceneGraph()
    graph.updateNode(graph.rootId, {
      pluginData: withPluginData(root(graph).pluginData, PAIRDRAW_PLUGIN_DATA.designMemory, {
        ...createDesignMemory(),
        colors: { fromSystem: true, values: ['not a color'], enforce: 'refuse' }
      })
    })
    expect(readDesignMemory(graph)).toBeNull()
  })

  test('allowing a value adds it once, normalized, and ignores a value it cannot read', () => {
    let memory = createDesignMemory()
    memory = allowDesignValue(memory, 'colors', 'rgb(26, 115, 232)')
    memory = allowDesignValue(memory, 'colors', '#1A73E8')
    memory = allowDesignValue(memory, 'colors', 'nope')
    memory = allowDesignValue(memory, 'fonts', ' Inter ')
    memory = allowDesignValue(memory, 'spacing', 12)
    memory = allowDesignValue(memory, 'spacing', 12)
    memory = allowDesignValue(memory, 'spacing', -4)
    expect(memory.colors.values).toEqual(['#1A73E8'])
    expect(memory.fonts.values).toEqual(['Inter'])
    expect(memory.spacing.values).toEqual([12])
  })

  test('a group stops growing at its limit', () => {
    let memory = createDesignMemory()
    for (let size = 1; size <= DESIGN_MEMORY_LIMITS.numbers + 5; size++)
      memory = allowDesignValue(memory, 'fontSizes', size)
    expect(memory.fontSizes.values).toHaveLength(DESIGN_MEMORY_LIMITS.numbers)
  })

  test('decisions are trimmed, cut to length, kept in order, and blank ones are dropped', () => {
    let memory = createDesignMemory()
    memory = addDesignDecision(memory, '  Buttons use the brand color only for the primary action. ', 'person')
    memory = addDesignDecision(memory, '   ', 'agent')
    memory = addDesignDecision(memory, 'x'.repeat(DESIGN_MEMORY_LIMITS.decisionLength + 50), 'agent')
    expect(memory.decisions.map(({ text }) => text.length)).toEqual([
      'Buttons use the brand color only for the primary action.'.length,
      DESIGN_MEMORY_LIMITS.decisionLength
    ])
    expect(memory.decisions.map(({ author }) => author)).toEqual(['person', 'agent'])
    expect(new Set(memory.decisions.map(({ id }) => id)).size).toBe(2)
  })

  test('pinning an example keeps each layer once and stops at the limit', () => {
    let memory = createDesignMemory()
    memory = pinDesignExample(memory, '1:2')
    memory = pinDesignExample(memory, '1:2')
    for (let index = 0; index < DESIGN_MEMORY_LIMITS.examples + 2; index++)
      memory = pinDesignExample(memory, `2:${index}`)
    expect(memory.examples[0]).toEqual({ nodeId: '1:2' })
    expect(memory.examples).toHaveLength(DESIGN_MEMORY_LIMITS.examples)
  })

  test('a font size must be more than zero; spacing and radii may be zero', () => {
    let memory = createDesignMemory()
    memory = allowDesignValue(memory, 'fontSizes', 0)
    memory = allowDesignValue(memory, 'spacing', 0)
    expect(memory.fontSizes.values).toEqual([])
    expect(memory.spacing.values).toEqual([0])
    const graph = new SceneGraph()
    graph.updateNode(graph.rootId, {
      pluginData: withPluginData(root(graph).pluginData, PAIRDRAW_PLUGIN_DATA.designMemory, {
        ...createDesignMemory(),
        fontSizes: { fromSystem: true, values: [0], enforce: 'warn' }
      })
    })
    expect(readDesignMemory(graph)).toBeNull()
  })
})
