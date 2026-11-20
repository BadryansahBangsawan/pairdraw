import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS, type ToolDef } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'
import {
  allowDesignValue,
  createDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'

import { runHeadlessTool } from '#cli/tool-data'

function tool(name: string): ToolDef {
  const def = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!def) throw new Error(`Missing ${name}`)
  return def
}

function documentWithMemory() {
  const graph = new SceneGraph()
  writeDesignMemory(graph, allowDesignValue(createDesignMemory(), 'colors', '#1A73E8'))
  const figma = new FigmaAPI(graph)
  const card = figma.createRectangle()
  return { graph, figma, card }
}

const fillOf = (headless: ReturnType<typeof documentWithMemory>) =>
  headless.graph.getNode(headless.card.id)?.fills[0]?.color

describe('headless tool calls and the design memory', () => {
  test("a person's off-system color goes through with a warning", async () => {
    const headless = documentWithMemory()
    const result = await runHeadlessTool(headless, tool('set_fill'), {
      id: headless.card.id,
      color: '#FF00AA'
    })
    expect(fillOf(headless)?.g).toBe(0)
    expect(result).toMatchObject({
      design_memory: { violations: [expect.objectContaining({ value: '#FF00AA', severity: 'warn' })] }
    })
  })

  test("an agent's off-system color is refused and put back", async () => {
    const headless = documentWithMemory()
    const before = structuredClone(fillOf(headless))
    const result = await runHeadlessTool(
      headless,
      tool('set_fill'),
      { id: headless.card.id, color: '#FF00AA' },
      { designMemory: 'refuse' }
    )
    expect(result).toMatchObject({
      error: expect.stringContaining('nothing was changed'),
      design_memory: { refused: [expect.objectContaining({ value: '#FF00AA' })] }
    })
    expect(fillOf(headless)).toEqual(before)
  })

  test('an allowed color goes through either way, without a warning', async () => {
    const headless = documentWithMemory()
    const result = await runHeadlessTool(
      headless,
      tool('set_fill'),
      { id: headless.card.id, color: '#1A73E8' },
      { designMemory: 'refuse' }
    )
    expect(fillOf(headless)?.b).toBeCloseTo(232 / 255)
    expect(result).not.toHaveProperty('design_memory')
  })
})
