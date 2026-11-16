import { describe, expect, spyOn, test } from 'bun:test'

import { useWindowControlsOverTopBar } from '@/app/window/controls'

describe('window controls over the top bar', () => {
  test('a window that cannot report full screen warns instead of rejecting unhandled', async () => {
    const failure = new Error('isFullscreen failed')
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      const over = useWindowControlsOverTopBar(true, async () => ({
        isFullscreen: () => Promise.reject(failure),
        onResized: () => Promise.resolve(() => undefined)
      }))
      expect(over.value).toBe(true)
      await Bun.sleep(20)
      expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
    } finally {
      warn.mockRestore()
    }
  })

  test('a window that cannot be loaded warns instead of rejecting unhandled', async () => {
    const failure = new Error('import failed')
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      useWindowControlsOverTopBar(true, () => Promise.reject(failure))
      await Bun.sleep(20)
      expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
    } finally {
      warn.mockRestore()
    }
  })
})
