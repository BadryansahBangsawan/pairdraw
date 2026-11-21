import { describe, expect, test } from 'bun:test'

import { sceneNodeToJSX } from '@pairdraw/design-jsx'
import { SceneGraph, type Effect } from '@pairdraw/scene-graph'

/** An effect type the scene graph does not model, which `.fig` import keeps in the raw payload. */
const repeat = {
  type: 'REPEAT',
  color: { r: 0, g: 0, b: 0, a: 0.4 },
  offset: { x: 0, y: 0 },
  radius: 0,
  spread: 0,
  visible: true
}

const shadow: Effect = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 2 },
  radius: 4,
  spread: 0,
  visible: true
}

const noise: Effect = {
  type: 'NOISE',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  visible: true,
  noise: { noiseType: 'MONOTONE', noiseSize: { x: 0.5, y: 0.5 }, density: 1 }
}

const texture: Effect = {
  type: 'TEXTURE',
  color: { r: 0, g: 0, b: 0, a: 1 },
  radius: 4,
  visible: true,
  texture: { noiseSize: { x: 4, y: 4 }, clipToShape: false }
}

/** Gives a layer the effects an imported file wrote, as the reader stores them. */
function withImportedEffects(node: { effects: unknown }, effects: unknown[]): void {
  Object.defineProperty(node, 'effects', { value: effects, writable: true, configurable: true })
}

describe('sceneNodeToJSX effects', () => {
  test('noise and texture effects export as the calls that build them', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const grain = graph.createNode('RECTANGLE', pageId, { name: 'Grain', width: 10, height: 10 })
    withImportedEffects(grain, [noise, texture, shadow])
    const jsx = sceneNodeToJSX(grain.id, graph)
    expect(jsx).toContain('noise({')
    expect(jsx).toContain('noiseType: "MONOTONE"')
    expect(jsx).toContain('noiseSize: 0.5')
    expect(jsx).toContain('texture({')
    expect(jsx).toContain('clipToShape: false')
    expect(jsx).toContain('dropShadow(')
  })

  test('effects without a helper, such as a repeat, are left out', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, { name: 'Card', width: 20, height: 20 })
    const plain = graph.createNode('RECTANGLE', frame.id, { name: 'Plain', width: 10, height: 10 })
    withImportedEffects(plain, [repeat])
    expect(sceneNodeToJSX(plain.id, graph)).toBe('<Rectangle name="Plain" w={10} h={10} />')
    expect(sceneNodeToJSX(frame.id, graph)).toContain('<Rectangle name="Plain"')
  })
})
