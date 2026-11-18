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
