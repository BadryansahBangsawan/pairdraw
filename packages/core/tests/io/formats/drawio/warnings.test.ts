import { expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

import { SceneGraph } from '@pairdraw/scene-graph'

const io = new IORegistry(BUILTIN_IO_FORMATS)

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

test('writing draw.io reports the variables it cannot hold', async () => {
  const { graph } = themed()

  const result = await io.writeDocument('drawio', graph)

  expect(result.warnings?.join(' ')).toContain('variable')
  expect(result.warnings?.join(' ')).toContain('Brand')
})

test('writing draw.io says nothing about a document without variables', async () => {
  const graph = new SceneGraph()
  graph.createNode('FRAME', graph.getPages()[0].id, { name: 'Card', width: 100, height: 60 })

  const result = await io.writeDocument('drawio', graph)

  expect(result.warnings ?? []).toEqual([])
})
