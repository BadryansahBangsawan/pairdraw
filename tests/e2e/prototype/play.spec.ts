import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// Play fits one frame to the canvas and runs the reaction under a click: the clicked layer's
// nearest `ON_CLICK` reaction navigates to its target frame, and Escape returns to editing.

const editor = useEditorSetupWithClear('/?test')

/** The view the canvas holds, and where the frame's button sits on it. */
async function view(id: string) {
  return editor.page.evaluate((nodeId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
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
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
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
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
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

test('play opens an overlay and closes it back to the frame behind', async () => {
  const ids = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const home = store.createShape('FRAME', 0, 0, 400, 300)
    const modal = store.createShape('FRAME', 600, 0, 200, 150)
    const open = store.createShape('RECTANGLE', 50, 50, 120, 60)
    const close = store.createShape('RECTANGLE', 620, 20, 80, 40)
    store.reparentNodes([open], home)
    store.reparentNodes([close], modal)
    store.graph.updateNode(open, {
      prototypeReactions: [
        {
          id: 'open-reaction',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [
            {
              type: 'NODE',
              nodeId: modal,
              navigation: 'OVERLAY',
              transition: { type: 'INSTANT', duration: 0 },
              overlayPosition: 'CENTER'
            }
          ]
        }
      ]
    })
    store.graph.updateNode(close, {
      prototypeReactions: [
        {
          id: 'close-reaction',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [{ type: 'CLOSE' }]
        }
      ]
    })
    store.select([home])
    return { home, modal, open, close }
  })
  await editor.canvas.waitForRender()

  const section = editor.page.getByRole('region', { name: 'Prototype', exact: true })
  await section.getByRole('button', { name: 'Play', exact: true }).click()
  await editor.canvas.waitForRender()
  // Overlays dim the frame behind them while one is open.
  expect(await editor.page.getByTestId('prototype-scrim').count()).toBe(0)

  async function clickCenter(nodeId: string) {
    const point = await editor.page.evaluate((id) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      const bounds = store.graph.getAbsoluteBounds(id)
      const { zoom, panX, panY } = store.state
      return {
        x: (bounds.x + bounds.width / 2) * zoom + panX,
        y: (bounds.y + bounds.height / 2) * zoom + panY
      }
    }, nodeId)
    await editor.canvas.click(point.x, point.y)
    await editor.canvas.waitForRender()
  }

  await clickCenter(ids.open)
  await editor.canvas.waitForRender()
  expect(await editor.page.getByTestId('prototype-scrim').count()).toBe(1)
  const overlay = await view(ids.modal)
  expect(overlay.canvasView).toBe('play')
  expect(overlay.fitsInside).toBe(true)

  const closePoint = await editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const bounds = store.graph.getAbsoluteBounds(id)
    const { zoom, panX, panY } = store.state
    return {
      x: (bounds.x + bounds.width / 2) * zoom + panX,
      y: (bounds.y + bounds.height / 2) * zoom + panY
    }
  }, ids.close)
  await editor.canvas.click(closePoint.x, closePoint.y)
  await editor.canvas.waitForRender()
  expect(await editor.page.getByTestId('prototype-scrim').count()).toBe(0)
  const back = await view(ids.home)
  expect(back.canvasView).toBe('play')
  expect(back.fitsInside).toBe(true)

  await editor.page.keyboard.press('Escape')
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
})

test('a DISSOLVE transition crossfades the frame it leaves instead of cutting', async () => {
  const ids = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
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
              transition: { type: 'DISSOLVE', duration: 0.3 },
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

  const point = await editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const bounds = store.graph.getAbsoluteBounds(id)
    const { zoom, panX, panY } = store.state
    return {
      x: (bounds.x + bounds.width / 2) * zoom + panX,
      y: (bounds.y + bounds.height / 2) * zoom + panY
    }
  }, ids.button)
  await editor.canvas.click(point.x, point.y)

  // The frame being left is drawn over the canvas while the crossfade runs.
  const dissolve = editor.page.getByTestId('prototype-dissolve')
  await expect(dissolve).toHaveCount(1)
  // The snapshot decodes asynchronously, so the pixels appear a frame after the element does.
  await expect
    .poll(() =>
      dissolve.evaluate((image: HTMLImageElement) => ({
        loaded: image.complete && image.naturalWidth > 0,
        width: image.getBoundingClientRect().width
      }))
    )
    .toMatchObject({ loaded: true })
  expect(await dissolve.evaluate((image) => image.getBoundingClientRect().width)).toBeGreaterThan(0)

  // It leaves once the transition is over and the target frame owns the stage.
  await expect(dissolve).toHaveCount(0, { timeout: 3000 })
  expect(await view(ids.details)).toMatchObject({ canvasView: 'play', fitsInside: true })
  editor.canvas.assertNoErrors()
})
