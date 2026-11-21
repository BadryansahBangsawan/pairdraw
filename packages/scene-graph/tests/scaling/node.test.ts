import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { scaleNodeChanges } from '@pairdraw/scene-graph/scaling'

function pathText() {
  const graph = new SceneGraph()
  return graph.createNode('TEXT', graph.getPages()[0].id, {
    width: 100,
    height: 40,
    fontSize: 10,
    derivedTextGlyphs: [
      { commandsBlob: new Uint8Array([1]), x: 10, y: 20, fontSize: 10, rotation: 0.5 }
    ],
    textPathBox: { x: 2, y: 4, width: 80, height: 30 }
  })
}

describe('scaleNodeChanges', () => {
  test('scales path text glyphs and their box with the layer', () => {
    const changes = scaleNodeChanges(pathText(), 2, true)
    expect(changes.width).toBe(200)
    expect(changes.derivedTextGlyphs?.[0]).toMatchObject({ x: 20, y: 40, fontSize: 20 })
    expect(changes.textPathBox).toEqual({ x: 4, y: 8, width: 160, height: 60 })
  })

  test('leaves glyphs of text that reflows alone', () => {
    const graph = new SceneGraph()
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      derivedTextGlyphs: [{ commandsBlob: new Uint8Array([1]), x: 1, y: 2, fontSize: 10 }]
    })
    expect(scaleNodeChanges(text, 2, true)).not.toHaveProperty('derivedTextGlyphs')
  })
})

describe('scaleNodeChanges on path text saved without glyph outlines', () => {
  const curve = {
    network: {
      vertices: [
        { x: 0, y: 100 },
        { x: 400, y: 100 }
      ],
      segments: [
        { start: 0, end: 1, tangentStart: { x: 100, y: -80 }, tangentEnd: { x: -100, y: -80 } }
      ],
      regions: []
    },
    normalizedSize: { x: 400, y: 160 },
    tValue: 0,
    forward: true
  }

  test('scales its path box and keeps the path', () => {
    const graph = new SceneGraph()
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      width: 400,
      height: 160,
      text: 'Lorem',
      fontSize: 32,
      textPathData: structuredClone(curve),
      textPathBox: { x: 10, y: 20, width: 400, height: 160 },
      derivedTextGlyphs: []
    })

    graph.updateNode(text.id, scaleNodeChanges(text, 2, false))

    expect(text.textPathData).toEqual(curve)
    expect(text.textPathBox).toEqual({ x: 20, y: 40, width: 800, height: 320 })
  })
})

describe('scaleNodeChanges on path text glyph sizes', () => {
  test('scales each glyph position, size, and advance', () => {
    const graph = new SceneGraph()
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      width: 400,
      height: 160,
      text: 'Lorem',
      fontSize: 32,
      textPathBox: { x: 0, y: 0, width: 400, height: 160 },
      derivedTextGlyphs: [
        {
          commandsBlob: new Uint8Array(4),
          x: 30,
          y: 90,
          fontSize: 32,
          rotation: -0.4,
          advance: 18
        },
        { commandsBlob: new Uint8Array(4), x: 50, y: 82, fontSize: 32, rotation: -0.3 }
      ]
    })

    const changes = scaleNodeChanges(text, 2, false)

    expect(changes.derivedTextGlyphs).toMatchObject([
      { x: 60, y: 180, fontSize: 64, rotation: -0.4, advance: 36 },
      { x: 100, y: 164, fontSize: 64, rotation: -0.3 }
    ])
  })
})

describe('scaleNodeChanges on a text reach', () => {
  test('scales how far a fixed-size text lines reach with them', () => {
    const graph = new SceneGraph()
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      width: 100,
      height: 20,
      fontSize: 20,
      textAutoResize: 'NONE',
      derivedTextHeight: 60
    })
    expect(scaleNodeChanges(text, 2, false)).toMatchObject({ height: 40, derivedTextHeight: 120 })
  })

  test('leaves an auto-height text without a measured reach', () => {
    const graph = new SceneGraph()
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      width: 100,
      height: 20,
      fontSize: 20,
      textAutoResize: 'HEIGHT'
    })
    expect(scaleNodeChanges(text, 2, false)).toMatchObject({ height: 40, derivedTextHeight: null })
  })
})
