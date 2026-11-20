import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'
import {
  allowDesignValue,
  createDesignMemory,
  readDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'

import {
  checkDesignValuesTool,
  getDesignMemory,
  recordDesignDecisionTool
} from '#core/tools/design-memory'

function documentWithMemory() {
  const graph = new SceneGraph()
  let memory = allowDesignValue(createDesignMemory(), 'colors', '#1A73E8')
  memory = allowDesignValue(memory, 'fonts', 'Inter')
  writeDesignMemory(graph, memory)
  return { graph, figma: new FigmaAPI(graph) }
}

describe('design memory tools', () => {
  test('agents read the allowed values and how each group is enforced', async () => {
    const { figma } = documentWithMemory()
    const result = await getDesignMemory.execute(figma, {})
    expect(result).toMatchObject({
      design_memory: {
        groups: {
          colors: { enforce: 'refuse', allowed: [{ value: '#1A73E8', name: null }], more: 0 },
          fonts: { enforce: 'refuse', allowed: [{ value: 'Inter', name: null }] },
          spacing: { enforce: 'off', allowed: [] }
        },
        decisions: [],
        examples: []
      }
    })
    expect(await getDesignMemory.execute(new FigmaAPI(new SceneGraph()), {})).toEqual({
      design_memory: null
    })
  })

  test('agents check values before they use them', async () => {
    const { figma } = documentWithMemory()
    const result = await checkDesignValuesTool.execute(figma, {
      colors: ['#1a73e8', '#ff00aa'],
      fonts: ['Papyrus']
    })
    expect(result).toMatchObject({
      verdicts: [
        { group: 'colors', value: '#1A73E8', verdict: 'ok' },
        { group: 'colors', value: '#FF00AA', verdict: 'refuse', nearest: { value: '#1A73E8' } },
        { group: 'fonts', value: 'Papyrus', verdict: 'refuse' }
      ]
    })
  })

  test('agents record decisions and pin examples, but never change what is allowed', async () => {
    const { graph, figma } = documentWithMemory()
    const card = figma.createFrame()
    card.name = 'Card'
    const before = readDesignMemory(graph)
    expect(
      await recordDesignDecisionTool.execute(figma, {
        text: 'Cards use 16 px padding.',
        example_node_id: card.id
      })
    ).toEqual({ decisions: 1, examples: 1 })
    const after = readDesignMemory(graph)
    expect(after?.decisions).toEqual([
      { id: expect.any(String), text: 'Cards use 16 px padding.', author: 'agent' }
    ])
    expect(after?.examples).toEqual([{ nodeId: card.id }])
    expect(after?.colors).toEqual(before?.colors)
    expect(after?.fonts).toEqual(before?.fonts)
  })

  test('a document without a memory gets none from an agent', async () => {
    const graph = new SceneGraph()
    const result = await recordDesignDecisionTool.execute(new FigmaAPI(graph), { text: 'Anything' })
    expect(result).toEqual({ error: expect.stringContaining('no design memory') })
    expect(readDesignMemory(graph)).toBeNull()
  })
})
