import { beforeAll, describe, expect, test } from 'bun:test'

import { collectAllNodes } from '#core-tests/helpers/fig/traversal'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type Effect } from '@pairdraw/scene-graph'

const noise: Effect = {
  type: 'NOISE',
  color: { r: 0.25, g: 0.5, b: 0.75, a: 0.25 },
  visible: true,
  blendMode: 'NORMAL',
  noise: { noiseType: 'MONOTONE', noiseSize: { x: 0.5, y: 0.5 }, density: 1 }
}

const duotone: Effect = {
  type: 'NOISE',
  color: { r: 0, g: 0, b: 0, a: 0.25 },
  visible: true,
  blendMode: 'NORMAL',
  noise: {
    noiseType: 'DUOTONE',
    noiseSize: { x: 2, y: 3 },
    density: 0.5,
    secondaryColor: { r: 1, g: 1, b: 1, a: 0.25 }
  }
}

const multitone: Effect = {
  type: 'NOISE',
  color: { r: 0.5, g: 0.25, b: 0.25, a: 1 },
  visible: true,
  blendMode: 'NORMAL',
  noise: {
    noiseType: 'MULTITONE',
    noiseSize: { x: 1, y: 1 },
    density: 0.75,
    opacity: 0.5,
    seed: 12
  }
}

const texture: Effect = {
  type: 'TEXTURE',
  color: { r: 0, g: 0, b: 0, a: 1 },
  radius: 6,
  visible: true,
  blendMode: 'NORMAL',
  texture: { noiseSize: { x: 4, y: 4 }, clipToShape: true, seed: 3 }
}

function grainNode(graph: SceneGraph): void {
  graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    name: 'Grain',
    width: 120,
    height: 80,
    effects: [noise, duotone, multitone, texture]
  })
}

describe('grain effects in .fig files', () => {
  beforeAll(async () => {
    await initCodec()
  })

  test('noise and texture effects survive an export and reimport', async () => {
    const graph = new SceneGraph()
    grainNode(graph)
    const restored = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
    const node = collectAllNodes(restored).find((candidate) => candidate.name === 'Grain')
    expect(node?.effects).toEqual([noise, duotone, multitone, texture])
  })

  test('a duotone without a second colour writes its first', async () => {
    const graph = new SceneGraph()
    graph.createNode('RECTANGLE', graph.getPages()[0].id, {
      name: 'Duo',
      width: 40,
      height: 40,
      effects: [
        {
          type: 'NOISE',
          color: { r: 0.25, g: 0.5, b: 0.75, a: 0.5 },
          visible: true,
          noise: { noiseType: 'DUOTONE', noiseSize: { x: 1, y: 1 }, density: 0.5 }
        }
      ]
    })
    const restored = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
    const node = collectAllNodes(restored).find((candidate) => candidate.name === 'Duo')
    expect(node?.effects[0]).toMatchObject({
      type: 'NOISE',
      noise: { secondaryColor: { r: 0.25, g: 0.5, b: 0.75, a: 0.5 } }
    })
  })
})
