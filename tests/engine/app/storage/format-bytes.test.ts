import { describe, expect, test } from 'bun:test'

import { formatStorageBytes } from '@/app/storage/format-bytes'

describe('formatStorageBytes', () => {
  test('formats common sizes', () => {
    expect(formatStorageBytes(0, 'en')).toBe('0 B')
    expect(formatStorageBytes(512, 'en')).toBe('512 B')
    expect(formatStorageBytes(2048, 'en')).toBe('2 KB')
    expect(formatStorageBytes(1024 * 1024 * 3, 'en')).toBe('3.0 MB')
  })

  test('writes the decimal separator of the interface language', () => {
    for (const locale of ['de', 'fr', 'ru', 'es', 'it', 'pl']) {
      expect(formatStorageBytes(1024 * 1024 * 3, locale)).toBe('3,0 MB')
    }
    expect(formatStorageBytes(1024 * 1024 * 3, 'ja')).toBe('3.0 MB')
    expect(formatStorageBytes(1024 * 1024 * 3, 'zh-CN')).toBe('3.0 MB')
  })

  test('keeps a byte count without grouping separators', () => {
    expect(formatStorageBytes(1023, 'de')).toBe('1023 B')
  })
})
