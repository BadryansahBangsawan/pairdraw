import { expect, test } from 'bun:test'

import { FIXTURES } from '#core-tests/helpers/fig/fixtures'

import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { readHTMLDocument } from '@pairdraw/core/io/formats/html/import'
import type { Fill, SceneNode } from '@pairdraw/scene-graph'

// Readers build layers that share one frozen value for every empty list and record; a reader or
// writer that wrote into one instead of replacing it would throw a TypeError here.

const RED: Fill = { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }

test('reading .pen, HTML, and .fig, then editing and saving, writes into no shared value', async () => {
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const pen = await io.readDocument({
    name: 'pen-variables.pen',
    data: new Uint8Array(await Bun.file(`${FIXTURES}/pen-variables.pen`).arrayBuffer())
  })
  const html = await readHTMLDocument(
    '<div style="display:flex;gap:8px;padding:4px"><p>Text</p><img src="https://example.com/a.png" width="20" height="20"></div>'
  )
  const fig = await parseFigFile(await Bun.file(`${FIXTURES}/slots.fig`).arrayBuffer())
  for (const graph of [pen.graph, html.graph, fig]) {
    const layers: SceneNode[] = [...graph.getAllNodes()].filter(
      (node) => node.type !== 'CANVAS' && node.id !== graph.rootId
    )
    expect(layers.length).toBeGreaterThan(0)
    const fillCounts = layers.map((node) => node.fills.length)
    for (const node of layers)
      graph.updateNode(node.id, { fills: [...node.fills, RED], effects: [] })
    expect(layers.map((node) => graph.getNode(node.id)?.fills.length)).toEqual(
      fillCounts.map((count) => count + 1)
    )
  }
  const saved = await exportFigFile(fig)
  expect(saved.byteLength).toBeGreaterThan(0)
})
