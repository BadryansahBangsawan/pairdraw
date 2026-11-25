import { expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph } from '@pairdraw/scene-graph'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

/** A page with one rectangle filled with a color stored in a Display P3 document. */
function p3Card() {
  const graph = new SceneGraph()
  graph.documentColorSpace = 'display-p3'
  const pageId = graph.getPages()[0].id
  const rect = graph.createNode('RECTANGLE', pageId, {
    width: 40,
    height: 40,
    fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.4, b: 0.3, a: 1 }, opacity: 1, visible: true }]
  })
  return { graph, pageId, rectId: rect.id }
}

test('writes a Display P3 document fill as the sRGB color it shows', () => {
  const { graph, pageId, rectId } = p3Card()
  const svg = expectDefined(
    renderNodesToSVG(graph, pageId, [rectId], { xmlDeclaration: false }),
    'svg'
  )
  expect(svg).toContain('fill="#DB5E44"')
})

test('writes it in Display P3 when the export asks for that profile', () => {
  const { graph, pageId, rectId } = p3Card()
  const svg = expectDefined(
    renderNodesToSVG(graph, pageId, [rectId], { xmlDeclaration: false, colorSpace: 'display-p3' }),
    'svg'
  )
  expect(svg).toContain('fill="color(display-p3 0.8 0.4 0.3)"')
})

test('keeps an sRGB document writing the same hex as before', () => {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const rect = graph.createNode('RECTANGLE', pageId, {
    width: 10,
    height: 10,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
  })
  const svg = expectDefined(
    renderNodesToSVG(graph, pageId, [rect.id], { xmlDeclaration: false }),
    'svg'
  )
  expect(svg).toContain('fill="#FF0000"')
})

test('exports a Display P3 document in its own profile', async () => {
  const { graph, rectId } = p3Card()
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const result = await io.exportContent('svg', {
    graph,
    target: { scope: 'node', nodeId: rectId }
  })
  expect(result.data).toContain('fill="color(display-p3 0.8 0.4 0.3)"')
})

test('exports an sRGB document as the same hex it wrote before', async () => {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const rect = graph.createNode('RECTANGLE', pageId, {
    width: 10,
    height: 10,
    fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
  })
  const io = new IORegistry(BUILTIN_IO_FORMATS)
  const result = await io.exportContent('svg', {
    graph,
    target: { scope: 'node', nodeId: rect.id }
  })
  expect(result.data).toContain('fill="#FF0000"')
})
