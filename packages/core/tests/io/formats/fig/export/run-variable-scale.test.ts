import { beforeAll, expect, test } from 'bun:test'

import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { materializeDocument, parseFigBuffer } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type CharacterStyleOverride } from '@pairdraw/scene-graph'
import { reconcileVariableBindings } from '@pairdraw/scene-graph/variables'

beforeAll(async () => {
  await initCodec()
})

/**
 * A text whose layer binds its line height at twice the variable's 24, and whose first five
 * characters bind another variable, also 24, with `style`'s scale.
 */
function boundText(style: Pick<CharacterStyleOverride, 'variableBindingScales'>) {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Type')
  const loose = graph.createVariable('height/loose', 'FLOAT', collection.id, 24)
  const tight = graph.createVariable('height/tight', 'FLOAT', collection.id, 24)
  const frame = graph.createNode('FRAME', graph.getPages()[0].id, {
    name: 'Frame',
    width: 300,
    height: 200
  })
  graph.createNode('TEXT', frame.id, {
    name: 'Label',
    text: 'Hello',
    fontSize: 16,
    lineHeight: { unit: 'PIXELS', value: 48 },
    boundVariables: { lineHeight: loose.id },
    variableBindingScales: { lineHeight: 2 },
    styleRuns: [
      {
        start: 0,
        length: 5,
        style: {
          lineHeight: { unit: 'PIXELS', value: 24 },
          boundVariables: { lineHeight: tight.id },
          ...style
        }
      }
    ]
  })
  return graph
}

/** The first run of the text after a `.fig` round-trip and a reconcile. */
async function reopenedRun(graph: SceneGraph) {
  const bytes = await exportFigFile(graph)
  const reopened = parseFigBuffer(bytes.slice().buffer as ArrayBuffer)
  const restored = materializeDocument(reopened.nodeChanges, reopened.blobs, {
    derivedBounds: true
  })
  const text = [...restored.graph.getAllNodes()].find(
    (node) => node.type === 'TEXT' && node.name === 'Label'
  )
  if (!text) throw new Error('Missing reopened text')
  reconcileVariableBindings(restored.graph)
  return restored.graph.getNode(text.id)?.styleRuns.find((run) => run.start === 0)?.style
}

test('a range keeps its own variable scale through a .fig round-trip', async () => {
  const style = await reopenedRun(boundText({ variableBindingScales: { lineHeight: 3 } }))

  expect(style?.variableBindingScales?.lineHeight).toBeCloseTo(3, 6)
  expect(style?.lineHeight).toEqual({ unit: 'PIXELS', value: 72 })
})

test('a range scaled apart from its layer keeps a scale of 1 through a .fig round-trip', async () => {
  const style = await reopenedRun(boundText({ variableBindingScales: { lineHeight: 1 } }))

  expect(style?.variableBindingScales?.lineHeight).toBe(1)
  expect(style?.lineHeight).toEqual({ unit: 'PIXELS', value: 24 })
})

test('a range saved without a scale of its own still resolves with the layer scale', async () => {
  const style = await reopenedRun(boundText({}))

  expect(style?.lineHeight).toEqual({ unit: 'PIXELS', value: 48 })
})
