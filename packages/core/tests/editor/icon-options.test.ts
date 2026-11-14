import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import { parseIconName, type IconData, type IconProvider } from '@pairdraw/core/icons'
import { readIcon, type IconOptions } from '@pairdraw/scene-graph/icons'
import type { Color } from '@pairdraw/scene-graph/primitives'

import { buildIconData } from '#core/icons/svg'

import { getNodeOrThrow } from '../helpers/assert'

const RED: Color = { r: 1, g: 0, b: 0, a: 1 }
const DEFAULTS = { opsz: 24, wght: 400, FILL: 0, GRAD: 0 }

/**
 * A set drawn as Material Symbols are, from axes: a heavier weight draws a wider bar, so each
 * drawing shows the options it was asked for. It records the options of every request.
 */
function axesProvider() {
  const asked: (IconOptions | undefined)[] = []
  const provider: IconProvider = {
    search: async () => ({ icons: ['axes:bar'], total: 1, collections: {} }),
    collections: async () => [],
    browse: async () => ['axes:bar'],
    previews: async () => new Map(),
    async icons(names, size, options) {
      asked.push(options)
      const axes = { ...DEFAULTS, ...options }
      const found = new Map<string, IconData>()
      for (const name of names) {
        const parsed = parseIconName(name)
        if (!parsed) continue
        const width = Number(axes.wght) / 50
        const body = `<path fill="currentColor" d="M2 2h${width}v20H2z"/>`
        const icon = buildIconData({ body }, parsed.prefix, parsed.iconName, 24, 24, size)
        found.set(name, { ...icon, options: axes })
      }
      return found
    }
  }
  return { provider, asked }
}

function setup() {
  const { provider, asked } = axesProvider()
  const editor = createEditor({
    getViewportSize: () => ({ width: 1000, height: 800 }),
    icons: provider
  })
  return { editor, asked }
}

async function insert(editor: ReturnType<typeof setup>['editor']) {
  const id = await editor.insertIcon('axes:bar', RED)
  if (!id) throw new Error('The icon was not inserted')
  return id
}

/** The outline the icon draws, which a different weight changes. */
function outline(editor: ReturnType<typeof setup>['editor'], id: string) {
  return JSON.stringify(editor.graph.getChildren(id).map((path) => path.vectorNetwork))
}

describe('icon options', () => {
  test('a new option redraws the icon with it, over the options it had, in one undo step', async () => {
    const { editor, asked } = setup()
    const id = await insert(editor)
    const placed = outline(editor, id)
    expect(readIcon(getNodeOrThrow(editor.graph, id))?.options).toEqual(DEFAULTS)

    await editor.setIconOptions(id, { FILL: 1 })
    await editor.setIconOptions(id, { wght: 700 })

    expect(asked.at(-1)).toEqual({ ...DEFAULTS, FILL: 1, wght: 700 })
    expect(readIcon(getNodeOrThrow(editor.graph, id))?.options).toEqual({
      ...DEFAULTS,
      FILL: 1,
      wght: 700
    })
    expect(outline(editor, id)).not.toBe(placed)

    editor.undo.undo()
    editor.undo.undo()
    expect(readIcon(getNodeOrThrow(editor.graph, id))?.options).toEqual(DEFAULTS)
    expect(outline(editor, id)).toBe(placed)

    editor.undo.redo()
    expect(readIcon(getNodeOrThrow(editor.graph, id))?.options).toEqual({ ...DEFAULTS, FILL: 1 })
  })

  test('the icon keeps its place, size, and color', async () => {
    const { editor } = setup()
    const id = await insert(editor)
    editor.updateNode(id, { x: 40, y: 60, width: 48, height: 48 })

    await editor.setIconOptions(id, { wght: 200 })

    const frame = getNodeOrThrow(editor.graph, id)
    expect(frame).toMatchObject({ x: 40, y: 60, width: 48, height: 48 })
    const paints = editor.graph.getChildren(id).flatMap((path) => path.fills)
    expect(paints.map((paint) => paint.color)).toEqual([RED])
  })

  test('a swap within the set keeps the options set', async () => {
    const { editor, asked } = setup()
    const id = await insert(editor)
    await editor.setIconOptions(id, { wght: 650 })

    await editor.swapIconGlyph(id, 'axes:other')

    expect(asked.at(-1)).toMatchObject({ wght: 650 })
  })

  test('a layer that is not an icon is left alone', async () => {
    const { editor, asked } = setup()
    const frame = editor.createShape('FRAME', 0, 0, 24, 24)
    const before = asked.length

    await editor.setIconOptions(frame, { wght: 700 })

    expect(asked).toHaveLength(before)
  })
})
