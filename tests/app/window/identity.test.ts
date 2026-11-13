import { describe, expect, test } from 'bun:test'

import { installWindowIdentity, windowDocumentId, windowLabel } from '@/app/window/identity'

describe('window identity', () => {
  test('the browser build is the main window', async () => {
    await installWindowIdentity(async () => null)
    expect(windowLabel()).toBe('main')
  })

  test('the shell supplies the label every window shares with the native side', async () => {
    await installWindowIdentity(async () => 'editor-2')
    expect(windowLabel()).toBe('editor-2')
  })

  test('a tab id becomes unique across windows once it leaves the window', async () => {
    await installWindowIdentity(async () => 'editor-2')
    const first = windowDocumentId('tab-1')
    await installWindowIdentity(async () => 'main')
    const second = windowDocumentId('tab-1')
    expect(first).toBe('editor-2:tab-1')
    expect(second).toBe('main:tab-1')
    expect(first).not.toBe(second)
  })
})
