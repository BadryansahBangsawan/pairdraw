import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { createAPI } from '#core-tests/helpers/figma-api'

describe('selection', () => {
  test('selection get/set', () => {
    const api = createAPI()
    const frame = api.createFrame()
    api.currentPage.selection = [frame]
    expect(api.currentPage.selection.length).toBe(1)
    expect(api.currentPage.selection[0].id).toBe(frame.id)
  })

  test('selection empty by default', () => {
    const api = createAPI()
    expect(api.currentPage.selection).toEqual([])
  })

  test('a script selection change selects those layers for the host too', () => {
    const shown: string[][] = []
    const api = createAPI({ onSelectionChange: (ids) => shown.push([...ids]) })
    const rect = api.createRectangle()

    api.currentPage.selection = [rect]
    api.currentPage.selection = [rect]

    expect(shown).toEqual([[rect.id]])
    expect(api.currentPage.selection.map((node) => node.id)).toEqual([rect.id])
  })

  test('starting from the selection the host already shows leaves the host alone', () => {
    const graph = new SceneGraph()
    const rect = graph.createNode('RECTANGLE', graph.getPages()[0].id)
    const shown: string[][] = []
    const api = new FigmaAPI(graph, {
      selection: [rect.id],
      onSelectionChange: (ids) => shown.push([...ids])
    })

    expect(api.currentPage.selection.map((node) => node.id)).toEqual([rect.id])
    expect(shown).toEqual([])

    api.currentPage.selection = []

    expect(shown).toEqual([[]])
  })
})
