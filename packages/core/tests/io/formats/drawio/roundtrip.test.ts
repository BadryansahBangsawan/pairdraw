import { expect, test } from 'bun:test'

import { parseDrawIOFile } from '@pairdraw/drawio'
import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'

import { SceneGraph } from '@pairdraw/scene-graph'

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** A connector routed by hand: it leaves and enters its layers off centre, bends, and is styled. */
const ROUTED_FLOW = `<mxfile><diagram id="p" name="Flow"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="a" value="A" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell><mxCell id="b" value="B" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="400" y="240" width="120" height="60" as="geometry"/></mxCell><mxCell id="e" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;exitX=0.25;exitY=0.75;entryX=0.1;entryY=0.9;exitPerimeter=0;entryPerimeter=0;endArrow=block;strokeColor=#123456;strokeWidth=2;jettySize=auto;" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"><mxArray as="points"><mxPoint x="220" y="150"/><mxPoint x="320" y="150"/><mxPoint x="320" y="290"/></mxArray></mxGeometry></mxCell></root></mxGraphModel></diagram></mxfile>`

const ROUTE = [
  { x: 220, y: 150 },
  { x: 320, y: 150 },
  { x: 320, y: 290 }
]

async function read(source: string) {
  return io.readDocument({ name: 'flow.drawio', data: new TextEncoder().encode(source) })
}

/** The edge cell of the written file. */
async function writtenEdge(graph: SceneGraph) {
  const written = await io.writeDocument('drawio', graph)
  const text =
    typeof written.data === 'string' ? written.data : new TextDecoder().decode(written.data)
  const file = parseDrawIOFile(text)
  return file?.pages[0]?.cells.find((cell) => cell.kind === 'edge')
}


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

test('writes an unedited connector back with the route and style it was read with', async () => {
  const { graph } = await read(ROUTED_FLOW)

  const edge = await writtenEdge(graph)

  expect(edge?.geometry.points).toEqual(ROUTE)
  expect(edge?.style.values).toEqual({
    edgeStyle: 'orthogonalEdgeStyle',
    rounded: '0',
    html: '1',
    exitX: '0.25',
    exitY: '0.75',
    entryX: '0.1',
    entryY: '0.9',
    exitPerimeter: '0',
    entryPerimeter: '0',
    endArrow: 'block',
    strokeColor: '#123456',
    strokeWidth: '2',
    jettySize: 'auto'
  })
})

test('writes a moved connector with the route its new ends make', async () => {
  const { graph } = await read(ROUTED_FLOW)
  const [, b] = graph
    .getChildren(graph.getPages()[0].id)
    .filter((node) => node.type === 'SHAPE_WITH_TEXT')
  graph.updateNode(b.id, { x: 520, y: 340 })

  const edge = await writtenEdge(graph)

  expect(edge?.geometry.points).not.toEqual(ROUTE)
})

test('writes a connector whose route was dragged with the route it now takes', async () => {
  const { graph } = await read(ROUTED_FLOW)
  const connector = [...graph.getAllNodes()].find((node) => node.type === 'CONNECTOR')
  if (!connector) throw new Error('expected a connector')
  graph.updateNode(connector.id, {
    connectorControlPoints: [{ position: { x: 200, y: 150 }, direction: 'HORIZONTAL' }]
  })

  const edge = await writtenEdge(graph)

  expect(edge?.geometry.points).not.toEqual(ROUTE)
})
