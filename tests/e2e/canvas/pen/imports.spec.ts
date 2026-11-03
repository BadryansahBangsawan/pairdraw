import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup('/?test&no-chrome&no-rulers')

test('opens a .pen document whose libraries the browser cannot read with placeholders and a warning', async () => {
  await editor.page.evaluate(() => window.openPencil?.openFile?.('/tests/fixtures/pen-imports.pen'))
  await editor.canvas.waitForInit()

  // The warning names the library as the document writes its path.
  await expect(
    editor.page.locator('[data-slot="toast"]').filter({ hasText: './library/ui.lib.pen' })
  ).toBeVisible()

  expect(
    await editor.page.evaluate(() => {
      const graph = window.openPencil?.getStore?.().graph
      const pen = (id: string, key: string) =>
        graph
          ?.getNode(id)
          ?.pluginData.find((entry) => entry.pluginId === 'pen' && entry.key === `pen/${key}`)
          ?.value
      const label = (id: string) => {
        const [childId] = graph?.getNode(id)?.childIds ?? []
        return childId ? graph?.getNode(childId)?.text : undefined
      }
      return {
        cta: [graph?.getNode('cta')?.type, pen('cta', 'type'), pen('cta', 'ref'), label('cta')],
        chart: [pen('chart', 'type'), pen('chart', 'scriptUri'), label('chart')],
        site: [pen('site', 'type'), pen('site', 'url'), label('site')]
      }
    })
  ).toEqual({
    cta: ['FRAME', '"ref"', '"ui:button"', 'ui:button'],
    chart: ['"script"', '"./scripts/chart.js"', './scripts/chart.js'],
    site: ['"browser"', '"https://example.com"', 'https://example.com']
  })

  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.state.zoom = 1
    store.state.panX = 0
    store.state.panY = 0
    store.clearSelection()
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  // The warning, checked above, sits over the canvas; the snapshot is of the placeholders.
  const hideToasts = await editor.page.addStyleTag({
    content: '[data-slot="toast"] { visibility: hidden !important; }'
  })
  expect(await editor.canvas.screenshotCanvasRegion(800, 300)).toMatchSnapshot(
    'pen-import-placeholders.png'
  )
  await hideToasts.evaluate((element) => element.parentNode?.removeChild(element))
})
