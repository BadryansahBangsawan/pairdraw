import { afterEach, describe, expect, test } from 'bun:test'

import { useI18n } from '@open-pencil/vue/i18n'

import { toast } from '@/app/shell/ui'
import { checkForAppUpdate } from '@/app/shell/updater/check'
import { UPDATER_WINDOW_LABEL, UPDATER_WINDOW_URL } from '@/app/shell/updater/window'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

const { updates: messages } = useI18n()

// What `tauri-plugin-updater` rejects with when `plugins.updater.endpoints` is empty.
const MISSING_FEED_ERROR = 'Updater does not have any endpoints set.'

const AVAILABLE_UPDATE = {
  rid: 9,
  currentVersion: '0.11.8',
  version: '0.11.9',
  date: null,
  body: '### Fixed\n\n- Release notes',
  rawJson: '{}'
}

afterEach(async () => {
  await clearTauriMocks()
  for (const entry of toast.toasts.value) toast.remove(entry.id)
})

describe('checkForAppUpdate', () => {
  test('returns quietly when no update is available', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      return null
    })

    await checkForAppUpdate({ silent: true, messages })

    expect(calls).toEqual(['plugin:app|bundle_type', 'plugin:updater|check'])
    expect(toast.toasts.value).toEqual([])
  })

  test('says the app is up to date when asked from the menu', async () => {
    await mockTauriIPC(() => null)

    await checkForAppUpdate({ messages })

    expect(toast.toasts.value.map((entry) => entry.message)).toEqual([messages.value.upToDate])
  })

  test('opens the Software Update window for an available update', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []
    await mockTauriIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'plugin:updater|check') return AVAILABLE_UPDATE
      if (cmd === 'plugin:window|get_all_windows') return ['main']
      return null
    })

    await checkForAppUpdate({ silent: true, messages })

    const created = calls.find((call) => call.cmd === 'plugin:webview|create_webview_window')
    expect(created?.args).toMatchObject({
      options: {
        label: UPDATER_WINDOW_LABEL,
        url: UPDATER_WINDOW_URL,
        title: messages.value.windowTitle
      }
    })
    // The window checks again for its own handle; this one is released.
    expect(calls.map((call) => call.cmd)).toContain('plugin:resources|close')
  })

  test('focuses the Software Update window when it is already open', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:updater|check') return AVAILABLE_UPDATE
      if (cmd === 'plugin:window|get_all_windows') return ['main', UPDATER_WINDOW_LABEL]
      return null
    })

    await checkForAppUpdate({ messages })

    expect(calls).toContain('plugin:window|set_focus')
    expect(calls).not.toContain('plugin:webview|create_webview_window')
  })

  test('reports a failed check from the menu', async () => {
    await mockTauriIPC((cmd) => {
      if (cmd === 'plugin:updater|check') throw new Error('offline')
      return null
    })

    await checkForAppUpdate({ messages })

    expect(toast.toasts.value.map((entry) => entry.message)).toEqual([
      messages.value.checkFailed({ error: 'offline' })
    ])
  })

  test('stays quiet at startup when the build has no update feed', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:updater|check') throw MISSING_FEED_ERROR
      return null
    })

    await checkForAppUpdate({ silent: true, messages })

    expect(calls).toEqual(['plugin:app|bundle_type', 'plugin:updater|check'])
    expect(toast.toasts.value).toEqual([])
  })

  test('says updates are not set up, not that the check failed, when asked from the menu', async () => {
    await mockTauriIPC((cmd) => {
      if (cmd === 'plugin:updater|check') throw MISSING_FEED_ERROR
      return null
    })

    await checkForAppUpdate({ messages })

    expect(toast.toasts.value.map((entry) => [entry.variant, entry.message])).toEqual([
      ['default', messages.value.notConfigured]
    ])
  })

  test('checks the feed from the installed Linux package', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:app|bundle_type') return 'deb'
      if (cmd === 'plugin:path|resolve_directory') return '/usr/lib/OpenPencil'
      return null
    })

    await checkForAppUpdate({ messages })

    expect(calls).toContain('plugin:updater|check')
    expect(toast.toasts.value.map((entry) => entry.message)).toEqual([messages.value.upToDate])
  })

  // The portable `.tar.gz` holds the `.deb`'s binary; updating it would install the `.deb`.
  test('never checks from a copy of the Linux package run outside the system folders', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:app|bundle_type') return 'deb'
      if (cmd === 'plugin:path|resolve_directory') {
        return '/home/ana/Apps/Pairdraw_0.16.0_amd64/usr/lib/OpenPencil'
      }
      if (cmd === 'plugin:updater|check') return AVAILABLE_UPDATE
      return null
    })

    await checkForAppUpdate({ silent: true, messages })
    expect(toast.toasts.value).toEqual([])

    await checkForAppUpdate({ messages })

    expect(calls).not.toContain('plugin:updater|check')
    expect(calls).not.toContain('plugin:webview|create_webview_window')
    expect(toast.toasts.value.map((entry) => [entry.variant, entry.message])).toEqual([
      ['default', messages.value.notConfigured]
    ])
  })
})
