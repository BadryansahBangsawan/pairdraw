import { expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

import { SceneGraph } from '@pairdraw/scene-graph'

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** A card of the kinds a Figma document uses most, written to draw.io and read back. */
function card() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Card',
    x: 0,
    y: 0,
    width: 320,
    height: 200
  })
  graph.createNode('RECTANGLE', frame.id, {
    name: 'Accent',
    x: 24,
    y: 24,
    width: 80,
    height: 40
  })
  graph.createNode('TEXT', frame.id, {
    name: 'Label',
    x: 24,
    y: 90,
    width: 83,
    height: 15,
    text: 'Hello Pairdraw'
  })
  return graph
}

async function roundTrip(graph: SceneGraph): Promise<SceneGraph> {
  const written = await io.writeDocument('drawio', graph)
  const text = typeof written.data === 'string' ? written.data : new TextDecoder().decode(written.data)
  const { graph: back } = await io.readDocument({
    name: 'roundtrip.drawio',
    data: new TextEncoder().encode(text)
  })
  return back
}

test('keeps a frame, a rectangle and a text layer through draw.io', async () => {
  const back = await roundTrip(card())
  const [frame] = back.getChildren(back.getPages()[0].id)

  expect(frame?.type).toBe('FRAME')
  expect(frame?.name).toBe('Card')
  const children = back.getChildren(frame.id)
  expect(children.map((node) => [node.type, node.name])).toEqual([
    ['RECTANGLE', 'Accent'],
    ['TEXT', 'Label']
  ])
})
