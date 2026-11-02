import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { strokesInLayoutDriver } from '#tests/helpers/canvas/strokes-in-layout/driver'

// An auto layout that includes strokes clears its own inside stroke and its children's outside
// strokes, as Figma's "Strokes: Included in layout" does; one that leaves them out overlaps them.

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

test('auto layout makes room for strokes only when they are included', async () => {
  await strokesInLayoutDriver(() => editor.page).build()
  await editor.canvas.waitForRender()
  editor.canvas.assertNoErrors()
  const buffer = await editor.canvas.screenshotCanvasRegion(700, 300)
  expect(buffer).toMatchSnapshot('strokes-in-layout.png', { maxDiffPixelRatio: 0, threshold: 0 })
})
