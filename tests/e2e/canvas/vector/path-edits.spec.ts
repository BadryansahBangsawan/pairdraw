import type { Vector } from '@pairdraw/scene-graph/primitives'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

/**
 * Opens an open path (100,100) → (200,100) → (200,200) → (100,200) for editing, so at zoom 1 its
 * points sit at those canvas pixels.
 */
async function editOpenPath() {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
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
    const es = window.pairdraw?.getStore?.().getNodeEditState()
    if (!es) return null
    return {
      vertices: es.vertices.map(({ x, y }) => ({ x, y })),
      segments: es.segments.map(({ start, end, tangentStart, tangentEnd }) => ({
        start,
        end,
        tangentStart,
        tangentEnd
      })),
      regions: es.regions.length,
      selected: [...es.selectedVertexIndices].sort((a, b) => a - b),
      cutTool: es.cutTool
    }
  })
}

async function click(point: Vector, shift = false) {
  if (shift) await editor.page.keyboard.down('Shift')
  await editor.page.mouse.click(point.x, point.y)
  if (shift) await editor.page.keyboard.up('Shift')
}

test('X picks up the cut tool, which cuts a segment where it is clicked', async () => {
  const { at } = await editOpenPath()
  await editor.page.keyboard.press('x')
  expect((await editState())?.cutTool).toBe(true)

  await click(at(200, 140))
  const cut = await editState()
  expect(cut?.vertices).toHaveLength(6)
  expect(cut?.selected).toHaveLength(2)
  for (const index of cut?.selected ?? []) {
    expect(cut?.vertices[index]).toEqual({ x: 200, y: 140 })
  }

  await editor.page.keyboard.press('Escape')
  const after = await editState()
  expect(after?.cutTool).toBe(false)
  // Escape put the cut tool down, so the path is still open for editing.
  expect(after).not.toBeNull()
  editor.canvas.assertNoErrors()
})

test('double-clicking a point makes it smooth, and again a corner', async () => {
  const { at } = await editOpenPath()
  await editor.page.mouse.dblclick(at(200, 100).x, at(200, 100).y)
  const smooth = await editState()
  expect(smooth?.segments[0].tangentEnd).not.toEqual({ x: 0, y: 0 })
  expect(smooth?.segments[1].tangentStart).not.toEqual({ x: 0, y: 0 })

  await editor.page.mouse.dblclick(at(200, 100).x, at(200, 100).y)
  const corner = await editState()
  expect(corner?.segments[0].tangentEnd).toEqual({ x: 0, y: 0 })
  expect(corner?.segments[1].tangentStart).toEqual({ x: 0, y: 0 })
  editor.canvas.assertNoErrors()
})

test('⌘/Ctrl double-clicking a curved segment straightens it', async () => {
  const { at } = await editOpenPath()
  await editor.page.mouse.dblclick(at(200, 100).x, at(200, 100).y)
  await editor.page.keyboard.down('ControlOrMeta')
  // The smooth point bows the segment out to about (209, 159) halfway along.
  await editor.page.mouse.dblclick(at(208, 158).x, at(208, 158).y)
  await editor.page.keyboard.up('ControlOrMeta')
  const straight = await editState()
  expect(straight?.segments[1].tangentStart).toEqual({ x: 0, y: 0 })
  expect(straight?.segments[1].tangentEnd).toEqual({ x: 0, y: 0 })
  expect(straight?.segments[0].tangentEnd).not.toEqual({ x: 0, y: 0 })
  editor.canvas.assertNoErrors()
})

test('⌘/Ctrl+J joins the two selected end points and closes the path', async () => {
  const { at } = await editOpenPath()
  await click(at(100, 100))
  await click(at(100, 200), true)
  expect((await editState())?.selected).toEqual([0, 3])

  await editor.page.keyboard.press('ControlOrMeta+j')
  const joined = await editState()
  expect(joined?.segments).toHaveLength(4)
  expect(joined?.segments[3]).toMatchObject({ start: 0, end: 3 })
  expect(joined?.regions).toBe(1)

  await editor.page.keyboard.press('ControlOrMeta+z')
  expect((await editState())?.segments).toHaveLength(3)
  editor.canvas.assertNoErrors()
})

test('⌥/Alt dragging a point drags a copy joined to it', async () => {
  const { at } = await editOpenPath()
  await editor.page.mouse.move(at(100, 200).x, at(100, 200).y)
  await editor.page.keyboard.down('Alt')
  await editor.page.mouse.down()
  await editor.page.mouse.move(at(60, 240).x, at(60, 240).y, { steps: 6 })
  await editor.page.mouse.up()
  await editor.page.keyboard.up('Alt')

  const copied = await editState()
  expect(copied?.vertices).toHaveLength(5)
  expect(copied?.vertices[3]).toEqual({ x: 100, y: 200 })
  expect(copied?.vertices[4]).toEqual({ x: 60, y: 240 })
  expect(copied?.segments.at(-1)).toMatchObject({ start: 3, end: 4 })
  expect(copied?.selected).toEqual([4])
  editor.canvas.assertNoErrors()
})

test('the arrow keys move the selected points, not the layer', async () => {
  const { at } = await editOpenPath()
  await click(at(200, 100))
  const layerBefore = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store?.getNodeEditState()?.nodeId
    const node = id ? store?.graph.getNode(id) : null
    return node ? { x: node.x, y: node.y } : null
  })

  await editor.page.keyboard.press('ArrowRight')
  await editor.page.keyboard.press('Shift+ArrowDown')
  const moved = await editState()
  expect(moved?.vertices[1]).toEqual({ x: 201, y: 110 })
  expect(moved?.vertices[0]).toEqual({ x: 100, y: 100 })

  const layerAfter = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store?.getNodeEditState()?.nodeId
    const node = id ? store?.graph.getNode(id) : null
    return node ? { x: node.x, y: node.y } : null
  })
  expect(layerAfter).toEqual(layerBefore)
  editor.canvas.assertNoErrors()
})
