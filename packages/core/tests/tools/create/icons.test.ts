import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { parseIconName, type IconProvider } from '@pairdraw/core/icons'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'
import { readIcon, type IconOptions } from '@pairdraw/scene-graph/icons'

import { buildIconData } from '#core/icons/svg'

const insertIcon = ALL_TOOLS.find((tool) => tool.name === 'insert_icon')
if (!insertIcon) throw new Error('insert_icon tool missing')

/** A set that draws a square and keeps the options it was asked for, as Material Symbols does. */
function recordingProvider(requests: Array<IconOptions | undefined>): IconProvider {
  return {
    search: async () => ({ icons: [], total: 0, collections: {} }),
    collections: async () => [],
    browse: async () => [],
    previews: async () => new Map(),
    async icons(names, size, options) {
      requests.push(options)
      const found = new Map()
      for (const name of names) {
        const parsed = parseIconName(name)
        if (!parsed) continue
        const icon = buildIconData(
          { body: '<path fill="currentColor" d="M2 2h20v20H2z"/>' },
          parsed.prefix,
          parsed.iconName,
          24,
          24,
          size
        )
        found.set(name, { ...icon, ...(options ? { options } : {}) })
      }
      return found
    }
  }
}

describe('insert_icon options', () => {
  test('passes weight, fill, grade, and optical size as the set’s axes and records them', async () => {
    const requests: Array<IconOptions | undefined> = []
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    figma.icons = recordingProvider(requests)

    const result = (await insertIcon.execute(figma, {
      name: 'material-symbols-outlined:home',
      weight: 600,
      fill: true,
      grade: 25,
      optical_size: 40
    })) as { id: string }

    const options = { opsz: 40, wght: 600, FILL: 1, GRAD: 25 }
    expect(requests).toEqual([options])
    const frame = graph.getNode(result.id)
    expect(frame && readIcon(frame)).toMatchObject({ options })
  })

  test('named options win over the same key in options, and none sends nothing', async () => {
    const requests: Array<IconOptions | undefined> = []
    const figma = new FigmaAPI(new SceneGraph())
    figma.icons = recordingProvider(requests)

    await insertIcon.execute(figma, {
      name: 'test:square',
      weight: 300,
      options: { wght: 700, scale: 'large' }
    })
    await insertIcon.execute(figma, { name: 'test:square' })

    expect(requests).toEqual([{ wght: 300, scale: 'large' }, undefined])
  })
})
