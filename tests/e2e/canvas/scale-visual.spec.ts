import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

const BLACK = { r: 0, g: 0, b: 0, a: 1 }

/**
 * A card with a dashed stroke, corner radii, a drop shadow, a blur, and text, scaled by the Scale
 * tool's action next to an unscaled copy, so strokes, effects, and type are seen to scale with it.
 */
test('the Scale tool scales strokes, radii, effects, and text with the layer', async () => {
  await editor.page.evaluate((black) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.state.panX = 0
    store.state.panY = 0
    store.state.zoom = 1
    const pageId = store.state.currentPageId
    const card = (x: number) => {
      const frame = store.graph.createNode('FRAME', pageId, {
        x,
        y: 40,
        width: 160,
        height: 100,
        cornerRadius: 12,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
        // The renderer dashes a stroke by the pattern the stroke carries.
        strokes: [
          {
            type: 'SOLID',
            color: black,
            weight: 2,
            opacity: 1,
            visible: true,
            align: 'CENTER',
            dashPattern: [6, 3]
          }
        ],
        effects: [
          {
            type: 'DROP_SHADOW',
            color: { r: 0, g: 0, b: 0, a: 0.35 },
            offset: { x: 0, y: 6 },
            radius: 10,
            spread: 0,
            visible: true
          }
        ]
      })
      store.graph.createNode('TEXT', frame.id, {
        x: 16,
        y: 16,
        width: 128,
        height: 20,
        text: 'Scaled',
        fontSize: 16,
        fills: [{ type: 'SOLID', color: black, opacity: 1, visible: true }]
      })
      return frame.id
    }
    card(40)
    const scaled = card(260)
    store.scaleNodes([scaled], 2, 'top-left')
    store.requestRender()
  }, BLACK)
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  expect(await editor.canvas.screenshotCanvasRegion()).toMatchSnapshot('scale-tool.png')
})
