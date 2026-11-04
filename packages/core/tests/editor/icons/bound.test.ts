import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { parseIconName, type IconProvider } from '@open-pencil/core/icons'
import { SceneGraph } from '@open-pencil/scene-graph'
import { readIcon } from '@open-pencil/scene-graph/icons'

import { buildIconData } from '#core/icons/svg'

// Real timers on purpose: the redraw under test is genuinely async, fetching the glyph after
// the mode change lands, so no deterministic clock can drive it. The poll only waits out the
// fetch; a missed redraw fails on the icon, not on time.
async function waitFor(check: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) await Bun.sleep(10)
  expect(check()).toBe(true)
}
const BODIES: Record<string, string> = {
  'test:square': '<path fill="currentColor" d="M2 2h20v20H2z"/>',
  'test:lines': '<path fill="none" stroke="currentColor" d="M4 4h16M4 12h16"/>'
}

/** Icons drawn from fixed bodies, so the commands run without the network. */
const provider: IconProvider = {
  search: async () => ({ icons: Object.keys(BODIES), total: 2, collections: {} }),
  collections: async () => [],
  browse: async () => Object.keys(BODIES),
  previews: async (names) =>
    new Map(names.flatMap((name) => (BODIES[name] ? [[name, `<svg>${BODIES[name]}</svg>`]] : []))),
  async icons(names, size) {
    const found = new Map()
    for (const name of names) {
      const parsed = parseIconName(name)
      const body = BODIES[name]
      if (parsed && body)
        found.set(name, buildIconData({ body }, parsed.prefix, parsed.iconName, 24, 24, size))
    }
    return found
  }
}

function setup() {
  const graph = new SceneGraph()
  const modes = graph.createCollection('Icons')
  const alt = graph.createMode(modes.id, 'Alt') ?? ''
  const glyph = graph.createVariable('Icon/Glyph', 'STRING', modes.id, 'test:square')
  glyph.valuesByMode[alt] = 'test:lines'
  const editor = createEditor({ graph, icons: provider })
  return { graph, editor, modes, alt, glyph }
}

describe('variable-driven icons', () => {
  test('binding an icon name rejects non-string variables', () => {
    const { graph, glyph } = setup()
    const frameId = graph.createNode('FRAME', graph.getPages()[0].id, {}).id
    const number = graph.createVariable('N', 'FLOAT', glyph.collectionId, 1)
    expect(() => graph.bindVariable(frameId, 'iconName', number.id)).toThrow(
      'Cannot bind FLOAT variable to icon field "iconName"'
    )
    expect(() => graph.bindVariable(frameId, 'nope', glyph.id)).toThrow(
      'Unknown binding field "nope"'
    )
  })

  test('a mode change swaps the bound icon', async () => {
    const { graph, editor, modes, alt, glyph } = setup()
    const frameId = await editor.insertIcon('test:square')
    if (!frameId) throw new Error('Icon was not inserted')
    const before = graph.getChildren(frameId).map((child) => child.id)

    editor.bindVariable(frameId, 'iconName', glyph.id)
    expect(readIcon(getFrame(graph, frameId))?.name).toBe('test:square')

    editor.setActiveMode(modes.id, alt)
    await waitFor(() => readIcon(getFrame(graph, frameId))?.name === 'test:lines')
    const after = graph.getChildren(frameId).map((child) => child.id)
    expect(after).not.toEqual(before)
    // The paths an icon draws are the new glyph's: two strokes, no fill.
    expect(
      graph.getChildren(frameId).every((child) => child.strokes.length > 0 && child.fills.length === 0)
    ).toBe(true)

    editor.setActiveMode(modes.id, modes.defaultModeId)
    await waitFor(() => readIcon(getFrame(graph, frameId))?.name === 'test:square')
  })
})

function getFrame(graph: SceneGraph, id: string) {
  const frame = graph.getNode(id)
  if (!frame) throw new Error('Missing icon frame')
  return frame
}
