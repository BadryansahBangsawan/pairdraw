import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

test('a guide dragged from the ruler lands on a whole pixel', async () => {
  const pointer = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.state.showRulers = true
    store.state.zoom = 1.3
    store.state.panX = 12.35
    store.state.panY = 12.35
    const area = document.querySelector('[data-test-id="canvas-area"]')?.getBoundingClientRect()
    if (!area) throw new Error('Canvas area is missing')
    return {
      area: { x: area.left, y: area.top },
      screenY: 300,
      worldY: (300 - store.state.panY) / store.state.zoom
    }
  })
  expect(Number.isInteger(pointer.worldY)).toBe(false)

  await editor.page.mouse.move(pointer.area.x + 400, pointer.area.y + 8)
  await editor.page.mouse.down()
  await editor.page.mouse.move(pointer.area.x + 400, pointer.area.y + pointer.screenY, { steps: 4 })
  await editor.page.mouse.up()

  const guide = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const page = store.graph.getNode(store.state.currentPageId)
    return page?.type === 'CANVAS' ? page.guides.map((entry) => entry.position) : []
  })
  expect(guide).toHaveLength(1)
  expect(guide[0]).toBe(Math.round(pointer.worldY))
})
