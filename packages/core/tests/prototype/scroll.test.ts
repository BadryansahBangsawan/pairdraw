import { describe, expect, test } from 'bun:test'

import {
  createPlayScenes,
  playHitTest,
  pointerPath,
  reactionAt,
  scrollRange,
  startSession
} from '@pairdraw/core/prototype'
import { SceneGraph, type OverflowDirection } from '@pairdraw/scene-graph'

/**
 * A 200×300 screen whose list (at y 50, 200×100, clipping) holds five 40 px rows, 200 px of
 * content, and whose second row holds a 100 px wide strip of three 60 px chips.
 */
function listScreen(overflow: OverflowDirection = 'VERTICAL') {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const screen = graph.createNode('FRAME', pageId, { name: 'Screen', width: 200, height: 300 })
  const list = graph.createNode('FRAME', screen.id, {
    name: 'List',
    y: 50,
    width: 200,
    height: 100,
    clipsContent: true,
    overflowDirection: overflow
  })
  const rows = [0, 1, 2, 3, 4].map((index) =>
    graph.createNode('FRAME', list.id, {
      name: `Row ${index}`,
      y: index * 40,
      width: 200,
      height: 40
    })
  )
  const strip = graph.createNode('FRAME', rows[1].id, {
    name: 'Strip',
    width: 100,
    height: 40,
    clipsContent: true,
    overflowDirection: 'HORIZONTAL'
  })
  const chips = [0, 1, 2].map((index) =>
    graph.createNode('RECTANGLE', strip.id, {
      name: `Chip ${index}`,
      x: index * 60,
      width: 60,
      height: 40
    })
  )
  return { graph, screen, list, rows, strip, chips }
}

describe('scroll ranges', () => {
  test('are how far the content reaches past the frame, along the axes it scrolls', () => {
    const { graph, list, strip } = listScreen()
    expect(scrollRange(graph, list.id)).toEqual({ x: 0, y: 100 })
    expect(scrollRange(graph, strip.id)).toEqual({ x: 80, y: 0 })
  })

  test("count an auto layout's trailing padding, as Figma scrolls to it", () => {
    const { graph, list } = listScreen()
    graph.updateNode(list.id, { layoutMode: 'VERTICAL', paddingBottom: 12 })
    expect(scrollRange(graph, list.id)).toEqual({ x: 0, y: 112 })
  })

  test('are none for a frame that does not scroll, or does not clip', () => {
    const { graph, list } = listScreen('NONE')
    expect(scrollRange(graph, list.id)).toEqual({ x: 0, y: 0 })
    graph.updateNode(list.id, { overflowDirection: 'BOTH', clipsContent: false })
    expect(scrollRange(graph, list.id)).toEqual({ x: 0, y: 0 })
  })
})

