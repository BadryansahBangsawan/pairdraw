import { describe, expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import { SceneGraph } from '@pairdraw/scene-graph'
import {
  DEFAULT_EXPORT_QUALITY,
  EXPORT_FORMAT_IDS,
  clampExportQuality,
  isExportFormatId
} from '@pairdraw/scene-graph/export-format'
import { PAIRDRAW_PLUGIN_DATA, readPluginData } from '@pairdraw/scene-graph/plugin-data'

const io = new IORegistry(BUILTIN_IO_FORMATS)

describe('export setting formats', () => {
  test('every persisted export format is a node-exportable IO adapter', () => {
    const nodeExportIds = new Set(io.listExportFormats('node').map((format) => format.id))
    for (const id of EXPORT_FORMAT_IDS) expect(nodeExportIds.has(id)).toBe(true)
  })

  test('recognizes only persisted export formats', () => {
    expect(isExportFormatId('pptx')).toBe(true)
    expect(isExportFormatId('drawio')).toBe(true)
    expect(isExportFormatId('html')).toBe(true)
    expect(isExportFormatId('fig')).toBe(false)
    expect(isExportFormatId('PNG')).toBe(false)
  })

  test('only JPG and WEBP take a quality', () => {
    const takesQuality = EXPORT_FORMAT_IDS.filter(
      (id) => io.getFormat(id)?.exportOptions?.quality === true
    )
    expect(takesQuality).toEqual(['jpg', 'webp'])
  })

  test('a quality is a whole number from 1 to 100', () => {
    expect(clampExportQuality(0)).toBe(1)
    expect(clampExportQuality(250)).toBe(100)
    expect(clampExportQuality(72.4)).toBe(72)
    expect(clampExportQuality(Number.NaN)).toBe(DEFAULT_EXPORT_QUALITY)
  })

  test('a quality survives the file, clamped, and stays off rows without one', () => {
    const graph = new SceneGraph()
    const frame = graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card' })
    const pluginData = [
      {
        pluginId: 'pairdraw',
        key: 'exportSettings',
        value: JSON.stringify([
          { scale: 1, format: 'jpg', quality: 300 },
          { scale: 2, format: 'png' }
        ])
      }
    ]
    graph.updateNode(frame.id, { pluginData })
    const node = graph.getNode(frame.id)
    if (!node) throw new Error('Expected the frame')
    expect(readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.exportSettings)).toEqual([
      { scale: 1, format: 'jpg', quality: 100 },
      { scale: 2, format: 'png' }
    ])
  })
})

/** Three frames of different widths, so each PDF page tells which frame it holds. */
function slides() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const ids = [320, 480, 640].map(
    (width, index) =>
      graph.createNode('FRAME', page.id, {
        name: `Slide ${index + 1}`,
        x: index * 700,
        width,
        height: 180,
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
      }).id
  )
  return { graph, page, ids }
}

/** The width in points of each page of a PDF, in order. */
function pageWidths(data: unknown): number[] {
  if (!(data instanceof Uint8Array)) throw new Error('Expected PDF bytes')
  const text = new TextDecoder('latin1').decode(data)
  return [...text.matchAll(/\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)/g)].map((match) =>
    Math.round(Number(match[1]))
  )
}

describe('PDF export format', () => {
  test('a selection is one PDF with a page per layer, in the order it was selected', async () => {
    const { graph, ids } = slides()
    const [first, second, third] = ids
    const result = await io.exportContent('pdf', {
      graph,
      target: { scope: 'selection', nodeIds: [third, first, second] }
    })
    expect(pageWidths(result.data)).toEqual([640, 320, 480])
  })

  test('a selection can still share one page', async () => {
    const { graph, ids } = slides()
    const result = await io.exportContent(
      'pdf',
      { graph, target: { scope: 'selection', nodeIds: ids } },
      { pages: 'single' }
    )
    expect(pageWidths(result.data)).toHaveLength(1)
  })

  test('a page is one PDF page of its layers unless frames are asked for', async () => {
    const { graph, page } = slides()
    const single = await io.exportContent('pdf', {
      graph,
      target: { scope: 'page', pageId: page.id }
    })
    expect(pageWidths(single.data)).toHaveLength(1)

    const frames = await io.exportContent(
      'pdf',
      { graph, target: { scope: 'page', pageId: page.id } },
      { pages: 'frames' }
    )
    expect(pageWidths(frames.data)).toEqual([320, 480, 640])
  })
})

describe('HTML export layer attributes', () => {
  function pricingCard() {
    const graph = new SceneGraph()
    const card = graph.createNode('FRAME', graph.getPages()[0].id, {
      name: 'Pricing card',
      width: 120,
      height: 80
    })
    return { graph, card }
  }

  test('layer names are written and IDs left out by default', async () => {
    const { graph, card } = pricingCard()
    const result = await io.exportContent('html', {
      graph,
      target: { scope: 'node', nodeId: card.id }
    })
    expect(String(result.data)).toContain('data-name="Pricing card"')
    expect(String(result.data)).not.toContain('data-pairdraw-node-id')
  })

  test('either attribute can be turned around', async () => {
    const { graph, card } = pricingCard()
    const result = await io.exportContent(
      'html',
      { graph, target: { scope: 'node', nodeId: card.id } },
      { layerNames: false, layerIds: true }
    )
    expect(String(result.data)).not.toContain('data-name=')
    expect(String(result.data)).toContain(`data-pairdraw-node-id="${card.id}"`)
  })
})
