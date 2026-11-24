import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

/**
 * Seam: an agent connects two frames with the prototype tools, then the prototype plays.
 * Catches a connection the tool writes but the panel or the play does not read back.
 */
const editor = useEditorSetupWithClear('/?test')

/** Sends a tool call the way the MCP bridge delivers it. */
function runTool(page: typeof editor.page, name: string, args: Record<string, unknown>) {
  return page.evaluate(
    ([tool, payload]) => window.pairdraw?.test?.automation?.('tool', { name: tool, args: payload }),
    [name, args] as const
  )
}

/** The view the canvas holds, and whether the frame fits in it. */
async function view(nodeId: string) {
  return editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const node = store.graph.getNode(id)
    if (!node) throw new Error(`No node ${id}`)
    const { zoom, panX, panY, canvasView } = store.state
    const size = store.getViewportSize()
    return {
      canvasView: canvasView.id,
      zoom,
      panX,
      panY,
      fitsInside: node.width * zoom <= size.width + 2 && node.height * zoom <= size.height + 2
    }
  }, nodeId)
}

test('a prototype the tool connects plays a click between its frames', async () => {
  const ids = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const home = store.createShape('FRAME', 0, 0, 400, 300)
    const details = store.createShape('FRAME', 600, 0, 200, 400)
    const button = store.createShape('RECTANGLE', 50, 50, 120, 60)
    store.reparentNodes([button], home)
    store.select([home])
    return { home, details, button }
  })
  await editor.canvas.waitForRender()

  const reaction = {
    trigger: { type: 'ON_CLICK' },
    actions: [
      {
        type: 'NODE',
        destinationId: ids.details,
        navigation: 'NAVIGATE',
        transition: { type: 'INSTANT', duration: 0 }
      }
    ]
  }
  const written = await runTool(editor.page, 'set_reactions', {
    id: ids.button,
    reactions: [reaction]
  })
  expect(written).toMatchObject({
    ok: true,
    result: { id: ids.button, reactions: [reaction] }
  })

  const read = await runTool(editor.page, 'get_reactions', { id: ids.button })
  expect(read).toMatchObject({
    ok: true,
    result: { reactions: [{ trigger: { type: 'ON_CLICK' } }] }
  })

  // The connection is one undo step, as the panel's edits are.
  await editor.canvas.undo()
  expect(await runTool(editor.page, 'get_reactions', { id: ids.button })).toMatchObject({
    ok: true,
    result: { id: ids.button, reactions: [] }
  })
  await editor.canvas.redo()

  const before = await view(ids.home)
  const section = editor.page.getByRole('region', { name: 'Prototype', exact: true })
  await section.getByRole('button', { name: 'Play', exact: true }).click()
  await editor.canvas.waitForRender()

  const point = await editor.page.evaluate((nodeId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const bounds = store.graph.getAbsoluteBounds(nodeId)
    const { zoom, panX, panY } = store.state
    return {
      x: (bounds.x + bounds.width / 2) * zoom + panX,
      y: (bounds.y + bounds.height / 2) * zoom + panY
    }
  }, ids.button)
  await editor.canvas.click(point.x, point.y)
  await editor.canvas.waitForRender()

  const after = await view(ids.details)
  expect(after.canvasView).toBe('play')
  expect(after.fitsInside).toBe(true)
  expect([after.panX, after.panY, after.zoom]).not.toEqual([before.panX, before.panY, before.zoom])
})

test('a Change to the tool writes by variant properties plays on hover', async () => {
  const ids = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageId = store.graph.getPages()[0].id
    const screen = store.createShape('FRAME', 0, 0, 400, 300)
    const set = store.graph.createNode('COMPONENT_SET', pageId, { name: 'Toggle', x: 600, y: 0 })
    const off = store.graph.createNode('COMPONENT', set.id, {
      name: 'State=Off',
      width: 40,
      height: 20
    })
    store.graph.createNode('RECTANGLE', off.id, {
      width: 40,
      height: 20,
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    const on = store.graph.createNode('COMPONENT', set.id, {
      name: 'State=On',
      x: 100,
      width: 40,
      height: 40
    })
    store.graph.createNode('RECTANGLE', on.id, {
      width: 40,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    const instance = store.graph.createInstance(off.id, screen, { x: 100, y: 100 })
    if (!instance) throw new Error('no instance')
    store.select([screen])
    return { screen, off: off.id, on: on.id, instance: instance.id }
  })
  await editor.canvas.waitForRender()

  const written = await runTool(editor.page, 'set_reactions', {
    id: ids.off,
    reactions: [
      {
        trigger: { type: 'ON_HOVER' },
        actions: [
          {
            type: 'NODE',
            variantProperties: { State: 'On' },
            navigation: 'CHANGE_TO',
            transition: { type: 'INSTANT', duration: 0 }
          }
        ]
      }
    ]
  })
  expect(written).toMatchObject({
    ok: true,
    result: {
      id: ids.off,
      reactions: [
        {
          trigger: { type: 'ON_HOVER' },
          actions: [{ destinationId: ids.on, navigation: 'CHANGE_TO' }]
        }
      ]
    }
  })

  const section = editor.page.getByRole('region', { name: 'Prototype', exact: true })
  await section.getByRole('button', { name: 'Play', exact: true }).click()
  await editor.canvas.waitForRender()
  expect((await view(ids.screen)).canvasView).toBe('play')
  const before = await editor.canvas.screenshotCanvasRegion()

  const point = await editor.page.evaluate((nodeId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const bounds = store.graph.getAbsoluteBounds(nodeId)
    const { zoom, panX, panY } = store.state
    const size = store.getViewportSize()
    return {
      x: (bounds.x + bounds.width / 2) * zoom + panX,
      y: (bounds.y + bounds.height / 2) * zoom + panY,
      awayX: size.width - 5,
      awayY: size.height - 5
    }
  }, ids.instance)
  await editor.canvas.hover(point.awayX, point.awayY)
  await editor.canvas.hover(point.x, point.y)
  await editor.page.waitForTimeout(300)
  await editor.canvas.waitForRender()

  const after = await editor.canvas.screenshotCanvasRegion()
  expect(before.equals(after)).toBe(false)
})
