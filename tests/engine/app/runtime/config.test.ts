import { describe, expect, test } from 'bun:test'

import { parseAppRuntimeConfig } from '@/app/runtime/config'

describe('app runtime configuration', () => {
  test('parses supported development and presentation flags once', () => {
    expect(
      parseAppRuntimeConfig(
        '?test&navigation-benchmark&recent-files&no-chrome&no-rulers&renderer=tiled&collabTransport=test&collabRelay=ws%3A%2F%2Flocalhost%3A4000'
      )
    ).toEqual({
      test: true,
      navigationBenchmark: true,
      recentFiles: true,
      showChrome: false,
      showRulers: false,
      sceneRenderer: 'tiled',
      sceneRendererOverride: true,
      ultralight: false,
      maxPixelRatio: undefined,
      reducedEffects: false,
      collaborationTransport: 'test',
      collaborationRelayURL: 'ws://localhost:4000',
      viewportMotion: false,
      drafts: false,
      embed: null
    })
  })

  test('an embed hides chrome unless asked and keeps no drafts', () => {
    const embed = parseAppRuntimeConfig('?embed&origin=https%3A%2F%2Fhost.example')
    expect(embed.embed).toEqual({ origin: 'https://host.example', allowEdit: false, chrome: false })
    expect(embed.showChrome).toBe(false)
    expect(embed.drafts).toBe(false)
    expect(parseAppRuntimeConfig('?embed&chrome').showChrome).toBe(true)
  })

  test('glides the viewport outside test runs, and in one that asks for it', () => {
    expect(parseAppRuntimeConfig('').viewportMotion).toBe(true)
    expect(parseAppRuntimeConfig('?test').viewportMotion).toBe(false)
    expect(parseAppRuntimeConfig('?test&viewport-motion').viewportMotion).toBe(true)
  })

  test('keeps new documents as drafts outside test runs, and in one that asks for it', () => {
    expect(parseAppRuntimeConfig('').drafts).toBe(true)
    expect(parseAppRuntimeConfig('?test').drafts).toBe(false)
    expect(parseAppRuntimeConfig('?test&drafts').drafts).toBe(true)
  })

  test('uses a persisted renderer preference when no URL override is present', () => {
    expect(parseAppRuntimeConfig('', 'tiled').sceneRenderer).toBe('tiled')
    expect(parseAppRuntimeConfig('?renderer=unknown', 'tiled').sceneRenderer).toBe('tiled')
  })

  test('valid renderer URL overrides take precedence over preferences', () => {
    expect(parseAppRuntimeConfig('?renderer=retained', 'tiled').sceneRenderer).toBe('retained')
    expect(parseAppRuntimeConfig('?renderer=tiled', 'retained').sceneRenderer).toBe('tiled')
  })

  test('Ultralight mode renders in tiles at one device pixel per CSS pixel with cheap effects', () => {
    const config = parseAppRuntimeConfig('', 'retained', true)
    expect(config).toMatchObject({
      ultralight: true,
      sceneRenderer: 'tiled',
      maxPixelRatio: 1,
      reducedEffects: true
    })
  })

  test('a renderer URL override still picks the renderer in Ultralight mode', () => {
    expect(parseAppRuntimeConfig('?renderer=retained', 'tiled', true)).toMatchObject({
      sceneRenderer: 'retained',
      maxPixelRatio: 1,
      reducedEffects: true
    })
  })

  test('uses production-safe defaults for absent or unknown values', () => {
    expect(parseAppRuntimeConfig('?renderer=unknown')).toEqual({
      test: false,
      navigationBenchmark: false,
      recentFiles: false,
      showChrome: true,
      showRulers: true,
      sceneRenderer: 'retained',
      sceneRendererOverride: false,
      ultralight: false,
      maxPixelRatio: undefined,
      reducedEffects: false,
      collaborationTransport: 'default',
      collaborationRelayURL: null,
      viewportMotion: true,
      drafts: true,
      embed: null
    })
  })
})
