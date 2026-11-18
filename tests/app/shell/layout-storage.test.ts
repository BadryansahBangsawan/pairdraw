import { describe, expect, test } from 'bun:test'

import {
  EDITOR_PANEL_INSET,
  EDITOR_PANEL_LIMITS,
  defaultEditorLayout,
  parseEditorLayout
} from '@/app/shell/layout-storage'

const WINDOW = 1600

describe('parseEditorLayout', () => {
  test('keeps saved pixel widths', () => {
    const saved = { layers: 300, chat: 420 }
    expect(parseEditorLayout(JSON.stringify(saved), WINDOW)).toEqual(saved)
  })

  test('drops the properties panel’s width a build before this one saved', () => {
    const saved = { layers: 300, properties: 320, chat: 420 }
    expect(parseEditorLayout(JSON.stringify(saved), WINDOW)).toEqual({ layers: 300, chat: 420 })
  })

  test('reads a percent layout from before the chat column as the pixels it had', () => {
    const layout = parseEditorLayout(JSON.stringify([20, 60, 20]), WINDOW)
    expect(layout.layers).toBeCloseTo(WINDOW * 0.2)
    expect(layout.chat).toBe(defaultEditorLayout().chat)
  })

  test('defaults what is missing or broken and keeps the rest', () => {
    const defaults = defaultEditorLayout()
    expect(parseEditorLayout(JSON.stringify({ properties: 300 }), WINDOW)).toEqual(defaults)
    expect(parseEditorLayout(JSON.stringify({ layers: 'wide', chat: 400 }), WINDOW)).toEqual({
      ...defaults,
      chat: 400
    })
    expect(parseEditorLayout(JSON.stringify({ layers: 280 }), WINDOW)).toEqual({
      ...defaults,
      layers: 280
    })
    expect(parseEditorLayout(JSON.stringify([20, 'wide', 20]), WINDOW)).toEqual(defaults)
    expect(parseEditorLayout('{not json', WINDOW)).toEqual(defaults)
    expect(parseEditorLayout(null, WINDOW)).toEqual(defaults)
  })

  test('keeps every width within its panel’s limits', () => {
    const layout = parseEditorLayout(JSON.stringify({ layers: 1, chat: 0 }), WINDOW)
    expect(layout).toEqual({
      layers: EDITOR_PANEL_LIMITS.layers.min,
      chat: EDITOR_PANEL_LIMITS.chat.min
    })
  })
})

describe('defaultEditorLayout', () => {
  test('opens each panel’s card at its width, with the inset beside it', () => {
    expect(defaultEditorLayout()).toEqual({
      layers: 256 + EDITOR_PANEL_INSET,
      chat: 320 + EDITOR_PANEL_INSET
    })
  })

  test('opens within every panel’s limits', () => {
    const layout = defaultEditorLayout()
    for (const panel of ['layers', 'chat'] as const) {
      expect(layout[panel]).toBeGreaterThanOrEqual(EDITOR_PANEL_LIMITS[panel].min)
      expect(layout[panel]).toBeLessThanOrEqual(EDITOR_PANEL_LIMITS[panel].max)
    }
  })
})
