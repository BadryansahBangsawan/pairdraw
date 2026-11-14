import { strict as assert } from 'node:assert'

import { invokeNative } from '#tests/helpers/tauri/invoke'

/** One menu of the menu bar: its items' ids, and whether the OS draws each, as it does About. */
type NativeMenu = { id: string; predefined: boolean }[]

function menuBar(): Promise<NativeMenu[]> {
  return invokeNative<NativeMenu[]>('native_test_menu_outline')
}

async function waitForEditor() {
  await browser.waitUntil(
    async () => browser.execute(() => Boolean(window.pairdraw?.getStore?.())),
    { timeout: 30_000, timeoutMsg: 'Pairdraw editor did not initialize' }
  )
}

const hasUpdates = (menu: NativeMenu) => menu.some((item) => item.id === 'check-updates')

describe('About and Check for Updates', () => {
  it('end the menu bar in Help on Windows and Linux', async function () {
    if (process.platform === 'darwin') this.skip()
    await waitForEditor()

    const menus = await menuBar()
    const help = menus.at(-1)
    assert.ok(help && hasUpdates(help), 'the last menu has no Check for Updates…')
    // About is the system's own About item, drawn with the app's name, version and icon.
    assert.ok(
      help.some((item) => item.predefined),
      'the last menu has no About item'
    )
    assert.equal(menus.filter(hasUpdates).length, 1)
  })

  it('stay in the application menu on macOS', async function () {
    if (process.platform !== 'darwin') this.skip()
    await waitForEditor()

    const menus = await menuBar()
    assert.deepEqual(
      menus.map(hasUpdates),
      menus.map((_, index) => index === 0)
    )
  })
})
