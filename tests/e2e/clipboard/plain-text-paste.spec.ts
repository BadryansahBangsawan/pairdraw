import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

/** Dispatches the paste a browser fires for Cmd/Ctrl+V with this clipboard content. */
function paste(text: string) {
  return editor.page.evaluate((text) => {
    const data = new DataTransfer()
    data.setData('text/plain', text)
    window.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
    )
  }, text)
}

function topLevelLayers() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.getChildren(store.state.currentPageId).map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      textAutoResize: node.type === 'TEXT' ? node.textAutoResize : null,
      text: node.type === 'TEXT' ? node.text : null
    }))
  })
}

test('pastes text copied in another app as a text layer', async () => {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.createShape('RECTANGLE', 40, 40, 120, 80, store.state.currentPageId)
    store.requestRender()
  })
  await editor.canvas.waitForRender()

  await paste('Hello from Notes\nsecond line')

  await expect.poll(topLevelLayers).toContainEqual(
    expect.objectContaining({
      type: 'TEXT',
      name: 'Hello from Notes',
      text: 'Hello from Notes\nsecond line',
      textAutoResize: 'WIDTH_AND_HEIGHT'
    })
  )
  const text = (await topLevelLayers()).find((layer) => layer.type === 'TEXT')
  // Measured with its real font: the box fits its line instead of the layer's 100x100 default.
  expect(text?.width).toBeGreaterThan(0)
  expect(text?.width).not.toBe(100)
  // Two lines at the layer's 14 px type, not a 100 px square that clips the second one.
  expect(text?.height).toBeGreaterThan(28)
  expect(text?.height).not.toBe(100)
  expect(Number.isInteger(text?.x)).toBe(true)
  expect(Number.isInteger(text?.y)).toBe(true)
  await editor.canvas.waitForRender()

  // One undo step removes the text and leaves the rectangle alone.
  await editor.canvas.undo()
  await expect.poll(topLevelLayers).toEqual([expect.objectContaining({ type: 'RECTANGLE' })])
})

test('pasted text lands inside the selected frame', async () => {
  const frameId = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const frame = store.graph.createNode('FRAME', store.state.currentPageId, {
      name: 'Card',
      x: 200,
      y: 120,
      width: 400,
      height: 300
    })
    store.select([frame.id])
    store.requestRender()
    return frame.id
  })
  await editor.canvas.waitForRender()

  await paste('Inside the frame')

  await expect
    .poll(() =>
      editor.page.evaluate((frameId) => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Pairdraw store not initialized')
        return store.graph.getChildren(frameId).map((node) => [node.type, node.text])
      }, frameId)
    )
    .toEqual([['TEXT', 'Inside the frame']])
})
