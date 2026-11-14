import { afterEach, describe, expect, test } from 'bun:test'

import { fromUint8Array, toUint8Array } from 'js-base64'

import { createEditor, type Editor } from '@pairdraw/core'
import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'
import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { sceneNodeToJSX } from '@pairdraw/design-jsx'
import { sceneNodeToDesignDocument } from '@pairdraw/dom-css/export'
import { readBrowserNode } from '@pairdraw/scene-graph/browser-node'
import { imageSize } from '@pairdraw/scene-graph/images'

import { createBrowserNodeFromPage } from '@/app/browser/node/apply'
import type { BrowserNodeOutcome, BrowserNodeSession } from '@/app/browser/node/session'
import { markClosed, setDevice } from '@/app/browser/state'

const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
const WHEN = '2026-11-13T00:00:00.000Z'
const PAGE = 'https://example.com/docs'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const editors: Editor[] = []

afterEach(() => {
  markClosed()
  setDevice('desktop')
  for (const editor of editors.splice(0)) editor.dispose()
})

function editor(): Editor {
  const created = createEditor()
  editors.push(created)
  return created
}

function session(): BrowserNodeSession {
  return { desktop: true, open: true, url: PAGE, preset: 'desktop' }
}

async function snapshot(): Promise<{ graph: Editor; id: string }> {
  const graph = editor()
  const result = await createBrowserNodeFromPage(
    graph,
    session(),
    { screenshot: () => Promise.resolve(PNG), capturedAddress: () => PAGE },
    WHEN
  )
  const id = idOf(result)
  // The layer's name is the host. Exports are checked for the page address, so the name is not that host.
  graph.graph.updateNode(id, { name: 'Snapshot' })
  return { graph, id }
}

function idOf(result: BrowserNodeOutcome): string {
  if (!result.ok) throw new Error(result.error)
  return result.id
}

function asBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data
  throw new Error('Expected export bytes')
}

function asText(data: unknown): string {
  if (typeof data === 'string') return data
  return new TextDecoder('latin1').decode(asBytes(data))
}

describe('exporting a browser snapshot', () => {
  test('PNG is the picture, at the layer size, without the page address', async () => {
    const { graph, id } = await snapshot()
    const node = graph.graph.getNode(id)
    if (!node) throw new Error('Expected the snapshot layer')
    const result = await io.exportContent('png', {
      graph: graph.graph,
      target: { scope: 'node', nodeId: id }
    })
    const bytes = asBytes(result.data)
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(imageSize(bytes)).toEqual({ width: node.width, height: node.height })
    expect(asText(bytes).includes(PAGE)).toBe(false)
    expect(readBrowserNode(node)?.url).toBe(PAGE)
  })

  test('SVG embeds the picture and not a page', async () => {
    const { graph, id } = await snapshot()
    const svg = renderNodesToSVG(graph.graph, graph.state.currentPageId, [id])
    expect(svg).toContain(fromUint8Array(PNG))
    expect(svg?.includes('iframe')).toBe(false)
    expect(svg?.includes('example.com')).toBe(false)
    const exported = await io.exportContent('svg', {
      graph: graph.graph,
      target: { scope: 'node', nodeId: id }
    })
    expect(asText(exported.data).includes('iframe')).toBe(false)
    expect(asText(exported.data).includes(PAGE)).toBe(false)
  })

  test('PDF is a document of the picture and not a link to the page', async () => {
    const { graph, id } = await snapshot()
    const result = await io.exportContent('pdf', {
      graph: graph.graph,
      target: { scope: 'node', nodeId: id }
    })
    const bytes = asBytes(result.data)
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe('%PDF-')
    expect(asText(bytes).includes(PAGE)).toBe(false)
  })

  test('JSX writes the image fill and not the page address', async () => {
    const { graph, id } = await snapshot()
    const node = graph.graph.getNode(id)
    const fill = node?.fills[0]
    if (fill?.type !== 'IMAGE' || !fill.imageHash) throw new Error('Expected an image fill')
    const jsx = sceneNodeToJSX(id, graph.graph)
    expect(jsx.includes(fill.imageHash)).toBe(true)
    expect(jsx.includes('iframe')).toBe(false)
    expect(jsx.includes(PAGE)).toBe(false)
    expect(jsx.includes('example.com')).toBe(false)
  })

  test('CSS is an image whose source is the picture', async () => {
    const { graph, id } = await snapshot()
    const projected = sceneNodeToDesignDocument(graph.graph, id)
    const [child] = projected.children
    if (!child || child.type !== 'element') throw new Error('Expected an image element')
    expect(child.tagName).toBe('img')
    expect(child.attrs.src.startsWith('data:image/png;base64,')).toBe(true)
    expect(child.attrs.src.includes(PAGE)).toBe(false)
    const html = await io.exportContent('html', {
      graph: graph.graph,
      target: { scope: 'node', nodeId: id }
    })
    const text = asText(html.data)
    expect(text.includes('data:image/png;base64,')).toBe(true)
    expect(text.includes('<iframe')).toBe(false)
    expect(text.includes(PAGE)).toBe(false)
  })
})
