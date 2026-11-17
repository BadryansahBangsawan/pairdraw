import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { exportImage } from '#core/tools/vector/export'

describe('export_image format', () => {
  test('takes a lower-case format, as the other tools take lower-case options', () => {
    for (const format of ['png', 'jpg', 'webp']) {
      expect(v.safeParse(exportImage.input, { format }).success).toBe(true)
    }
  })

  test('takes the upper-case format it documents', () => {
    for (const format of ['PNG', 'JPG', 'WEBP']) {
      expect(v.safeParse(exportImage.input, { format }).success).toBe(true)
    }
  })

  test('refuses a format it cannot write', () => {
    const parsed = v.safeParse(exportImage.input, { format: 'gif' })

    expect(parsed.success).toBe(false)
    expect(parsed.success ? '' : parsed.issues[0]?.message).toContain('PNG')
  })
})
