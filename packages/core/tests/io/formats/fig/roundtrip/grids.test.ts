import { beforeAll, describe, expect, test } from 'bun:test'

import { FIXTURES } from '#core-tests/helpers/fig/fixtures'
import { HEAVY_TEST_TIMEOUT_MS } from '#core-tests/helpers/test-utils'

import { createEditor } from '@pairdraw/core'
import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

function nodeNamed(graph: SceneGraph, name: string, layoutMode?: string): SceneNode {
  const node = [...graph.getAllNodes()].find(
    (candidate) =>
      candidate.name === name && (!layoutMode || candidate.layoutMode === layoutMode)
  )
  if (!node) throw new Error(`No node named ${name}`)
  return node
}

function placement(
  graph: SceneGraph,
  parent: SceneNode
): Array<[string, SceneNode['gridPosition']]> {
  return graph
    .getChildren(parent.id)
    .map((child) => [child.name, child.gridPosition])
}

beforeAll(async () => {
  await initCodec()
})

describe('grids in a Figma file', () => {
  test('read a real frame and keep it through a save and reopen', async () => {
    const original = await parseFigFile(
      await Bun.file(`${FIXTURES}/material3.fig`).arrayBuffer()
    )
    const frame = nodeNamed(original, 'Building Blocks/Standard/Icon button toggleable', 'GRID')
    expect(frame.gridTemplateRows).toHaveLength(2)
    expect(frame.gridTemplateColumns).toHaveLength(5)
    expect(frame.gridRowGap).toBe(10)
    expect(frame.gridColumnGap).toBe(10)
    expect(frame.gridTemplateColumns.map((track) => track.sizing)).toEqual([
      'FR',
      'FR',
      'FR',
      'FR',
      'FR'
    ])
    expect(placement(original, frame).every(([, cell]) => cell !== null)).toBe(true)

    const reopened = await parseFigFile((await exportFigFile(original)).slice().buffer)
    const saved = nodeNamed(reopened, 'Building Blocks/Standard/Icon button toggleable', 'GRID')
    expect(saved.gridTemplateRows).toEqual(frame.gridTemplateRows)
    expect(saved.gridTemplateColumns).toEqual(frame.gridTemplateColumns)
    expect(saved.gridRowGap).toBe(10)
    expect(saved.gridColumnGap).toBe(10)
    expect(placement(reopened, saved)).toEqual(placement(original, frame))
  })

  test('write and reopen tracks, gaps, spans, and placement authored in Pairdraw', async () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', page, {
      name: 'Grid',
      width: 300,
      height: 200,
      layoutMode: 'GRID',
      gridTemplateColumns: [
        { sizing: 'FIXED', value: 96 },
        { sizing: 'FR', value: 1 }
      ],
      gridTemplateRows: [
        { sizing: 'AUTO', value: 0 },
        { sizing: 'FIXED', value: 64 }
      ],
      gridColumnGap: 12,
      gridRowGap: 20
    })
    editor.graph.createNode('RECTANGLE', frame.id, {
      name: 'Corner',
      gridPosition: { row: 0, column: 0, rowSpan: 1, columnSpan: 2 }
    })
    editor.graph.createNode('RECTANGLE', frame.id, {
      name: 'Tall',
      gridPosition: { row: 1, column: 1, rowSpan: 2, columnSpan: 1 }
    })

    const reopened = await parseFigFile((await exportFigFile(editor.graph)).slice().buffer)
    const saved = nodeNamed(reopened, 'Grid')
    expect(saved.layoutMode).toBe('GRID')
    expect(saved.gridTemplateColumns).toEqual(frame.gridTemplateColumns)
    expect(saved.gridTemplateRows).toEqual(frame.gridTemplateRows)
    expect(saved.gridColumnGap).toBe(12)
    expect(saved.gridRowGap).toBe(20)
    expect(placement(reopened, saved)).toEqual(placement(editor.graph, frame))
  })
})

const GRID_FRAME = 'Building Blocks/Standard/Icon button toggleable'

