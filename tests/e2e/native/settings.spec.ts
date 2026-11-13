import { strict as assert } from 'node:assert'

import { invokeNative } from '#tests/helpers/tauri/invoke'

function settingsOpen(): Promise<boolean> {
  return browser.execute(() =>
    Boolean(document.querySelector('[data-test-id="app-settings-dialog"]'))
  )
}

describe('native preferences', () => {
  it('opens Settings with the platform shortcut while an input is focused', async () => {
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'OpenPencil editor did not initialize' }
    )
    await browser.execute(() => {
      const input = document.createElement('input')
      input.setAttribute('data-test-id', 'native-settings-shortcut-input')
      document.body.append(input)
    })
    const input = await $('[data-test-id="native-settings-shortcut-input"]')
    await input.click()
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    await browser.waitUntil(settingsOpen, {
      timeout: 10_000,
      timeoutMsg: 'Native settings shortcut did not open Settings'
    })

    assert.equal(await settingsOpen(), true)
  })

  it('keeps native snapping checkmarks synchronized with preferences', async () => {
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000, timeoutMsg: 'OpenPencil editor did not initialize' }
    )
    const initial = await invokeNative<boolean>('native_menu_checked', { id: 'snap-objects' })
    assert.equal(initial, true)

    // Spec files share one app process: the first test leaves Settings open, and pressing the
    // shortcut again makes the next click a modified click that does not switch the section.
    if (!(await settingsOpen())) {
      await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    }
    await browser.waitUntil(settingsOpen, {
      timeout: 10_000,
      timeoutMsg: 'Settings did not open for the snapping checkmark test'
    })

    // One round trip drives the rest: here the embedded driver spends five seconds on each
    // command's window-focus hook, and a WebDriver click plus a polled display check would
    // outlast this test's own limit. The page still does the work; nothing sets the state.
    const outcome = (await browser.executeAsync((done) => {
      const press = (element: Element | null) => {
        for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          const init = { bubbles: true, button: 0 }
          element?.dispatchEvent(
            type.startsWith('pointer')
              ? new PointerEvent(type, { ...init, pointerType: 'mouse' })
              : new MouseEvent(type, init)
          )
        }
      }
      const until = (find: () => HTMLElement | null, then: (found: HTMLElement) => void) => {
        const started = Date.now()
        const tick = () => {
          const found = find()
          if (found) {
            then(found)
            return
          }
          if (Date.now() - started > 10_000) {
            done({ error: 'snapping control did not show' })
            return
          }
          requestAnimationFrame(tick)
        }
        tick()
      }
      if (!document.querySelector('[data-test-id="app-settings-dialog"]')) {
        done({ error: 'Settings is not open' })
        return
      }
      // Snapping lives under Editor, not the General page the dialog opens on.
      press(document.querySelector('[data-test-id="settings-section-editor"]'))
      until(
        () => document.querySelector('[data-test-id="settings-snap-objects"]'),
        (snap) => {
          press(snap)
          const started = Date.now()
          const poll = () => {
            const core = window.__TAURI__?.core
            if (!core) {
              done({ error: 'native test requires app.withGlobalTauri' })
              return
            }
            void core
              .invoke<boolean>('native_menu_checked', { id: 'snap-objects' })
              .then((checked) => {
                if (checked === false) {
                  done({ synced: true })
                  return
                }
                if (Date.now() - started > 5_000) {
                  done({ synced: false })
                  return
                }
                setTimeout(poll, 100)
              })
              .catch((error: unknown) => {
                done({ error: String(error) })
              })
          }
          poll()
        }
      )
    })) as { synced?: boolean; error?: string }

    assert.equal(outcome.error, undefined)
    assert.equal(outcome.synced, true)
    const updated = await invokeNative<boolean>('native_menu_checked', { id: 'snap-objects' })
    assert.equal(updated, false)
  })
})
