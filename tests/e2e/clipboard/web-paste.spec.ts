import { encodeWebCaptureClipboard, type WebCapture } from '@open-pencil/web-capture'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test')

const CAPTURE: WebCapture = {
  format: 'openpencil/web-capture',
  version: 1,
  scope: 'element',
  source: { url: 'https://example.com/pricing/', title: 'Pricing' },
  capturedAt: '2026-11-03T10:00:00.000Z',
  viewport: { width: 1280, height: 800, devicePixelRatio: 1 },
  root: {
    type: 'element',
    tagName: 'section',
    attrs: { class: 'plan' },
    computedStyle: {
      display: 'flex',
      'flex-direction': 'column',
      'background-color': 'rgb(255, 91, 46)',
      'border-top-left-radius': '12px',
      'border-top-right-radius': '12px',
      'border-bottom-left-radius': '12px',
      'border-bottom-right-radius': '12px'
    },
    box: { x: 0, y: 0, width: 240, height: 120 },
    children: [
      {
        type: 'element',
        tagName: 'h2',
        attrs: {},
        computedStyle: { display: 'block', 'font-size': '24px', color: 'rgb(255, 255, 255)' },
        children: [{ type: 'text', text: 'Pro plan' }]
      }
    ]
  },
  fonts: [],
  truncated: false
}

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
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.graph.getChildren(store.state.currentPageId).map((node) => ({
      name: node.name,
      type: node.type,
      width: node.width,
      height: node.height,
      fills: node.fills.map((fill) => fill.type)
    }))
  })
}

test('pastes a web capture as one styled frame named after the page', async () => {
  const { html, text } = encodeWebCaptureClipboard(CAPTURE)
  await paste(html, text)

  await expect
    .poll(topLevelLayers)
    .toEqual([{ name: 'Pricing', type: 'FRAME', width: 240, height: 120, fills: ['SOLID'] }])
  await editor.canvas.waitForRender()

  await editor.canvas.undo()
  await expect.poll(topLevelLayers).toEqual([])
})

test('pastes HTML copied from a web page as styled layers', async () => {
  await paste(
    '<meta charset="utf-8"><div style="display: flex; gap: 8px; padding: 12px; width: 200px; background-color: rgb(16, 185, 129)"><span style="color: white">Sale</span><b>-20%</b></div>',
    'Sale -20%'
  )

  await expect.poll(async () => (await topLevelLayers()).length).toBe(1)
  const [layer] = await topLevelLayers()
  expect(layer).toMatchObject({ type: 'FRAME', fills: ['SOLID'] })
})

test('pasted web HTML runs none of its scripts or handlers', async () => {
  await paste(
    '<p>Hello</p><img src="data:," onerror="window.__pairdrawPasteRan = true"><script>window.__pairdrawPasteRan = true</script>'
  )

  await expect.poll(async () => (await topLevelLayers()).length).toBeGreaterThan(0)
  const ran = await editor.page.evaluate(() => Reflect.get(window, '__pairdrawPasteRan'))
  expect(ran).toBeUndefined()
})

test('pasted web HTML runs no handler that parsing its sanitized form again would grow', async () => {
  const handler = 'window.__pairdrawPasteRan = true'
  await paste(
    [
      '<p>Hello</p>',
      `<math><mtext><table><mglyph><style><img src="data:,x" onerror="${handler}">`,
      `<svg></p><style><a id="</style><img src=1 onerror="${handler}">">`
    ].join('')
  )

  await expect.poll(async () => (await topLevelLayers()).length).toBeGreaterThan(0)
  // The styling frame outlives one animation frame; give a handler time to fire if it could.
  await editor.page.waitForTimeout(300)
  const ran = await editor.page.evaluate(() => Reflect.get(window, '__pairdrawPasteRan'))
  expect(ran).toBeUndefined()
})
