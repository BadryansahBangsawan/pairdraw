import { describe, expect, test } from 'bun:test'

import { createAPI } from '#core-tests/helpers/figma-api'

describe('viewport', () => {
  test('a script viewport change moves the host viewport too', () => {
    const shown: unknown[] = []
    const api = createAPI({ onViewportChange: (viewport) => shown.push(viewport) })

    api.viewport = { center: { x: 500, y: 300 }, zoom: 2 }

    expect(shown).toEqual([{ center: { x: 500, y: 300 }, zoom: 2 }])
    expect(api.viewport.center).toEqual({ x: 500, y: 300 })
    expect(api.viewport.zoom).toBe(2)
  })

  test('starting on the viewport the host already shows leaves the host alone', () => {
    const shown: unknown[] = []
    const api = createAPI({
      viewport: { center: { x: 640, y: 400 }, zoom: 1 },
      onViewportChange: (viewport) => shown.push(viewport)
    })

    expect(api.viewport.center).toEqual({ x: 640, y: 400 })
    expect(shown).toEqual([])

    api.viewport = { center: { x: 10, y: 20 }, zoom: 2 }

    expect(shown).toEqual([{ center: { x: 10, y: 20 }, zoom: 2 }])
  })

  test('a script scrolling nodes into view does not move the view of whoever is looking', () => {
    const shown: unknown[] = []
    const api = createAPI({ onViewportChange: (viewport) => shown.push(viewport) })
    const frame = api.createFrame()
    frame.x = 0
    frame.y = 0
    frame.resize(100, 100)

    api.viewport.scrollAndZoomIntoView([frame])

    expect(shown).toEqual([])
    expect(api.viewport.zoom).toBe(1)
  })
})
