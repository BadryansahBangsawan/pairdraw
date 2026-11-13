import { strict as assert } from 'node:assert'

import { invokeNative } from '#tests/helpers/tauri/invoke'

const reference = { integrationId: 'native-test', profileId: 'isolation', field: 'api-key' }

describe('native test credential isolation', () => {
  it('uses disposable memory credentials and exposes explicit retry without Keychain access', async function () {
    this.timeout(180_000)
    await browser.waitUntil(
      async () => browser.execute(() => Boolean(window.openPencil?.getStore?.())),
      { timeout: 30_000 }
    )
    const previousLaunch = await browser.execute(() => {
      // Probe the WebView itself, not an adapter, to verify profile isolation.
      // oxlint-disable-next-line open-pencil/no-direct-storage-access
      const previous = localStorage.getItem('native-test-launch-marker')
      // oxlint-disable-next-line open-pencil/no-direct-storage-access
      localStorage.setItem('native-test-launch-marker', 'present')
      return previous
    })
    assert.equal(previousLaunch, null)
    assert.equal(await $('[role="alertdialog"]').isExisting(), false)
    await invokeNative('credential_retry_access')
    assert.equal(await invokeNative('credential_status', { reference }), 'missing')
    await invokeNative('credential_write', { reference, value: 'disposable-test-value' })
    assert.equal(await invokeNative('credential_status', { reference }), 'configured')
    await invokeNative('credential_remove', { reference })
    assert.equal(await invokeNative('credential_status', { reference }), 'missing')
  })

  it('hides credential controls when native access is healthy', async () => {
    await browser.keys([process.platform === 'darwin' ? 'Meta' : 'Control', ','])
    // One page round trip, for the same reason as the paused check below: the driver's
    // per-command focus hook makes a polled WebDriver display check outlast the test.
    const view = (await browser.executeAsync((done) => {
      const started = Date.now()
      const tick = () => {
        const panel = document.querySelector<HTMLElement>('[data-test-id="settings-general-panel"]')
        if (panel) {
          done({
            displayed: panel.offsetParent !== null,
            text: panel.innerText,
            retry: [...document.querySelectorAll('button')].some(
              (button) => button.textContent?.trim() === 'Retry access'
            )
          })
          return
        }
        if (Date.now() - started > 20_000) {
          done({ displayed: false })
          return
        }
        requestAnimationFrame(tick)
      }
      tick()
    })) as { displayed: boolean; text?: string; retry?: boolean }

    assert.equal(view.displayed, true)
    assert.doesNotMatch(view.text ?? '', /system credential store|Saved passwords and API keys/)
    assert.equal(view.retry, false)
  })

  it('shows a paused section after denial and hides it after retry', async function () {
    this.timeout(180_000)
    await assert.rejects(
      invokeNative('credential_write', { reference, value: 'open-pencil-native-test-denied' })
    )
    // One page round trip: the embedded driver spends five seconds in each command's
    // window-focus hook here, so separate WebDriver lookups outlast this test's limit.
    const outcome = (await browser.executeAsync((done) => {
      const core = window.__TAURI__?.core
      if (!core) {
        done({ error: 'native test requires app.withGlobalTauri' })
        return
      }
      const panel = document.querySelector<HTMLElement>('[data-test-id="settings-general-panel"]')
      if (!panel) {
        done({ error: 'General settings panel is not open' })
        return
      }
      const retryButton = () =>
        [...document.querySelectorAll<HTMLButtonElement>('button')].find(
          (button) => button.textContent?.trim() === 'Retry access'
        ) ?? null
      const started = Date.now()
      const act = () => {
        const button = retryButton()
        if (button) {
          button.scrollIntoView()
          button.click()
          const clicked = Date.now()
          const poll = async () => {
            try {
              const paused = await core.invoke<boolean>('credential_access_paused')
              if (paused === false) {
                done({ retried: true, panelShown: panel.offsetParent !== null })
                return
              }
              if (Date.now() - clicked > 5_000) {
                done({ retried: false, panelShown: panel.offsetParent !== null })
                return
              }
              setTimeout(() => {
                void poll()
              }, 100)
            } catch (error) {
              done({ error: String(error) })
            }
          }
          void poll()
          return
        }
        if (Date.now() - started > 10_000) {
          done({ error: 'Retry access did not show' })
          return
        }
        requestAnimationFrame(act)
      }
      act()
    })) as { retried?: boolean; panelShown?: boolean; error?: string }

    assert.equal(outcome.error, undefined)
    assert.equal(outcome.panelShown, true)
    assert.equal(outcome.retried, true)
    await invokeNative('credential_write', { reference, value: 'disposable' })
    await invokeNative('credential_remove', { reference })
  })
})
