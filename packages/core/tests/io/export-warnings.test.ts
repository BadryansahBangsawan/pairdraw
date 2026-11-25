import { expect, test } from 'bun:test'

import { penWriteWarningText, type PenWriteWarning } from '@pairdraw/pen'
import { SceneGraph } from '@pairdraw/scene-graph'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'
import { drawioWriteWarningText, type DrawioWriteWarning } from '#core/io/formats/drawio/warnings'

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** Two pages, which a Pencil.dev file cannot hold. */
function twoPages() {
  const graph = new SceneGraph()
  graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card', width: 100, height: 60 })
  const second = graph.addPage('Second')
  graph.createNode('RECTANGLE', second.id, { name: 'Second card', width: 10, height: 10 })
  return graph
}

/** A document whose paint uses a variable, which draw.io has no place for. */
function themed() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 60 })
  graph.createNode('RECTANGLE', frame.id, { width: 40, height: 40 })
  const collection = graph.createCollection('Brand')
  const variable = graph.createVariable('primary', 'COLOR', collection.id, '#3366ff')
  return { graph, variable }
}

test('the pen writer reports what it left out as kinds and as text', async () => {
  const result = await io.writeDocument('pen', twoPages())
  const detail: PenWriteWarning = { kind: 'merged-pages', pages: 2, name: 'Page 1' }

  expect(result.warningDetails).toEqual([detail])
  expect(result.warnings).toEqual([penWriteWarningText(detail)])
})

test('a pen write with nothing to report has neither warnings nor details', async () => {
  const graph = new SceneGraph()
  graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card', width: 100, height: 60 })

  const result = await io.writeDocument('pen', graph)

  expect(result.warnings ?? []).toEqual([])
  expect(result.warningDetails ?? []).toEqual([])
})

test('the drawio writer reports its unbound variables as kinds and as text', async () => {
  const result = await io.writeDocument('drawio', themed().graph)
  const detail: DrawioWriteWarning = {
    kind: 'unbound-variables',
    variables: 1,
    collections: ['Brand'],
    layers: 0
  }

  expect(result.warningDetails).toEqual([detail])
  expect(result.warnings).toEqual([drawioWriteWarningText(detail)])
})

test('a drawio write with nothing to report has neither warnings nor details', async () => {
  const graph = new SceneGraph()
  graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card', width: 100, height: 60 })

  const result = await io.writeDocument('drawio', graph)

  expect(result.warnings ?? []).toEqual([])
  expect(result.warningDetails ?? []).toEqual([])
})

test('the drawio text names the layers that lose a binding', () => {
  const one: DrawioWriteWarning = {
    kind: 'unbound-variables',
    variables: 1,
    collections: ['Brand'],
    layers: 1
  }
  const many: DrawioWriteWarning = { ...one, layers: 2 }

  expect(drawioWriteWarningText(one)).toContain('1 layer that uses one lost the binding')
  expect(drawioWriteWarningText(many)).toContain('2 layers that use them lost the binding')
})