function recordOf(records: ReturnType<typeof parseFigBuffer>['nodeChanges'], guid?: string) {
  return records.find((record) => {
    const value = record.guid
    return value !== undefined && guid !== undefined && `${value.sessionID}:${value.localID}` === guid
  })
}

describe('editing a grid after import', () => {
  test('moves a child of a real grid to another cell and keeps it through a save', async () => {
    const original = await parseFigFile(
      await Bun.file(`${FIXTURES}/material3.fig`).arrayBuffer()
    )
    const frame = nodeNamed(original, GRID_FRAME, 'GRID')
    const child = original.getChildren(frame.id)[4]
    original.updateNode(child.id, {
      gridPosition: { row: 1, column: 4, rowSpan: 1, columnSpan: 1 }
    })

    const reopened = await parseFigFile((await exportFigFile(original)).slice().buffer)
    const saved = nodeNamed(reopened, GRID_FRAME, 'GRID')
    const moved = reopened.getChildren(saved.id).find((node) => node.name === child.name)

    expect(moved?.gridPosition).toEqual({ row: 1, column: 4, rowSpan: 1, columnSpan: 1 })
  }, HEAVY_TEST_TIMEOUT_MS)

  test('switches a real grid to horizontal and clears its grid fields', async () => {
    const original = await parseFigFile(
      await Bun.file(`${FIXTURES}/material3.fig`).arrayBuffer()
    )
    const frame = nodeNamed(original, GRID_FRAME, 'GRID')
    original.updateNode(frame.id, { layoutMode: 'HORIZONTAL' })
    const records = parseFigBuffer((await exportFigFile(original)).slice().buffer).nodeChanges
    const saved = recordOf(records, frame.source.id ?? undefined)
    expect(saved?.stackMode).toBe('HORIZONTAL')
    expect(saved?.gridRowGap ?? 0).toBe(0)
    expect(saved?.gridColumnGap ?? 0).toBe(0)
    for (const child of original.getChildren(frame.id)) {
      const childRecord = records.find(
        (record) =>
          record.name === child.name &&
          record.parentIndex?.guid !== undefined &&
          `${record.parentIndex.guid.sessionID}:${record.parentIndex.guid.localID}` === frame.source.id
      )
      expect(childRecord?.gridRowAnchor ?? { sessionID: 0, localID: 0 }).toEqual({
        sessionID: 0,
        localID: 0
      })
      expect(childRecord?.gridColumnAnchor ?? { sessionID: 0, localID: 0 }).toEqual({
        sessionID: 0,
        localID: 0
      })
    }
  })

  test('reopens an instance of a grid component with its children in their cells', async () => {
    const editor = createEditor()
    const page = editor.state.currentPageId
    const component = editor.graph.createNode('COMPONENT', page, {
      name: 'Grid component',
      width: 200,
      height: 100,
      layoutMode: 'GRID',
      gridTemplateColumns: [
        { sizing: 'FR', value: 1 },
        { sizing: 'FR', value: 1 }
      ],
      gridTemplateRows: [{ sizing: 'FR', value: 1 }],
      gridColumnGap: 6,
      gridRowGap: 6
    })
    editor.graph.createNode('RECTANGLE', component.id, {
      name: 'Right',
      gridPosition: { row: 0, column: 1, rowSpan: 1, columnSpan: 1 }
    })
    editor.graph.createNode('RECTANGLE', component.id, {
      name: 'Left',
      gridPosition: { row: 0, column: 0, rowSpan: 1, columnSpan: 1 }
    })
    editor.graph.createInstance(component.id, page)

    const reopened = await parseFigFile((await exportFigFile(editor.graph)).slice().buffer)
    const instance = [...reopened.getAllNodes()].find(
      (node) => node.type === 'INSTANCE' && node.name === 'Grid component'
    )
    expect(instance).toBeDefined()
    expect(
      reopened.getChildren(instance?.id ?? '').map((node) => [node.name, node.gridPosition])
    ).toEqual([
      ['Right', { row: 0, column: 1, rowSpan: 1, columnSpan: 1 }],
      ['Left', { row: 0, column: 0, rowSpan: 1, columnSpan: 1 }]
    ])
  })
})
