import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { nextTick } from 'vue'

import {
  clearRecentFiles,
  forgetRecentFile,
  recentDocuments,
  rememberRecentFile
} from '@/app/recent-files'
import { installRecentFilesMenu } from '@/app/shell/menu/recent-files'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

/** Lets the watcher, its dynamic import, and the recorded invoke run. */
async function flushed(): Promise<void> {
  for (let tick = 0; tick < 20; tick++) await Promise.resolve()
  await nextTick()
}

let before: typeof recentDocuments.value
let pushes: string[][]
let stop: (() => void) | undefined

beforeEach(async () => {
  before = recentDocuments.value
  recentDocuments.value = []
  pushes = []
  await mockTauriIPC((command, args) => {
    if (command !== 'set_recent_files') throw new Error(`Unexpected command ${command}`)
    pushes.push((args as { paths: string[] }).paths)
    return null
  })
})

afterEach(async () => {
  stop?.()
  stop = undefined
  recentDocuments.value = before
  await clearTauriMocks()
})

describe('the native recent files menu', () => {
  test('follows every change of the recent list from the app, not from a view', async () => {
    rememberRecentFile('/designs/alpha.fig')
    stop = installRecentFilesMenu()
    await flushed()
    expect(pushes).toEqual([['/designs/alpha.fig']])

    rememberRecentFile('/designs/beta.fig')
    await flushed()
    expect(pushes.at(-1)).toEqual(['/designs/beta.fig', '/designs/alpha.fig'])

    forgetRecentFile('/designs/beta.fig')
    await flushed()
    expect(pushes.at(-1)).toEqual(['/designs/alpha.fig'])

    await clearRecentFiles()
    await flushed()
    expect(pushes.at(-1)).toEqual([])
  })

  test('pushes an unchanged list once', async () => {
    rememberRecentFile('/designs/alpha.fig')
    stop = installRecentFilesMenu()
    await flushed()
    expect(pushes).toEqual([['/designs/alpha.fig']])

    // Saving the open document again reports a newer date, not a different menu.
    rememberRecentFile('/designs/alpha.fig')
    await flushed()
    expect(pushes).toHaveLength(1)
  })
})
