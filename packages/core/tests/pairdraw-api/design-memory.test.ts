import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'
import {
  allowDesignValue,
  createDesignMemory,
  DESIGN_MEMORY_LIMITS,
  pinDesignExample,
  readDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'

function run(graph: SceneGraph, code: string) {
  return compileScript(code)(new FigmaAPI(graph))
}

function documentWithMemory() {
  const graph = new SceneGraph()
  writeDesignMemory(graph, allowDesignValue(createDesignMemory(), 'colors', '#1A73E8'))
  return graph
}

describe('the design memory in scripts', () => {
  test('reads the memory, checks values, and records a decision with an example', async () => {
    const graph = documentWithMemory()
    const result = await run(
      graph,
      `
        const card = figma.createFrame()
        card.name = 'Card'
        const verdicts = pairdraw.checkDesignValues({ colors: ['#1a73e8', '#ff00aa'] })
        const counts = pairdraw.recordDesignDecision('Cards use the brand color.', card)
        return {
          colors: pairdraw.designMemory.groups.colors.allowed.map(({ value }) => value),
          verdicts: verdicts.map(({ verdict }) => verdict),
          counts
        }
      `
    )
    expect(result).toEqual({
      colors: ['#1A73E8'],
      verdicts: ['ok', 'refuse'],
      counts: { decisions: 1, examples: 1 }
    })
    expect(readDesignMemory(graph)?.decisions[0]).toMatchObject({ author: 'agent' })
  })

  test('says so when the memory has no room for another example', async () => {
    const graph = new SceneGraph()
    let memory = createDesignMemory()
    for (let index = 0; index < DESIGN_MEMORY_LIMITS.examples; index++)
      memory = pinDesignExample(memory, `9:${index}`)
    writeDesignMemory(graph, memory)
    await expect(
      run(graph, "pairdraw.recordDesignDecision('Use cards.', figma.createFrame())")
    ).rejects.toThrow('as many examples')
  })

  test('a document without a memory gets none from a script', async () => {
    const graph = new SceneGraph()
    await expect(run(graph, "pairdraw.recordDesignDecision('Anything')")).rejects.toThrow(
      'no design memory'
    )
    expect(await run(graph, 'return pairdraw.designMemory')).toBeNull()
  })
})
