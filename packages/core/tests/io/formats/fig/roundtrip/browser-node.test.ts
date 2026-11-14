import { expect, setDefaultTimeout, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { collectAllNodes } from '#core-tests/helpers/fig/traversal'
import { toUint8Array } from 'js-base64'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph, type PluginDataEntry } from '@pairdraw/scene-graph'
import {
  readBrowserNode,
  withBrowserNode,
  type BrowserNodeRecord
} from '@pairdraw/scene-graph/browser-node'
import { computeImageHash } from '@pairdraw/scene-graph/images'
import {
  PAIRDRAW_PLUGIN_DATA,
  PAIRDRAW_PLUGIN_ID
} from '@pairdraw/scene-graph/plugin-data'

setDefaultTimeout(60_000)

/** A 1 × 1 PNG. The archive stores it under the SHA-1 of these bytes. */
const PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)

const RECORD: BrowserNodeRecord = {
  url: 'https://example.com/docs',
  width: 390,
  height: 844,
  preset: 'iphone-14',
  refreshedAt: '2026-11-13T00:00:00.000Z'
}

function pageLayer(graph: SceneGraph, name: string, pluginData: PluginDataEntry[]) {
  const hash = computeImageHash(PNG)
  graph.images.set(hash, PNG)
  return graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    name,
    width: 390,
    height: 844,
    fills: [
      {
        type: 'IMAGE',
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        imageHash: hash,
        imageScaleMode: 'FILL'
      }
    ],
    pluginData
  })
}

test('a browser snapshot keeps its page and its picture through a .fig archive', async () => {
  await initCodec()
  const graph = new SceneGraph()
  const node = pageLayer(graph, 'Browser', [])
  graph.updateNode(node.id, { pluginData: withBrowserNode(node, RECORD) })

  const read = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  const copy = expectDefined(
    collectAllNodes(read).find((candidate) => candidate.name === 'Browser'),
    'browser layer'
  )
  const hash = computeImageHash(PNG)

  expect(readBrowserNode(copy)).toEqual(RECORD)
  expect(copy.fills[0]).toMatchObject({ type: 'IMAGE', imageHash: hash })
  expect(read.images.get(hash)).toEqual(PNG)
})

test('a file address is dropped on open and the picture stays', async () => {
  await initCodec()
  const graph = new SceneGraph()
  pageLayer(graph, 'Leaked', [
    {
      pluginId: PAIRDRAW_PLUGIN_ID,
      key: PAIRDRAW_PLUGIN_DATA.browserNode.key,
      value: JSON.stringify({ ...RECORD, url: 'file:///etc/passwd' })
    }
  ])

  const read = await parseFigFile((await exportFigFile(graph)).buffer as ArrayBuffer)
  const copy = expectDefined(
    collectAllNodes(read).find((candidate) => candidate.name === 'Leaked'),
    'image layer'
  )

  expect(readBrowserNode(copy)).toBeNull()
  expect(
    copy.pluginData.some((entry) => entry.key === PAIRDRAW_PLUGIN_DATA.browserNode.key)
  ).toBe(false)
  expect(copy.fills[0]).toMatchObject({ type: 'IMAGE', imageHash: computeImageHash(PNG) })
  expect(JSON.stringify(copy.pluginData)).not.toContain('file:')
})
