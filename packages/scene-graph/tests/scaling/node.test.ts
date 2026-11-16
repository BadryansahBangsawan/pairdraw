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
    expect(changes.derivedTextGlyphs?.[0]).toMatchObject({ x: 20, y: 40, scaleX: 2, scaleY: 2 })
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
