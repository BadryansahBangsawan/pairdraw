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

  test('a page switch by id reaches the host', async () => {
    const graph = new SceneGraph()
    const shown: string[] = []
    const figma = new FigmaAPI(graph, {
      onPageChange: (id) => {
        shown.push(id)
      }
    })
    const second = graph.createNode('CANVAS', graph.rootId, { name: 'Second' })

    const result = await switchPage.execute(figma, v.parse(switchPage.input, { page: second.id }))

    expect(result).toEqual({ page: 'Second', id: second.id })
    expect(shown).toEqual([second.id])
  })
})

describe('switch_page while the editor prepares the page', () => {
  test('answers without waiting for a host switch that has not finished', async () => {
    const graph = new SceneGraph()
    // The editor loads a page's layers and fonts before it shows it, which takes seconds.
    const never = new Promise<void>(() => {
      // A page still loading: the switch finishes when the host finishes preparing it.
    })
    const figma = new FigmaAPI(graph, { onPageChange: () => never })
    const second = graph.createNode('CANVAS', graph.rootId, { name: 'Second' })

    const result = await switchPage.execute(figma, v.parse(switchPage.input, { page: 'Second' }))

    expect(result).toEqual({ page: 'Second', id: second.id })
  }, 300)
})
