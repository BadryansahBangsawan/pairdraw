import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

// Test runs keep viewport changes instant; this one asks for the glide.
const editor = useEditorSetup('/?test&no-rulers&viewport-motion')

async function zoom() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.state.zoom
  })
}

test('zoom to 100% glides there instead of jumping', async () => {
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.state.zoom = 4
    store.requestRepaint()
  })
  await editor.page.keyboard.press('Shift+Digit0')
  const during = await zoom()
  expect(during).toBeGreaterThan(1)
  await expect.poll(zoom).toBe(1)
  editor.canvas.assertNoErrors()
})

test('with reduced motion the view jumps', async () => {
  await editor.page.emulateMedia({ reducedMotion: 'reduce' })
  // The media query's change event reaches the app with the next frame.
  await editor.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)))
  await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.state.zoom = 4
    store.requestRepaint()
  })
  await editor.page.keyboard.press('Shift+Digit0')
  expect(await zoom()).toBe(1)
  await editor.page.emulateMedia({ reducedMotion: null })
})
