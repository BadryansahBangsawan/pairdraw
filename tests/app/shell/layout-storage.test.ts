import { describe, expect, test } from 'bun:test'

import {
  EDITOR_PANEL_LIMITS,
  defaultEditorLayout,
  parseEditorLayout
} from '@/app/shell/layout-storage'

const WINDOW = 1600

describe('parseEditorLayout', () => {
  test('keeps saved pixel widths', () => {
    const saved = { layers: 300, properties: 320, chat: 420 }
    expect(parseEditorLayout(JSON.stringify(saved), WINDOW)).toEqual(saved)
  })

  test('reads a percent layout from before the chat column as the pixels it had', () => {
    const layout = parseEditorLayout(JSON.stringify([20, 60, 20]), WINDOW)
    expect(layout.layers).toBeCloseTo(WINDOW * 0.2)
    expect(layout.properties).toBeCloseTo(WINDOW * 0.2)
    expect(layout.chat).toBe(defaultEditorLayout(WINDOW).chat)
  })

  test('defaults what is missing or broken and keeps the rest', () => {
    const defaults = defaultEditorLayout(WINDOW)
    expect(parseEditorLayout(JSON.stringify({ properties: 300 }), WINDOW)).toEqual({
      ...defaults,
      properties: 300
    })
    expect(parseEditorLayout(JSON.stringify({ layers: 'wide', chat: 400 }), WINDOW)).toEqual({
      ...defaults,
      chat: 400
    })
    expect(parseEditorLayout(JSON.stringify([20, 'wide', 20]), WINDOW)).toEqual(defaults)
    expect(parseEditorLayout('{not json', WINDOW)).toEqual(defaults)
    expect(parseEditorLayout(null, WINDOW)).toEqual(defaults)
  })

  test('keeps every width within its panel’s limits', () => {
    const layout = parseEditorLayout(
      JSON.stringify({ layers: 1, properties: 5000, chat: 0 }),
      WINDOW
    )
    expect(layout).toEqual({
      layers: EDITOR_PANEL_LIMITS.layers.min,
      properties: EDITOR_PANEL_LIMITS.properties.max,
      chat: EDITOR_PANEL_LIMITS.chat.min
    })
  })
})

describe('defaultEditorLayout', () => {
  test('opens the properties panel and the chat at one width on any window', () => {
    const narrow = defaultEditorLayout(1280)
    const wide = defaultEditorLayout(2560)
    expect(wide.properties).toBe(narrow.properties)
    expect(wide.chat).toBe(narrow.chat)
    expect(wide.layers).toBeGreaterThan(narrow.layers)
  })
})
