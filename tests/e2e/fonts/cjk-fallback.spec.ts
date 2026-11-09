import { test, expect } from '@playwright/test'

import type * as AppFonts from '@/app/editor/fonts'

import type { FontManager } from '#core/text/font/manager'

import { CanvasHelper } from '#tests/helpers/canvas'
import { trackFontModuleResources } from '#tests/helpers/fonts/runtime'

test.beforeEach(async ({ page }) => {
  await trackFontModuleResources(page)
})

test('tool-created CJK text requests fallback through app font loading', async ({ page }) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test&no-chrome&no-rulers')
  await canvas.waitForInit()

  const result = await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')

    const appFontsURL = '/src/app/editor/fonts/index.ts'
    const { ensureGraphFonts, loadFont }: typeof AppFonts = await import(appFontsURL)
    await loadFont('Inter', 'Regular')
    const fontModuleURL = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((url) => url.includes('/packages/core/src/text/font/manager.ts'))
    if (!fontModuleURL) throw new Error('Active font manager module not found')
    const { fontManager } = (await import(/* @vite-ignore */ fontModuleURL)) as {
      fontManager: FontManager
    }
    const originalEnsureFallbackPack = fontManager.ensureFallbackPack.bind(fontManager)
    let requestedScripts: string[] = []

    fontManager.ensureFallbackPack = async (scripts = ['cjk', 'arabic']) => {
      requestedScripts = [...scripts]
      return { cjk: ['Noto Sans CJK SC'], arabic: [] }
    }

    const pageNode = store.graph.getNode(store.state.currentPageId)
    if (!pageNode) throw new Error(`Page ${store.state.currentPageId} not found`)
    const text = store.graph.createNode('TEXT', pageNode.id, {
      name: 'Tool CJK Regression',
      x: 80,
      y: 80,
      width: 300,
      height: 60,
      text: '你好世界',
      fontSize: 32,
      fontFamily: 'Inter',
      textPicture: new Uint8Array([1, 2, 3]),
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }]
    })

    try {
      const changed = await ensureGraphFonts(store.graph, [text.id])
      return {
        changed,
        requestedScripts,
        textPictureCleared: store.graph.getNode(text.id)?.textPicture === null
      }
    } finally {
      fontManager.ensureFallbackPack = originalEnsureFallbackPack
    }
  })

  expect(result).toEqual({
    changed: true,
    requestedScripts: ['cjk-sc'],
    textPictureCleared: true
  })
  canvas.assertNoErrors()
})

test('CJK text waits for fallback fonts and repaints after they load', async ({ page }) => {
  const canvas = new CanvasHelper(page)
  await page.goto('/?test&no-chrome&no-rulers')
  await canvas.waitForInit()

  const result = await page.evaluate(async () => {
    const store = window.openPencil?.getStore?.()
    if (!store?.renderer) throw new Error('OpenPencil renderer not initialized')
    // The scene surface draws document text. The overlay surface registers last and owns
    // store.renderer, but it only draws editor chrome.
    const renderer = store.canvasRenderers.find((item) => item.tracksSceneSettlement)
    if (!renderer?.fontsLoaded) throw new Error('OpenPencil scene renderer not ready')
    const response = await fetch('/tests/fixtures/fonts/NotoSansCJK-Test.otf')
    const fallbackData = await response.arrayBuffer()
    const fontModuleURL = performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .find((url) => url.includes('/packages/core/src/text/font/manager.ts'))
    if (!fontModuleURL) throw new Error('Active font manager module not found')
    const { fontManager } = (await import(/* @vite-ignore */ fontModuleURL)) as {
      fontManager: FontManager
    }
    const cjkFallbackFamilies = fontManager.getCJKFallbackFamilies()
    const originalFamilies = [...cjkFallbackFamilies]
    const originalEnsureFallbackPack = fontManager.ensureFallbackPack.bind(fontManager)

    let releaseFallback: () => void = () => undefined
    const fallbackGate = new Promise<void>((resolve) => {
      releaseFallback = resolve
    })
    cjkFallbackFamilies.length = 0

    // Observe the app's own repaint. The test never draws: it records every frame each surface
    // draws and counts the document frames that follow the fallback settling.
    let fallbackSettled = false
    let renderCount = 0
    let sceneRendersAfterSettle = 0
    const restoreRenderers = store.canvasRenderers.map((item) => {
      const original = item.renderFromEditorState.bind(item)
      item.renderFromEditorState = (...args: Parameters<typeof item.renderFromEditorState>) => {
        renderCount += 1
        const layer = args[6]
        if (fallbackSettled && (layer === 'scene' || layer === 'full')) sceneRendersAfterSettle += 1
        return original(...args)
      }
      return () => {
        item.renderFromEditorState = original
      }
    })
    let resolveSettled: () => void = () => undefined
    const settled = new Promise<void>((resolve) => {
      resolveSettled = resolve
    })
    const stopSettled = store.onEditorEvent('font:resolution-changed', (event, snapshot) => {
      if (event !== 'settled' || snapshot.state !== 'loaded') return
      if (!snapshot.key.startsWith('coverage:cjk')) return
      fallbackSettled = true
      resolveSettled()
    })

    fontManager.ensureFallbackPack = async (scripts = ['cjk', 'arabic']) => {
      await fallbackGate
      await fontManager.markLoaded('Noto Sans CJK SC', 'Regular', fallbackData)
      fontManager.setCJKFallbackFamily('Noto Sans CJK SC')
      return Object.fromEntries(scripts.map((script) => [script, ['Noto Sans CJK SC']]))
    }

    const text = store.graph.createNode('TEXT', store.state.currentPageId, {
      name: 'CJK Regression',
      x: 80,
      y: 80,
      width: 300,
      height: 60,
      text: '你好世界App',
      textLanguage: 'zh-Hans',
      fontSize: 32,
      fontFamily: 'Inter',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, visible: true, opacity: 1 }]
    })

    try {
      // Reading readiness on the scene renderer registers the demand with that surface's own
      // settlement hook, and draws nothing. The app, not this test, repaints on settlement.
      const loadedBeforeFallback = renderer.isNodeFontLoaded(text)
      releaseFallback()
      await settled
      // The settle callbacks run before the next frame, so a repaint they cause is counted here.
      const sceneRendersOnSettle = sceneRendersAfterSettle
      await new Promise(requestAnimationFrame)
      return {
        loadedBeforeFallback,
        loadedAfterFallback: renderer.isNodeFontLoaded(text),
        readiness: renderer.nodeFontReadiness(text),
        sceneRendersOnSettle,
        renderCount
      }
    } finally {
      stopSettled()
      restoreRenderers.forEach((restore) => restore())
      cjkFallbackFamilies.length = 0
      cjkFallbackFamilies.push(...originalFamilies)
      fontManager.ensureFallbackPack = originalEnsureFallbackPack
    }
  })

  expect(result.loadedBeforeFallback).toBe(false)
  expect(result.readiness).toBe('ready')
  expect(result.loadedAfterFallback).toBe(true)
  expect(result.sceneRendersOnSettle).toBeGreaterThan(0)
  expect(result.renderCount).toBeGreaterThan(0)
  canvas.assertNoErrors()
})
