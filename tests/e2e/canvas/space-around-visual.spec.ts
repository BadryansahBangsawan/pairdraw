import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// Space around beside space between and start, in a row and a column with a gap: each child gets
// an equal share of the free space, half on each side, on top of the gap.

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('space around spreads children with half a share at each end', async () => {
  const positions = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageId = store.state.currentPageId
    const fill = (r: number, g: number, b: number) => [
      { type: 'SOLID' as const, color: { r, g, b, a: 1 }, visible: true, opacity: 1 }
    ]
    const rows = [
      { align: 'MIN', mode: 'HORIZONTAL', x: 40, y: 40, width: 420, height: 60 },
      { align: 'SPACE_BETWEEN', mode: 'HORIZONTAL', x: 40, y: 130, width: 420, height: 60 },
      { align: 'SPACE_AROUND', mode: 'HORIZONTAL', x: 40, y: 220, width: 420, height: 60 },
      { align: 'SPACE_AROUND', mode: 'VERTICAL', x: 500, y: 40, width: 80, height: 240 }
    ] as const
    const frames = rows.map((row) => {
      const frame = store.graph.createNode('FRAME', pageId, {
        name: `${row.mode} ${row.align}`,
        x: row.x,
        y: row.y,
        width: row.width,
        height: row.height,
        fills: fill(0.95, 0.95, 0.97),
        layoutMode: row.mode,
        primaryAxisSizing: 'FIXED',
        counterAxisSizing: 'FIXED',
        counterAxisAlign: 'CENTER',
        itemSpacing: 10
      })
      for (const color of [fill(0.96, 0.36, 0.18), fill(0.2, 0.4, 1), fill(0.1, 0.7, 0.45)]) {
        store.graph.createNode('RECTANGLE', frame.id, { width: 40, height: 40, fills: color })
      }
      // The editor lays the frame out when its alignment is set.
      store.updateNode(frame.id, { primaryAxisAlign: row.align })
      return frame.id
    })
    store.clearSelection()
    store.requestRender()
    const around = frames[2]
    return store.graph.getChildren(around).map((child) => child.x)
  })
  // 420 − 3 × 40 − 2 × 10 leaves 280: 46⅔ on each side of each child, 93⅓ plus the gap between.
  expect(positions.map(Math.round)).toEqual([47, 190, 333])
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  const buffer = await editor.canvas.screenshotCanvasRegion(640, 320)
  expect(buffer).toMatchSnapshot('space-around-distribution.png')
})
