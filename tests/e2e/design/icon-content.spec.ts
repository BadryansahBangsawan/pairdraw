import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

/**
 * A page with a slide frame and a top-level icon frame, both named, as inserting an icon leaves
 * it. The icon is made the way the icon tools make one: a frame whose plugin data names a glyph.
 */
async function iconAndSlide() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageId = store.state.currentPageId
    const slideId = store.createShape('FRAME', 0, 0, 400, 300, pageId)
    store.graph.updateNode(slideId, { name: 'Home' })
    const iconId = store.createShape('FRAME', 500, 0, 24, 24, pageId)
    store.graph.updateNode(iconId, {
      name: 'home',
      pluginData: [
        {
          pluginId: 'pairdraw',
          key: 'icon',
          value: JSON.stringify({ name: 'material-symbols:home' })
        }
      ]
    })
    store.requestRender()
    return { pageId, slideId, iconId }
  })
}

/** Copies the drawn rectangle and pastes it with `id` selected, as ⌘C and ⌘V do. */
async function pasteWithSelected(id: string) {
  return editor.page.evaluate(async (selectedId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const rect = [...store.graph.nodes.values()].find(
      (node) => node.name === 'Rectangle 1' && node.type === 'RECTANGLE'
    )
    if (!rect) throw new Error('Rectangle not found')
    store.select([rect.id])
    const { html } = await store.prepareCopy()
    store.select([selectedId])
    if (html) await store.pasteFromHTML(html)
    store.requestRender()
    const selected = [...store.state.selectedIds]
    return selected.map((nodeId) => store.graph.getNode(nodeId)?.parentId ?? null)
  }, id)
}

test('pasting onto an icon puts the layer on the page, not inside the icon', async () => {
  await editor.canvas.clearCanvas()
  const { pageId, iconId } = await iconAndSlide()
  await editor.canvas.drawRect(100, 400, 60, 60)
  await editor.canvas.waitForRender()

  const parents = await pasteWithSelected(iconId)
  await editor.canvas.waitForRender()

  expect(parents).toEqual([pageId])
  const iconChildren = await editor.page.evaluate((id) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.getChildren(id).length
  }, iconId)
  expect(iconChildren).toBe(0)
})

test('an icon frame is not a slide, so it stays off the presentation and its list', async () => {
  await editor.canvas.clearCanvas()
  const { slideId, iconId } = await iconAndSlide()
  await editor.canvas.waitForRender()

  const slides = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.getSlides().map((slide) => slide.id)
  })
  expect(slides).toEqual([slideId])
  expect(slides).not.toContain(iconId)

  await editor.page.getByTestId('left-panel-slides-tab').click()
  const panel = editor.page.getByTestId('slides-panel')
  await expect(panel.getByTestId('slides-item')).toHaveCount(1)
  await expect(panel).not.toContainText('home')
  await expect(panel.getByTestId('slides-empty')).toHaveCount(0)
})
