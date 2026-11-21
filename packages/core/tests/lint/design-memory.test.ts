import { describe, expect, test } from 'bun:test'

import { createLinter } from '@pairdraw/core/lint'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import {
  allowDesignValue,
  createDesignMemory,
  writeDesignMemory,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'

const PINK = { r: 1, g: 0, b: 170 / 255, a: 1 }

function solid(color: SceneNode['fills'][number]['color']): SceneNode['fills'] {
  return [{ type: 'SOLID', visible: true, opacity: 1, color }]
}

function documentWith(memory: DesignMemory | null) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  if (memory) writeDesignMemory(graph, memory)
  graph.createNode('RECTANGLE', pageId, { name: 'Card', fills: solid(PINK), cornerRadius: 6, width: 200, height: 100 })
  graph.createNode('FRAME', pageId, { name: 'Stack', layoutMode: 'VERTICAL', itemSpacing: 13 })
  return graph
}

function lint(graph: SceneGraph, options: Parameters<typeof createLinter>[0] = { preset: 'recommended' }) {
  return createLinter(options)
    .lintGraph(graph)
    .messages.filter((message) => message.ruleId.startsWith('design-memory') || message.ruleId.startsWith('consistent'))
    .map(({ ruleId, severity, nodeName }) => ({ ruleId, severity, nodeName }))
}

function memoryWithScales(): DesignMemory {
  let memory = createDesignMemory()
  memory = allowDesignValue(memory, 'colors', '#1A73E8')
  memory = allowDesignValue(memory, 'radius', 8)
  memory = allowDesignValue(memory, 'spacing', 16)
  return memory
}

describe('design memory lint rules', () => {
  test('a document without a memory reports nothing of it', () => {
    expect(lint(documentWith(null)).filter(({ ruleId }) => ruleId.startsWith('design-memory'))).toEqual([])
  })

  test('report with the severity the memory enforces, in place of the generic scale rules', () => {
    expect(lint(documentWith(memoryWithScales()))).toEqual([
      { ruleId: 'design-memory-colors', severity: 'error', nodeName: 'Card' },
      { ruleId: 'design-memory-radius', severity: 'warning', nodeName: 'Card' },
      { ruleId: 'design-memory-spacing', severity: 'warning', nodeName: 'Stack' }
    ])
  })

  test('suggest the nearest allowed step', () => {
    const messages = createLinter({ preset: 'recommended' }).lintGraph(documentWith(memoryWithScales())).messages
    const radius = messages.find(({ ruleId }) => ruleId === 'design-memory-radius')
    expect(radius?.suggestions).toEqual([{ kind: 'set', changes: { cornerRadius: 8 } }])
  })

  test('a group set to off, or a rule turned off, reports nothing', () => {
    const memory = { ...memoryWithScales(), colors: { ...memoryWithScales().colors, enforce: 'off' as const } }
    expect(lint(documentWith(memory)).map(({ ruleId }) => ruleId)).not.toContain('design-memory-colors')
    const off = lint(documentWith(memoryWithScales()), {
      preset: 'recommended',
      config: { extends: 'recommended', rules: { 'design-memory-colors': 'off' } }
    })
    expect(off.map(({ ruleId }) => ruleId)).not.toContain('design-memory-colors')
  })

  test('naming rules runs only those', () => {
    const only = lint(documentWith(memoryWithScales()), { preset: 'recommended', rules: ['design-memory-spacing'] })
    expect(only.map(({ ruleId }) => ruleId)).toEqual(['design-memory-spacing'])
  })

  test('a gradient stop or shadow outside the memory is a warning even where colors refuse', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    writeDesignMemory(graph, allowDesignValue(createDesignMemory(), 'colors', '#1A73E8'))
    graph.createNode('RECTANGLE', pageId, {
      name: 'Glow',
      fills: [
        {
          type: 'GRADIENT_LINEAR',
          visible: true,
          opacity: 1,
          color: PINK,
          gradientStops: [{ position: 0, color: PINK }]
        }
      ]
    })
    expect(lint(graph)).toEqual([
      { ruleId: 'design-memory-colors', severity: 'warning', nodeName: 'Glow' }
    ])
  })
})
