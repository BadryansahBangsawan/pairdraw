import { describe, expect, test } from 'bun:test'

import { spacingGuideLabel } from '#core/canvas/overlays/spacing'

describe('equal-spacing indicator label', () => {
  test('is the gap a guide spans, in either direction', () => {
    expect(spacingGuideLabel({ axis: 'y', position: 10, from: 100, to: 120, spacing: true })).toBe(
      '20'
    )
    expect(spacingGuideLabel({ axis: 'x', position: 10, from: 60, to: 40, spacing: true })).toBe(
      '20'
    )
  })

  test('keeps a centred layer’s half-pixel gap to two decimals', () => {
    expect(spacingGuideLabel({ axis: 'y', position: 0, from: 40, to: 70.5, spacing: true })).toBe(
      '30.5'
    )
    expect(
      spacingGuideLabel({ axis: 'y', position: 0, from: 0, to: 10.3333333, spacing: true })
    ).toBe('10.33')
  })
})
