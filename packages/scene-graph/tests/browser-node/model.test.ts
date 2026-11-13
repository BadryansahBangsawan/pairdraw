import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'
import {
  readBrowserNode,
  settleBrowserNodeData,
  withBrowserNode,
  type BrowserNodeRecord
} from '@open-pencil/scene-graph/browser-node'
import {
  OPEN_PENCIL_PLUGIN_DATA,
  OPEN_PENCIL_PLUGIN_ID
} from '@open-pencil/scene-graph/plugin-data'

const RECORD: BrowserNodeRecord = {
  url: 'https://example.com/docs',
  width: 390,
  height: 844,
  preset: 'iphone-14',
  refreshedAt: '2026-11-13T00:00:00.000Z'
}

function layer() {
  const graph = new SceneGraph()
  return graph.createNode('RECTANGLE', graph.getPages()[0].id, {
    name: 'Page',
    width: 390,
    height: 844
  })
}

describe('browser node data', () => {
  test('a layer keeps a page snapshot and reads it back', () => {
    const node = layer()
    const pluginData = withBrowserNode(node, RECORD)
    expect(readBrowserNode({ pluginData })).toEqual(RECORD)
    expect(withBrowserNode({ pluginData }, null)).toEqual([])
  })

  test('a file address, a bare host, and a clock reading are not a snapshot', () => {
    const node = layer()
    for (const url of ['file:///etc/passwd', 'example.com', 'https://example.com']) {
      expect(withBrowserNode(node, { ...RECORD, url })).toEqual([])
    }
    expect(withBrowserNode(node, { ...RECORD, refreshedAt: '2026-11-13' })).toEqual([])
    expect(withBrowserNode(node, { ...RECORD, width: 0 })).toEqual([])
  })

  test('opening drops a snapshot whose address is not a page and keeps every other entry', () => {
    const other = { pluginId: 'pen', key: 'pen/url', value: '"file:///etc/passwd"' }
    const bad = {
      pluginId: OPEN_PENCIL_PLUGIN_ID,
      key: OPEN_PENCIL_PLUGIN_DATA.browserNode.key,
      value: JSON.stringify({ ...RECORD, url: 'file:///etc/passwd' })
    }
    const settled = settleBrowserNodeData([other, bad])
    expect(settled).toEqual([other])
    expect(readBrowserNode({ pluginData: settled })).toBeNull()
    expect(settleBrowserNodeData([other, { ...bad, value: JSON.stringify(RECORD) }])).toHaveLength(
      2
    )
  })
})
