import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

/** Dispatches the paste a browser fires for Cmd/Ctrl+V with this clipboard content. */
function paste(html: string, text = '') {
  return editor.page.evaluate(
    ({ html, text }) => {
      const data = new DataTransfer()
      data.setData('text/html', html)
      if (text) data.setData('text/plain', text)
      window.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
      )
    },
    { html, text }
  )
}

function topLevelLayers() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.getChildren(store.state.currentPageId).map((node) => ({
      name: node.name,
      type: node.type,
      fills: node.fills.map((fill) => fill.type)
    }))
  })
}

// WebKit never gives an offscreen iframe an animation frame, so styling pasted HTML inside one
// has to wait for the page's own frame instead.
test('pastes HTML from a web page as a styled frame', async () => {
  await paste(
    '<meta charset="utf-8"><div style="display: flex; gap: 8px; padding: 12px; width: 200px; background-color: rgb(16, 185, 129)"><span style="color: white">Sale</span><b>-20%</b></div>',
    'Sale -20%'
  )

  await expect
    .poll(topLevelLayers, { timeout: 5000 })
    .toEqual([{ name: 'div', type: 'FRAME', fills: ['SOLID'] }])
  editor.canvas.assertNoErrors()
})
