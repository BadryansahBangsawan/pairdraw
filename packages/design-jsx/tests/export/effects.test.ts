import { describe, expect, test } from 'bun:test'

import { sceneNodeToJSX } from '@pairdraw/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

/** An effect type a `.fig` import keeps although the scene graph does not model it. */
const noise = {
  type: 'NOISE',
  color: { r: 0, g: 0, b: 0, a: 0.4 },
  offset: { x: 0, y: 0 },
  radius: 0,
  spread: 0,
  visible: true
}

const shadow = {
  type: 'DROP_SHADOW',
  color: { r: 0, g: 0, b: 0, a: 0.2 },
  offset: { x: 0, y: 2 },
  radius: 4,
  spread: 0,
  visible: true
}

/** Gives a layer the effects an imported file wrote, as the reader stores them. */
function withImportedEffects(node: { effects: unknown }, effects: unknown[]): void {
  Object.defineProperty(node, 'effects', { value: effects, writable: true, configurable: true })
}

describe('sceneNodeToJSX effects', () => {
  test('effects without a helper, such as an imported noise, are left out', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', pageId, { name: 'Card', width: 20, height: 20 })
    const grain = graph.createNode('RECTANGLE', frame.id, {
      name: 'Grain',
      width: 10,
      height: 10
    })
    withImportedEffects(grain, [noise, shadow])
    const plain = graph.createNode('RECTANGLE', frame.id, {
      name: 'Plain',
      width: 10,
      height: 10
    })
    withImportedEffects(plain, [noise])
    expect(sceneNodeToJSX(grain.id, graph)).toBe(
      '<Rectangle name="Grain" w={10} h={10} shadow="0 2 4 #00000033" />'
    )
    expect(sceneNodeToJSX(plain.id, graph)).toBe('<Rectangle name="Plain" w={10} h={10} />')
    expect(sceneNodeToJSX(frame.id, graph)).toContain('<Rectangle name="Grain"')
  })
})
