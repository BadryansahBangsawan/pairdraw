import { beforeAll, describe, expect, test } from 'bun:test'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type PrototypeOverlayPositionType } from '@pairdraw/scene-graph'

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const PLACEMENTS: readonly PrototypeOverlayPositionType[] = [
  'CENTER',
  'TOP_LEFT',
  'TOP_CENTER',
  'TOP_RIGHT',
  'BOTTOM_LEFT',
  'BOTTOM_CENTER',
  'BOTTOM_RIGHT'
]

function overlayDocument(placement: PrototypeOverlayPositionType) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const screen = graph.createNode('FRAME', page, { name: 'Screen', width: 300, height: 300 })
  const card = graph.createNode('FRAME', page, { name: 'Card', x: 400, width: 100, height: 100 })
  graph.updateNode(screen.id, {
    prototypeReactions: [
      {
        id: '2:7',
        trigger: { type: 'ON_CLICK', delay: 0 },
        actions: [
          {
            type: 'NODE',
            nodeId: card.id,
            navigation: 'OVERLAY',
            transition: { type: 'INSTANT', duration: 0 },
            overlayPosition: placement
          }
        ]
      }
    ]
  })
  return { graph, screen, card }
}

function recordNamed(bytes: Uint8Array, name: string) {
  return parseFigBuffer(uint8ArrayToArrayBuffer(bytes)).nodeChanges.find(
    (record) => record.name === name
  )
}

function actionOf(graph: SceneGraph, name: string) {
  const node = [...graph.getAllNodes()].find((candidate) => candidate.name === name)
  if (!node) throw new Error(`Missing ${name}`)
  return node.prototypeReactions[0]?.actions[0]
}

describe('.fig overlay placement round trip', () => {
  beforeAll(async () => {
    await initCodec()
  })

  for (const placement of PLACEMENTS) {
    test(`keeps an overlay the file places at ${placement}`, async () => {
      const { graph } = overlayDocument(placement)
      const bytes = await exportFigFile(graph)
      expect(recordNamed(bytes, 'Card')?.overlayPositionType).toBe(placement)

      const reopened = await parseFigFile(uint8ArrayToArrayBuffer(bytes), { populate: 'all' })
      expect(actionOf(reopened, 'Screen')).toMatchObject({ overlayPosition: placement })
    })
  }

  test('editing the overlay frame keeps the placement the file recorded', async () => {
    const { graph } = overlayDocument('TOP_RIGHT')
    const reopened = await parseFigFile(uint8ArrayToArrayBuffer(await exportFigFile(graph)), {
      populate: 'all'
    })
    const card = [...reopened.getAllNodes()].find((node) => node.name === 'Card')
    if (!card) throw new Error('Missing Card')
    reopened.updateNode(card.id, { name: 'Card renamed' })

    const record = recordNamed(await exportFigFile(reopened), 'Card renamed')
    expect(record?.navigationType).toBe('OVERLAY')
    expect(record?.overlayPositionType).toBe('TOP_RIGHT')
  })
})
