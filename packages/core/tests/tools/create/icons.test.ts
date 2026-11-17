import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { buildIconData } from '@pairdraw/core/icons/svg'
import { SceneGraph } from '@pairdraw/scene-graph'

import { insertIcon } from '#core/tools/create/icons'

function icons() {
  const figma = new FigmaAPI(new SceneGraph())
  const icon = buildIconData({ body: '<path d="M2 2h8v8H2z"/>' }, 'test', 'square', 24, 24, 24)
  figma.icons = {
    icons: async (names: readonly string[]) => new Map(names.map((name) => [name, icon])),
    previews: async () => new Map(),
    collections: async () => [],
    browse: async () => [],
    search: async () => ({ icons: [], total: 0, collections: {} })
  }
  return { figma, icon }
}

describe('insert_icon placement', () => {
  test('places the icon where the caller asks', async () => {
    const { figma } = icons()

    const result = await insertIcon.execute(
      figma,
      v.parse(insertIcon.input, { name: 'test:square', x: 120, y: 80 })
    )

    const id = (result as { id: string }).id
    const frame = figma.graph.getNode(id)
    expect(frame).toMatchObject({ x: 120, y: 80 })
  })

  test('keeps the parent layout in charge when no position is given', async () => {
    const { figma } = icons()

    const result = await insertIcon.execute(figma, v.parse(insertIcon.input, { name: 'test:square' }))

    const frame = figma.graph.getNode((result as { id: string }).id)
    expect(frame?.x).toBe(0)
    expect(frame?.y).toBe(0)
  })
})
