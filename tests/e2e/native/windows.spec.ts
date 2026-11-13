import { strict as assert } from 'node:assert'

import { invokeNative } from '#tests/helpers/tauri/invoke'

describe('native multi-window', () => {
  it('builds a real second editor window and gives it the next label', async function () {
    this.timeout(180_000)
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'OpenPencil editor did not initialize' }
    )

    const original = await browser.getWindowHandle()
    const label = await invokeNative<string>('open_window')
    assert.equal(label, 'editor-2')

    // A real WebView, not just the label: the driver sees a second window, and the editor
    // boots in it with its own JavaScript realm.
    let created: string | undefined
    await browser.waitUntil(
      async () => {
        const handles = await browser.getWindowHandles()
        created = handles.find((handle) => handle !== original)
        return created !== undefined
      },
      { timeout: 30_000, timeoutMsg: 'the second window did not appear' }
    )
    assert.ok(created)
    try {
      await browser.switchToWindow(created)
      await browser.waitUntil(
        async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
        { timeout: 30_000, timeoutMsg: 'the second editor window did not boot' }
      )
    } finally {
      await browser.switchToWindow(original)
    }

    // The first window still runs; the next window takes the next free label.
    const second = await invokeNative<string>('open_window')
    assert.equal(second, 'editor-3')
  })
})
