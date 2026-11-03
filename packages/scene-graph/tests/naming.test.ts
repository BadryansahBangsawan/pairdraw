import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import { numberedName } from '@open-pencil/scene-graph/naming'

describe('numberedName', () => {
  test('keeps a free name', () => {
    expect(numberedName('Spacing', ['Brand'])).toBe('Spacing')
  })

  test('numbers a taken name from 2, skipping numbers in use', () => {
    expect(numberedName('Spacing', ['Spacing'])).toBe('Spacing 2')
    expect(numberedName('Spacing', ['Spacing', 'Spacing 2', 'Spacing 3'])).toBe('Spacing 4')
  })
})

describe('SceneGraph.entityIdMinter', () => {
  test('mints ids from the graph generator that no entity uses and that never repeat', () => {
    let next = 0
    // Every id comes twice, so the minter has to skip ones it already gave.
    const graph = new SceneGraph(() => `n${Math.floor(next++ / 2)}`)
    graph.createCollection('Theme')
    const mint = graph.entityIdMinter()
    const minted = [mint(), mint(), mint()]
    expect(new Set(minted).size).toBe(3)
    for (const id of minted) {
      expect(id).toMatch(/^n\d+$/)
      expect(graph.isEntityIdTaken(id)).toBe(false)
    }
  })
})
