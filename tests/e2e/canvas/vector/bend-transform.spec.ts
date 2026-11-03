import type { Vector } from '@open-pencil/scene-graph/primitives'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

/**
 * Opens an open path (100,100) → (200,100) → (200,200) → (100,200) for editing, so at zoom 1 its
 * points sit at those canvas pixels.
 */
async function editOpenPath() {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const line = (start: number, end: number) => ({
      start,
      end,
      tangentStart: { x: 0, y: 0 },
      tangentEnd: { x: 0, y: 0 }
    })
    const vector = store.graph.createNode('VECTOR', store.state.currentPageId, {
      name: 'Path',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      vectorNetwork: {
        vertices: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 100 },
          { x: 0, y: 100 }
        ],
        segments: [line(0, 1), line(1, 2), line(2, 3)],
        regions: []
      }
    })
    store.enterNodeEditMode(vector.id)
  })
  await editor.canvas.waitForRender()
  const box = await editor.canvas.canvas.boundingBox()
  if (!box) throw new Error('Canvas bounds unavailable')
  return { at: (x: number, y: number) => ({ x: box.x + x, y: box.y + y }) }
}

function editState() {
  return editor.page.evaluate(() => {
    const es = window.openPencil?.getStore?.().getNodeEditState()
    if (!es) return null
    return {
      vertices: es.vertices.map(({ x, y }) => ({ x, y })),
      segments: es.segments.map(({ tangentStart, tangentEnd }) => ({ tangentStart, tangentEnd })),
      selected: [...es.selectedVertexIndices].sort((a, b) => a - b),
      selectedSegments: [...es.selectedSegmentIndices]
    }
  })
}

async function drag(from: Vector, to: Vector, modifiers: string[] = []) {
  await editor.page.mouse.move(from.x, from.y)
  for (const key of modifiers) await editor.page.keyboard.down(key)
  await editor.page.mouse.down()
  await editor.page.mouse.move(to.x, to.y, { steps: 8 })
  await editor.page.mouse.up()
  for (const key of modifiers.toReversed()) await editor.page.keyboard.up(key)
}

async function selectPoints(points: Vector[]) {
  for (const [index, point] of points.entries()) {
    if (index > 0) await editor.page.keyboard.down('Shift')
    await editor.page.mouse.click(point.x, point.y)
    if (index > 0) await editor.page.keyboard.up('Shift')
  }
}

test('⌘/Ctrl dragging a segment bends it through the pointer, and undoes in one step', async () => {
  const { at } = await editOpenPath()
  await drag(at(150, 100), at(150, 130), ['ControlOrMeta'])

  const bent = await editState()
  expect(bent?.selectedSegments).toEqual([0])
  // Bowed from its middle, the straight segment becomes an even arc 30 px deep.
  expect(bent?.segments[0].tangentStart.x).toBeCloseTo(0, 3)
  expect(bent?.segments[0].tangentStart.y).toBeCloseTo(40, 3)
  expect(bent?.segments[0].tangentEnd.y).toBeCloseTo(40, 3)
  expect(bent?.vertices[0]).toEqual({ x: 100, y: 100 })
  expect(bent?.vertices[1]).toEqual({ x: 200, y: 100 })

  await editor.page.keyboard.press('ControlOrMeta+z')
  expect((await editState())?.segments[0].tangentStart).toEqual({ x: 0, y: 0 })
  editor.canvas.assertNoErrors()
})

test('⌘/Ctrl turns a smooth neighbour with the bend, and with ⌥/Alt leaves it', async () => {
  const { at } = await editOpenPath()
  // A smooth point at (200, 100) bows the first segment up to about (141, 91) halfway along.
  await editor.page.mouse.dblclick(at(200, 100).x, at(200, 100).y)
  const smooth = await editState()
  const neighbour = smooth?.segments[1].tangentStart

  await drag(at(141, 91), at(141, 71), ['ControlOrMeta', 'Alt'])
  const kept = await editState()
  expect(kept?.segments[1].tangentStart).toEqual(neighbour)
  expect(kept?.segments[0].tangentEnd).not.toEqual(smooth?.segments[0].tangentEnd)

  await editor.page.keyboard.press('ControlOrMeta+z')
  await drag(at(141, 91), at(141, 71), ['ControlOrMeta'])
  const turned = await editState()
  expect(turned?.segments[1].tangentStart).not.toEqual(neighbour)
  editor.canvas.assertNoErrors()
})

test('two selected points get a transform box that turns them about its centre', async () => {
  const { at } = await editOpenPath()
  await selectPoints([at(200, 100), at(100, 200)])
  expect((await editState())?.selected).toEqual([1, 3])
  await editor.canvas.waitForRender()
  expect(await editor.canvas.screenshotCanvasRegion()).toMatchSnapshot('vector-transform-box.png')

  // Just outside the bottom-left corner turns; Shift snaps the quarter turn exactly.
  await drag(at(92, 210), at(90, 92), ['Shift'])
  const turned = await editState()
  expect(turned?.vertices[1].x).toBeCloseTo(200, 3)
  expect(turned?.vertices[1].y).toBeCloseTo(200, 3)
  expect(turned?.vertices[3].x).toBeCloseTo(100, 3)
  expect(turned?.vertices[3].y).toBeCloseTo(100, 3)
  // The points that were not selected stay.
  expect(turned?.vertices[0]).toEqual({ x: 100, y: 100 })
  expect(turned?.selected).toEqual([1, 3])
  editor.canvas.assertNoErrors()
})

test('dragging an edge of the transform box scales the selected points from the other side', async () => {
  const { at } = await editOpenPath()
  await selectPoints([at(200, 100), at(100, 200)])

  await drag(at(97, 150), at(47, 150))
  const scaled = await editState()
  expect(scaled?.vertices[3].x).toBeCloseTo(50, 3)
  expect(scaled?.vertices[3].y).toBeCloseTo(200, 3)
  expect(scaled?.vertices[1]).toEqual({ x: 200, y: 100 })
  expect(scaled?.vertices[0]).toEqual({ x: 100, y: 100 })

  await editor.page.keyboard.press('ControlOrMeta+z')
  expect((await editState())?.vertices[3]).toEqual({ x: 100, y: 200 })
  editor.canvas.assertNoErrors()
})
