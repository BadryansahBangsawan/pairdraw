import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// Figma draws a selected layer's prototype reactions as a dashed line from the layer's edge to the
// frame each reaction shows, with an arrowhead at the target.

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('a selected frame draws its reactions to the frames they show', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const graph = store.graph
    const pageId = store.state.currentPageId
    const fill = [
      { type: 'SOLID' as const, color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }
    ]
    const show = (nodeId: string | null, navigation: 'NAVIGATE' | 'OVERLAY' = 'NAVIGATE') => ({
      type: 'NODE' as const,
      nodeId,
      navigation,
      transition: { type: 'INSTANT' as const, duration: 0 },
      overlayPosition: 'CENTER' as const
    })
    const home = graph.createNode('FRAME', pageId, {
      name: 'Home',
      x: 80,
      y: 80,
      width: 200,
      height: 120,
      fills: fill
    })
    const details = graph.createNode('FRAME', pageId, {
      name: 'Details',
      x: 80,
      y: 300,
      width: 200,
      height: 120,
      fills: fill
    })
    const sheet = graph.createNode('FRAME', pageId, {
      name: 'Sheet',
      x: 460,
      y: 190,
      width: 160,
      height: 120,
      fills: fill
    })
    graph.updateNode(home.id, {
      prototypeReactions: [
        {
          id: 'reaction-1',
          trigger: { type: 'ON_CLICK' as const, delay: 0 },
          actions: [show(details.id)]
        },
        {
          id: 'reaction-2',
          trigger: { type: 'AFTER_TIMEOUT' as const, delay: 1 },
          actions: [show(sheet.id, 'OVERLAY')]
        },
        {
          id: 'reaction-3',
          trigger: { type: 'ON_CLICK' as const, delay: 0 },
          actions: [{ type: 'BACK' as const }]
        }
      ]
    })
    store.state.zoom = 1
    store.state.panX = 40
    store.state.panY = 40
    store.select([home.id])
    store.requestRender()
  })
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  expect(await editor.canvas.screenshotCanvasRegion(760, 500)).toMatchSnapshot(
    'prototype-connections.png'
  )
})
