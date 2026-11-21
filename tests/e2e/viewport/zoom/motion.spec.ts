import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

// Test runs keep viewport changes instant; this one asks for the glide.
const editor = useEditorSetup('/?test&no-rulers&viewport-motion')

async function zoom() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.state.zoom
  })
}

test('zoom to 100% glides there instead of jumping', async () => {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
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
  // The app reads reduced motion from the media query's change event, which can come frames after
  // the emulation. Change events reach media query lists oldest first, so once a list made now
  // hears it, the app's own list, made at boot, has too.
  const changed = await editor.page.evaluateHandle(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)')
    const heard = new Promise<boolean>((resolve) => {
      query.addEventListener('change', () => resolve(true), { once: true })
    })
    return { heard }
  })
  try {
    await editor.page.emulateMedia({ reducedMotion: 'reduce' })
    await changed.evaluate((wait) => wait.heard)
  } finally {
    await changed.dispose()
  }
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.state.zoom = 4
    store.requestRepaint()
  })
  await editor.page.keyboard.press('Shift+Digit0')
  expect(await zoom()).toBe(1)
  await editor.page.emulateMedia({ reducedMotion: null })
})