describe('scrolling in play', () => {
  test('moves the innermost frame that can scroll that way, then the next one out', () => {
    const { graph, screen, list, strip } = listScreen()
    const scenes = createPlayScenes(() => graph)
    // Over the strip: a horizontal scroll moves it, a vertical one the list.
    const path = pointerPath(graph, screen.id, 50, 110)
    expect(path).toContain(strip.id)
    expect(scenes.scrollBy(screen.id, path, 30, 0)).toEqual({ x: 0, y: 0 })
    expect(scenes.scroll.get(strip.id)).toEqual({ x: 30, y: 0 })
    expect(scenes.scrollBy(screen.id, path, 0, 70)).toEqual({ x: 0, y: 0 })
    expect(scenes.scroll.get(list.id)).toEqual({ x: 0, y: 70 })
    // Past the ends: the rest is left over for the canvas.
    expect(scenes.scrollBy(screen.id, path, 100, 50)).toEqual({ x: 50, y: 20 })
    expect(scenes.scroll.get(strip.id)).toEqual({ x: 80, y: 0 })
    expect(scenes.scroll.get(list.id)).toEqual({ x: 0, y: 100 })
    expect(scenes.scrollBy(screen.id, path, -500, 0)).toEqual({ x: -420, y: 0 })
    expect(scenes.scroll.get(strip.id)).toEqual({ x: 0, y: 0 })
  })

  test('finds layers where they are drawn once their frame scrolled', () => {
    const { graph, screen, list, rows } = listScreen()
    const scenes = createPlayScenes(() => graph)
    scenes.scrollBy(screen.id, [screen.id, list.id], 0, 80)
    // y 60 is 10 px into the list, which now shows content 90 px down: the third row.
    expect(playHitTest(graph, screen.id, 150, 60, scenes.scroll)?.id).toBe(rows[2].id)
    // Below the list nothing of it takes the pointer, though the scrolled rows lie there.
    expect(playHitTest(graph, screen.id, 150, 200, scenes.scroll)?.id).toBe(screen.id)
    graph.updateNode(rows[2].id, {
      prototypeReactions: [
        {
          id: 'row',
          trigger: { type: 'ON_CLICK', delay: 0 },
          actions: [{ type: 'BACK' }]
        }
      ]
    })
    expect(
      reactionAt(graph, startSession(screen.id), 150, 60, 'ON_CLICK', scenes.scroll)?.sourceId
    ).toBe(rows[2].id)
  })

  test('Reset puts every frame back at the top', () => {
    const { graph, screen, list } = listScreen()
    const scenes = createPlayScenes(() => graph)
    scenes.scrollBy(screen.id, [screen.id, list.id], 0, 40)
    expect(scenes.scroll.size).toBe(1)
    scenes.clear()
    expect(scenes.scroll.size).toBe(0)
  })
})

describe('Scroll to in play', () => {
  function scrollTo(sourceId: string, targetId: string) {
    return {
      sourceId,
      action: {
        type: 'NODE' as const,
        nodeId: targetId,
        navigation: 'SCROLL_TO' as const,
        transition: { type: 'INSTANT' as const, duration: 0 },
        overlayPosition: 'CENTER' as const
      },
      transition: null
    }
  }

  test('scrolls each frame around the layer, innermost first, to bring it to their top left', () => {
    const { graph, screen, list, strip, chips, rows } = listScreen()
    const scenes = createPlayScenes(() => graph)
    const step = scenes.run(startSession(screen.id), scrollTo(screen.id, chips[2].id))
    expect(scenes.scroll.get(strip.id)).toEqual({ x: 80, y: 0 })
    expect(scenes.scroll.get(list.id)).toEqual({ x: 0, y: 40 })
    expect(step.scrolled).toEqual([
      { id: strip.id, from: { x: 0, y: 0 }, to: { x: 80, y: 0 } },
      { id: list.id, from: { x: 0, y: 0 }, to: { x: 0, y: 40 } }
    ])
    // The chip is drawn 40 px right of the strip's left edge, the strip at the list's top.
    expect(step.reveal).toEqual({ x: 40, y: 50 })

    // A row near the end scrolls the list only as far as it goes.
    scenes.run(startSession(screen.id), scrollTo(screen.id, rows[4].id))
    expect(scenes.scroll.get(list.id)).toEqual({ x: 0, y: 100 })
  })

  test('a layer in no frame that scrolls moves nothing, and is revealed where it is', () => {
    const { graph, screen, list } = listScreen()
    const scenes = createPlayScenes(() => graph)
    const step = scenes.run(startSession(screen.id), scrollTo(screen.id, list.id))
    expect(step.scrolled).toEqual([])
    expect(step.reveal).toEqual({ x: 0, y: 50 })
    expect(step.session).toEqual(startSession(screen.id))
  })

  test('an offset set by hand moves the frame there, as an animated scroll steps it', () => {
    const { graph, screen, list } = listScreen()
    const scenes = createPlayScenes(() => graph)
    scenes.setScroll(list.id, { x: 0, y: 30 })
    expect(scenes.scroll.get(list.id)).toEqual({ x: 0, y: 30 })
    expect(screen.id).toBeDefined()
  })
})
