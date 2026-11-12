import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// Play fits one frame to the canvas and runs the reaction under a click: the clicked layer's
// nearest `ON_CLICK` reaction navigates to its target frame, and Escape returns to editing.

const editor = useEditorSetupWithClear('/?test')

/** The view the canvas holds, and where the frame's button sits on it. */
async function view(id: string) {
  return editor.page.evaluate((nodeId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const node = store.graph.getNode(nodeId)
    if (!node) throw new Error(`No node ${nodeId}`)
    const { zoom, panX, panY, canvasView } = store.state
    const size = store.getViewportSize()
    return {
      canvasView: canvasView.id,
      zoom,
      panX,
      panY,
      size,
      fitsInside: node.width * zoom <= size.width + 2 && node.height * zoom <= size.height + 2
    }
  }, id)
}

test('play follows a click reaction between frames and returns on Escape', async () => {
  const ids = await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const home = store.createShape('FRAME', 0, 0, 400, 300)
    const details = store.createShape('FRAME', 600, 0, 200, 400)
    const button = store.createShape('RECTANGLE', 50, 50, 120, 60)
    store.reparentNodes([button], home)
    store.graph.updateNode(button, {
      prototypeReactions: [
        {
          id: 'reaction-1',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: details,
              navigation: 'NAVIGATE',
              transition: { type: 'INSTANT', duration: 0 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    store.select([home])
    return { home, details, button }
  })
  await editor.canvas.waitForRender()

  const section = editor.page.getByRole('region', { name: 'Prototype', exact: true })
  await section.getByRole('button', { name: 'Play', exact: true }).click()
  await editor.canvas.waitForRender()

  const playing = await view(ids.home)
  expect(playing.canvasView).toBe('play')
  expect(playing.fitsInside).toBe(true)
  // The frame is fitted: bars black out the canvas outside it. It fits edge to edge on its
  // tighter axis, so that axis has no bar; the other one has two.
  expect(await editor.page.getByTestId('prototype-letterbox').count()).toBeGreaterThan(0)

  const point = await editor.page.evaluate((nodeId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const node = store.graph.getNode(nodeId)
    if (!node) throw new Error(`No node ${nodeId}`)
    const bounds = store.graph.getAbsoluteBounds(nodeId)
    const { zoom, panX, panY } = store.state
    return {
      x: (bounds.x + bounds.width / 2) * zoom + panX,
      y: (bounds.y + bounds.height / 2) * zoom + panY
    }
  }, ids.button)
  await editor.canvas.click(point.x, point.y)
  await editor.canvas.waitForRender()

  const moved = await view(ids.details)
  expect(moved.canvasView).toBe('play')
  expect(moved.fitsInside).toBe(true)
  // The view refitted to the target: a different frame, so a different pan and zoom.
  expect([moved.panX, moved.panY, moved.zoom]).not.toEqual([
    playing.panX,
    playing.panY,
    playing.zoom
  ])

  await editor.page.keyboard.press('Escape')
  await editor.canvas.waitForRender()
  expect(await view(ids.details)).toMatchObject({ canvasView: 'edit' })
  editor.canvas.assertNoErrors()
})
