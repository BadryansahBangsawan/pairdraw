import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { switchPage } from '#core/tools/read/pages'

describe('switch_page', () => {
  test('puts the host on the page it reports', async () => {
    const graph = new SceneGraph()
    const shown: string[] = []
    const figma = new FigmaAPI(graph, {
      onPageChange: (id) => {
        shown.push(id)
      }
    })
    const second = graph.createNode('CANVAS', graph.rootId, { name: 'Second' })

    const result = await switchPage.execute(
      figma,
      v.parse(switchPage.input, { page: 'Second' })
    )

    expect(result).toEqual({ page: 'Second', id: second.id })
    expect(shown).toEqual([second.id])
    expect(figma.currentPageId).toBe(second.id)
  })

  test('answers only after the host has shown the page', async () => {
    const graph = new SceneGraph()
    let shown = false
    const figma = new FigmaAPI(graph, {
      onPageChange: async () => {
        await Promise.resolve()
        shown = true
      }
    })
    graph.createNode('CANVAS', graph.rootId, { name: 'Second' })

    await switchPage.execute(figma, v.parse(switchPage.input, { page: 'Second' }))

    expect(shown).toBe(true)
  })
})
