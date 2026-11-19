import { afterAll, describe, expect, test } from 'bun:test'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { computeAllLayouts } from '@pairdraw/core/layout'
import { geometryBlobBounds } from '@pairdraw/scene-graph/geometry'
import { SceneGraph } from '@pairdraw/scene-graph'
import { syncInstances } from '@pairdraw/scene-graph/instances'

import { expectDefined } from '#core-tests/helpers/assert'
import { renderRow } from '#core-tests/helpers/figma-rows'

type Point = readonly [x: number, y: number]

function contoursBlob(contours: Point[][]): Uint8Array {
  const commands = contours.flatMap((points) => [
    ...points.map(([x, y], index) => [index === 0 ? 1 : 2, x, y]),
    [0, 0, 0]
  ])
  const blob = new Uint8Array(commands.reduce((length, [command]) => length + (command ? 9 : 1), 0))
  const view = new DataView(blob.buffer)
  let offset = 0
  for (const [command, x, y] of commands) {
    blob[offset++] = command
    if (command) {
      view.setFloat32(offset, x, true)
      view.setFloat32(offset + 4, y, true)
      offset += 8
    }
  }
  return blob
}

function box(width: number, height: number, outset = 0): Point[] {
  return [
    [-outset, -outset],
    [width + outset, -outset],
    [width + outset, height + outset],
    [-outset, height + outset]
  ]
}

function savedOutlines(width: number, height: number) {
  return {
    fillGeometry: [{ windingRule: 'NONZERO' as const, commandsBlob: contoursBlob([box(width, height)]) }],
    strokeGeometry: [
      { windingRule: 'EVENODD' as const, commandsBlob: contoursBlob([box(width, height)]) }
    ]
  }
}

/**
 * A Badge component (hug auto layout, 1 px INSIDE stroke, growing label) inside a Card component,
 * shown by a Card instance. The imported `.fig` materializes the nested Badge instance with the
 * component's saved outlines, as `copy.ts` copies every geometry field onto a layer.
 */
function badgeInCard() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const badge = graph.createNode('COMPONENT', page.id, {
    name: 'Badge',
    width: 42,
    height: 24,
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
    paddingBottom: 2,
    strokes: [
      {
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        weight: 1,
        align: 'INSIDE'
      }
    ],
    strokeWeight: 1,
    strokeAlign: 'INSIDE'
  })
  graph.createNode('TEXT', badge.id, {
    name: 'Label',
    text: 'iOS',
    width: 26,
    height: 20,
    textAutoResize: 'WIDTH_AND_HEIGHT',
    fontSize: 14
  })
  const card = graph.createNode('COMPONENT', page.id, {
    name: 'Card',
    x: 0,
    y: 60,
    width: 200,
    height: 60,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    itemSpacing: 8,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 8
  })
  graph.createInstance(badge.id, card.id, { x: 0, y: 0 })
  const cardInstance = graph.createInstance(card.id, page.id, { x: 100, y: 100 })
  if (!cardInstance) throw new Error('The Card instance was not created')
  computeAllLayouts(graph)

  const badgeInstance = cardInstance.childIds
    .map((id) => graph.getNode(id))
    .find((node) => node?.type === 'INSTANCE')
  const label = badgeInstance?.childIds.map((id) => graph.getNode(id)).find((node) => node?.type === 'TEXT')
  if (!badgeInstance || !label) throw new Error('The nested Badge instance has no label')
  graph.updateNode(badgeInstance.id, savedOutlines(badgeInstance.width, badgeInstance.height))
  return { graph, badgeInstance, label }
}

describe('a nested instance that grows', () => {
  test('draws its saved outlines from its new size', () => {
    const { graph, badgeInstance, label } = badgeInCard()
    expect(graph.getNode(badgeInstance.id)?.strokeGeometry).toHaveLength(1)

    // Changing the label inside the Card instance grows the hugging Badge it sits in.
    graph.updateNode(label.id, { width: 250 })
    computeAllLayouts(graph)

    const grown = graph.getNode(badgeInstance.id)
    if (!grown) throw new Error('The Badge instance is gone')
    expect(grown.width).toBeGreaterThan(250)
    // The stroke draws through the live outline at its weight; the component's old box must not
    // reach the canvas, SVG export or the saved `.fig`.
    expect(grown.strokeGeometry).toEqual([])
    const fillBounds = geometryBlobBounds(grown.fillGeometry)
    expect(fillBounds?.width).toBeCloseTo(grown.width, 1)
    expect(fillBounds?.height).toBeCloseTo(grown.height, 1)
  })
})

describe('a plain resize of a layer that carries saved outlines', () => {
  test("clears the stroke outline and scales the fill outline with the new box", () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Panel',
      width: 100,
      height: 50,
      ...savedOutlines(100, 50)
    })
    const proxy = new FigmaAPI(graph).getNodeById(frame.id)
    if (!proxy) throw new Error('The frame proxy was not found')

    proxy.resize(240, 80)

    const resized = graph.getNode(frame.id)
    if (!resized) throw new Error('The frame is gone')
    expect(resized.width).toBe(240)
    expect(resized.strokeGeometry).toEqual([])
    const fillBounds = geometryBlobBounds(resized.fillGeometry)
    expect(fillBounds?.width).toBeCloseTo(240, 1)
    expect(fillBounds?.height).toBeCloseTo(80, 1)
  })
})

const ck = await initCanvasKit()
const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1)))
afterAll(() => renderer.destroy())

/** A Badge instance with a 4 px INSIDE stroke and a saved outline band of its old 42 px box. */
function badgeRowScene(graph: SceneGraph, hostId: string): void {
  const page = graph.getPages()[0]
  const badge = graph.createNode('COMPONENT', page.id, {
    name: 'Badge',
    width: 42,
    height: 24,
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 2,
    paddingBottom: 2,
    strokes: [
      {
        type: 'SOLID',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        weight: 4,
        align: 'INSIDE'
      }
    ],
    strokeWeight: 4,
    strokeAlign: 'INSIDE'
  })
  const content = graph.createNode('RECTANGLE', badge.id, {
    name: 'Content',
    width: 26,
    height: 20,
    fills: []
  })
  const instance = graph.createInstance(badge.id, hostId, { x: 0, y: 0 })
  if (!instance) throw new Error('The Badge instance was not created')
  graph.updateNode(instance.id, {
    fillGeometry: [
      { windingRule: 'NONZERO', commandsBlob: contoursBlob([box(instance.width, instance.height)]) }
    ],
    strokeGeometry: [
      {
        windingRule: 'EVENODD',
        commandsBlob: contoursBlob([
          box(instance.width, instance.height),
          box(instance.width - 8, instance.height - 8, 4)
        ])
      }
    ]
  })
  graph.updateNode(content.id, { width: 200 })
  syncInstances(graph, badge.id)
  computeAllLayouts(graph)
}

test('the grown instance draws its border at its new width, not the saved one', () => {
  // 4 px INSIDE stroke: dark at 214 of the grown 216 px box, clear where the old 42 px one was.
  const row = renderRow(ck, renderer, badgeRowScene, 12, 0, 230, 3)
  expect(row[20]).toBe(0)
  expect(row[107]).toBeGreaterThan(200)
})
