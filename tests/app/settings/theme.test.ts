import { describe, expect, test } from 'bun:test'

import { resolveAppTheme } from '@/app/settings/theme'

describe('stored theme', () => {
  test('keep a chosen dark or light theme, whatever the system prefers', () => {
    expect(resolveAppTheme('dark', false)).toBe('dark')
    expect(resolveAppTheme('light', true)).toBe('light')
  })

  test('follow the system when set to auto', () => {
    expect(resolveAppTheme('auto', true)).toBe('dark')
    expect(resolveAppTheme('auto', false)).toBe('light')
  })

  test('follow the system when nothing usable was chosen', () => {
    for (const setting of [null, undefined, 'sepia', 1]) {
      expect(resolveAppTheme(setting, true)).toBe('dark')
      expect(resolveAppTheme(setting, false)).toBe('light')
    }
  })
})
