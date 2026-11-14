import { describe, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import {
  appPreferences,
  DEFAULT_APP_PREFERENCES,
  parseAppPreferences,
  updateCanvasRenderingMode,
  updateNavigationPreferences,
  updateRenderingPreferences,
  updateZoomSpeed
} from '@/app/settings/preferences/store'

describe('parseAppPreferences', () => {
  test('starts from the defaults when nothing usable is stored', () => {
    for (const stored of [undefined, null, 'preferences', [], {}]) {
      expect(parseAppPreferences(stored)).toEqual(DEFAULT_APP_PREFERENCES)
    }
  })

  test('keeps a valid recent files limit and defaults missing or invalid limits to ten', () => {
    expect(parseAppPreferences({}).files.recentLimit).toBe(10)
    expect(parseAppPreferences({ files: { recentLimit: 25 } }).files.recentLimit).toBe(25)
    for (const recentLimit of [undefined, null, '25', 0, -1, 2.5, 1001, Infinity, Number.NaN]) {
      expect(parseAppPreferences({ files: { recentLimit } }).files.recentLimit).toBe(10)
    }
  })

  test('pings by default and treats an unreadable usage stats answer as never asked', () => {
    expect(DEFAULT_APP_PREFERENCES.sharing).toEqual({ dailyPing: true, usageStats: 'unset' })
    expect(
      parseAppPreferences({ sharing: { dailyPing: false, usageStats: 'maybe' } }).sharing
    ).toEqual({
      dailyPing: false,
      usageStats: 'unset'
    })
  })

  test('keeps valid choices and defaults only the fields that are not', () => {
    const preferences = parseAppPreferences({
      appearance: { animations: 'off' },
      chat: { reasoningDisplay: 'sometimes', changePreviewSize: 'large', maxAgentSteps: 'many' },
      editing: { snapping: { geometry: false, objects: 'yes' } },
      rendering: 'tiled'
    })
    expect(preferences.appearance.animations).toBe('off')
    expect(preferences.chat).toEqual({
      ...DEFAULT_APP_PREFERENCES.chat,
      changePreviewSize: 'large'
    })
    expect(preferences.editing.snapping).toEqual({
      ...DEFAULT_APP_PREFERENCES.editing.snapping,
      geometry: false
    })
    expect(preferences.rendering).toEqual(DEFAULT_APP_PREFERENCES.rendering)
  })

  test('keeps each disabled design check rule once and drops what is not a rule name', () => {
    const { designCheck } = parseAppPreferences({
      designCheck: { preset: 'strict', disabledRules: ['contrast', 7, 'contrast', 'spacing'] }
    })
    expect(designCheck).toEqual({
      showOnCanvas: true,
      preset: 'strict',
      disabledRules: ['contrast', 'spacing']
    })
  })

  test('a fresh profile starts on the Pairdraw accent', () => {
    for (const stored of [undefined, {}, { appearance: {} }]) {
      expect(parseAppPreferences(stored).appearance.accent).toEqual({
        kind: 'preset',
        preset: 'pairdraw'
      })
    }
  })

  test('keeps a preset or a custom accent and falls back to the default for anything else', () => {
    const accent = (value: unknown) =>
      parseAppPreferences({ appearance: { accent: value } }).appearance.accent
    expect(accent({ kind: 'preset', preset: 'green' })).toEqual({ kind: 'preset', preset: 'green' })
    expect(accent({ kind: 'custom', color: '#ff6600' })).toEqual({
      kind: 'custom',
      color: '#FF6600'
    })
    for (const invalid of [
      { kind: 'preset', preset: 'teal' },
      { kind: 'custom', color: 'orange' },
      { kind: 'custom', color: '#f60' },
      '#ff6600'
    ]) {
      expect(accent(invalid)).toEqual(DEFAULT_APP_PREFERENCES.appearance.accent)
    }
    const preferences = parseAppPreferences({ appearance: { animations: 'off', accent: 'teal' } })
    expect(preferences.appearance.animations).toBe('off')
  })

  test('remembers that guided AI setup was finished or skipped', () => {
    expect(parseAppPreferences({ onboarding: { aiSetup: 'done' } }).onboarding.aiSetup).toBe('done')
    expect(parseAppPreferences({ onboarding: { aiSetup: 'later' } }).onboarding.aiSetup).toBe(
      'pending'
    )
  })

  test('keeps a listed zoom speed and defaults any other value to 1', () => {
    expect(parseAppPreferences({ navigation: { zoomSpeed: 0.25 } }).navigation.zoomSpeed).toBe(0.25)
    for (const zoomSpeed of [undefined, '0.5', 0, 0.3, 5, Number.NaN]) {
      expect(parseAppPreferences({ navigation: { zoomSpeed } }).navigation.zoomSpeed).toBe(1)
    }
  })

  test('keeps nudge distances within range and defaults the rest to Figma’s 1 and 10', () => {
    expect(DEFAULT_APP_PREFERENCES.editing.nudge).toEqual({ small: 1, large: 10 })
    expect(
      parseAppPreferences({ editing: { nudge: { small: 0.5, large: 8 } } }).editing.nudge
    ).toEqual({ small: 0.5, large: 8 })
    // Values off the presets and between whole pixels are kept, as Settings can type them.
    expect(
      parseAppPreferences({ editing: { nudge: { small: 0.25, large: 1.5 } } }).editing.nudge
    ).toEqual({ small: 0.25, large: 1.5 })
    for (const small of [undefined, '2', 0, -1, 0.05, 1001, Infinity, Number.NaN]) {
      expect(parseAppPreferences({ editing: { nudge: { small } } }).editing.nudge.small).toBe(1)
    }
  })

  test('keeps half-pixel snapping beside the other snapping choices', () => {
    expect(DEFAULT_APP_PREFERENCES.editing.snapping.halfPixel).toBe(false)
    const { snapping } = parseAppPreferences({
      editing: { snapping: { halfPixel: true, pixelGrid: false } }
    }).editing
    expect(snapping).toEqual({ geometry: true, objects: true, pixelGrid: false, halfPixel: true })
    expect(
      parseAppPreferences({ editing: { snapping: { halfPixel: 'yes' } } }).editing.snapping
        .halfPixel
    ).toBe(false)
  })

  test('keeps wheel zoom choices off unless turned on', () => {
    expect(parseAppPreferences({}).navigation).toEqual({
      zoomSpeed: 1,
      wheelZoom: false,
      invertZoom: false
    })
    expect(
      parseAppPreferences({ navigation: { zoomSpeed: 2, wheelZoom: true, invertZoom: 'on' } })
        .navigation
    ).toEqual({ zoomSpeed: 2, wheelZoom: true, invertZoom: false })
  })

  test('remembers the pixel grid, Ultralight mode, and which side panels are open', () => {
    const preferences = parseAppPreferences({
      view: { pixelGrid: false },
      rendering: { ultralight: true },
      workspace: { layersOpen: true, propertiesOpen: 'no' }
    })
    expect(preferences.view).toEqual({ pixelGrid: false })
    expect(preferences.rendering).toEqual({ canvasMode: 'retained', ultralight: true })
    // An unreadable choice falls back to the default: the canvas starts without its side panels.
    expect(preferences.workspace).toEqual({ layersOpen: true, propertiesOpen: false })
    expect(parseAppPreferences({}).workspace).toEqual({ layersOpen: false, propertiesOpen: false })
    expect(parseAppPreferences({}).view.pixelGrid).toBe(true)
    expect(parseAppPreferences({}).rendering.ultralight).toBe(false)
  })

  test('changing one navigation or rendering choice keeps the others', () => {
    const stored = structuredClone(toRaw(appPreferences.value))
    try {
      updateNavigationPreferences({ wheelZoom: true })
      updateZoomSpeed(0.5)
      expect(appPreferences.value.navigation).toEqual({
        ...stored.navigation,
        zoomSpeed: 0.5,
        wheelZoom: true
      })
      updateRenderingPreferences({ ultralight: true })
      updateCanvasRenderingMode('tiled')
      expect(appPreferences.value.rendering).toEqual({ canvasMode: 'tiled', ultralight: true })
    } finally {
      appPreferences.value = stored
    }
  })

  test('keeps comment view choices and drops an unknown sort order', () => {
    const { comments } = parseAppPreferences({
      comments: { showOnCanvas: false, showResolved: true, sort: 'loudest' }
    })
    expect(comments).toEqual({
      ...DEFAULT_APP_PREFERENCES.comments,
      showOnCanvas: false,
      showResolved: true
    })
  })
})
