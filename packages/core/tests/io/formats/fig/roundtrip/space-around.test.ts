import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import { guid } from '#core-tests/helpers/fig/guid'

import { exportFigFile, parseFigFile, populateFigPage } from '@pairdraw/core/io/formats/fig'
import { materializeDocument, parseFigBuffer } from '@pairdraw/fig'
import { initCodec, type NodeChange } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'
import { hasInstanceOverride, recordInstanceOverride } from '@pairdraw/scene-graph/instances'
import { PAIRDRAW_PLUGIN_ID } from '@pairdraw/scene-graph/plugin-data'

const AROUND_ENTRY = {
  pluginID: PAIRDRAW_PLUGIN_ID,
  key: 'primaryAxisAlign',
  value: 'SPACE_AROUND'
}

function rowRecord(fields: Partial<NodeChange>): NodeChange[] {
  return [
    { guid: guid(1), type: 'DOCUMENT' },
    { guid: guid(2), type: 'CANVAS', parentIndex: { guid: guid(1), position: '!' } },
    {
      guid: guid(3),
      type: 'FRAME',
      name: 'Row',
      parentIndex: { guid: guid(2), position: '!' },
      stackMode: 'HORIZONTAL',
      stackPrimarySizing: 'FIXED',
      stackCounterSizing: 'FIXED',
      size: { x: 300, y: 40 },
      ...fields
    }
  ]
}

async function exportedRow(graph: SceneGraph): Promise<NodeChange | undefined> {
  const bytes = await exportFigFile(graph)
  return parseFigBuffer(bytes.buffer as ArrayBuffer).nodeChanges.find((nc) => nc.name === 'Row')
}

describe('roundtrip: space around', () => {
  beforeAll(async () => {
    await initCodec()
  })

  test('is written as Figma space between with plugin data, and read back as space around', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Row',
      width: 300,
      height: 40,
      layoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'SPACE_AROUND',
      itemSpacing: 8
    })

    const bytes = await exportFigFile(graph)
    const record = parseFigBuffer(bytes.buffer as ArrayBuffer).nodeChanges.find(
      (nc) => nc.name === 'Row'
    )
    expect(record?.stackPrimaryAlignItems).toBe('SPACE_BETWEEN')
    expect(record?.pluginData).toContainEqual(AROUND_ENTRY)

    const reImported = await parseFigFile(bytes.buffer as ArrayBuffer)
    const [reImportedPage] = reImported.getPages()
    populateFigPage(reImported, reImportedPage.id)
    const [row] = reImported.getChildren(reImportedPage.id)
    expect(row).toMatchObject({ primaryAxisAlign: 'SPACE_AROUND', itemSpacing: 8 })
  })

  test('a record Figma changed to another alignment keeps that alignment', () => {
    const { graph, sources } = materializeDocument(
      rowRecord({ stackPrimaryAlignItems: 'CENTER', pluginData: [AROUND_ENTRY] })
    )
    expect(graph.getNode(sources.get('1:3') ?? '')?.primaryAxisAlign).toBe('CENTER')
  })

  test('changing an imported row away from space around drops the plugin data', async () => {
    const { graph, sources } = materializeDocument(
      rowRecord({ stackPrimaryAlignItems: 'SPACE_BETWEEN', pluginData: [AROUND_ENTRY] })
    )
    const id = sources.get('1:3')
    if (!id) throw new Error('Missing row')
    expect(graph.getNode(id)?.primaryAxisAlign).toBe('SPACE_AROUND')
    expect((await exportedRow(graph))?.pluginData).toContainEqual(AROUND_ENTRY)

    graph.updateNode(id, { primaryAxisAlign: 'SPACE_BETWEEN' })
    const record = await exportedRow(graph)
    expect(record?.stackPrimaryAlignItems).toBe('SPACE_BETWEEN')
    expect(record?.pluginData ?? []).not.toContainEqual(AROUND_ENTRY)
  })

  test('an instance override from space around to space between survives reopening', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const card = graph.createNode('COMPONENT', page, { name: 'Card', width: 300, height: 60 })
    graph.createNode('FRAME', card.id, {
      name: 'Row',
      width: 300,
      height: 40,
      layoutMode: 'HORIZONTAL',
      primaryAxisAlign: 'SPACE_AROUND'
    })
    const instance = expectDefined(graph.createInstance(card.id, page))
    expectDefined(graph.createInstance(card.id, page))
    const [copy] = graph.getChildren(instance.id)
    graph.updateNode(copy.id, { primaryAxisAlign: 'SPACE_BETWEEN' })
    recordInstanceOverride(graph, copy.id, ['primaryAxisAlign'])

    const reopened = await parseFigFile((await exportFigFile(graph)).slice().buffer)
    const nodes = [...reopened.getAllNodes()]
    const component = expectDefined(nodes.find((node) => node.type === 'COMPONENT'))
    const [overridden, plain] = nodes.filter((node) => node.type === 'INSTANCE')
    const [componentRow] = reopened.getChildren(component.id)
    const [reopenedCopy] = reopened.getChildren(overridden.id)
    const [plainCopy] = reopened.getChildren(plain.id)
    expect(componentRow.primaryAxisAlign).toBe('SPACE_AROUND')
    expect(plainCopy.primaryAxisAlign).toBe('SPACE_AROUND')
    expect(reopenedCopy.primaryAxisAlign).toBe('SPACE_BETWEEN')
    expect(hasInstanceOverride(reopened, reopenedCopy.id, 'primaryAxisAlign')).toBe(true)
  })
})
