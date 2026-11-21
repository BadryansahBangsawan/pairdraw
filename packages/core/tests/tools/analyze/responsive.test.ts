import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { ALL_TOOLS } from '@pairdraw/core/tools'
import { SceneGraph } from '@pairdraw/scene-graph'

function tool(name: string) {
  const def = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!def) throw new Error(`Missing tool ${name}`)
  return def
}

interface Rendered {
  width: number
  pageId: string
  nodeIds: string[]
  graphWidth: number
}

function setup() {
  const graph = new SceneGraph()
  const figma = new FigmaAPI(graph)
  const rendered: Rendered[] = []
  figma.exportGraphImage = async (copy, pageId, nodeIds, options) => {
    const node = copy.getNode(nodeIds[0] ?? '')
    rendered.push({ width: options.scale ?? 1, pageId, nodeIds, graphWidth: node?.width ?? 0 })
    return new Uint8Array([1, 2, 3])
  }
  const pageId = graph.getPages()[0].id
  const screen = graph.createNode('FRAME', pageId, {
    name: 'Screen',
    x: 0,
    y: 0,
    width: 1024,
    height: 600
  })
  return { graph, figma, pageId, screen, rendered }
}

function run(figma: FigmaAPI, args: Record<string, unknown>) {
  return tool('check_responsive').execute(figma, args) as {
    id?: string
    name?: string
    widths?: Array<{
      width: number
      height: number
      base64: string
      byteLength: number
      warnings: Array<{ kind: string; severity: string; node_id: string }>
    }>
    warningCount?: number
    error?: string
  }
}

describe('check_responsive tool', () => {
  test('lays out a copy at each width and leaves the document alone', async () => {
    const { graph, figma, screen, rendered } = setup()

    const result = await run(figma, { id: screen.id })

    expect(result.widths?.map((entry) => entry.width)).toEqual([375, 768, 1280])
    expect(result.widths?.[0]?.base64).toBe('AQID')
    expect(result.widths?.[0]?.byteLength).toBe(3)
    expect(rendered.map((entry) => entry.graphWidth)).toEqual([375, 768, 1280])
    expect(getNodeOrThrow(graph, screen.id).width).toBe(1024)
  })

  test('reports the height a hugging frame takes at each width', async () => {
    const { graph, figma, pageId } = setup()
    const column = graph.createNode('FRAME', pageId, {
      name: 'Column',
      width: 400,
      height: 100,
      layoutMode: 'VERTICAL',
      primaryAxisSizing: 'HUG'
    })
    graph.createNode('FRAME', column.id, { name: 'A', width: 100, height: 40 })
    graph.createNode('FRAME', column.id, { name: 'B', width: 100, height: 60 })

    const result = await run(figma, { id: column.id, widths: [320] })

    expect(result.widths?.[0]).toMatchObject({ width: 320, height: 100 })
    expect(getNodeOrThrow(graph, column.id).height).toBe(100)
  })

  test('flags a child that falls outside the resized frame', async () => {
    const { graph, figma, screen } = setup()
    const banner = graph.createNode('FRAME', screen.id, {
      name: 'Wide banner',
      x: 900,
      width: 400,
      height: 40
    })

    const result = await run(figma, { id: screen.id, widths: [768] })

    expect(result.widths?.[0]?.warnings).toContainEqual(
      expect.objectContaining({ kind: 'child-outside-frame', node_id: banner.id })
    )
    expect(getNodeOrThrow(graph, banner.id).x).toBe(900)
  })

  test('flags overlapping siblings at the tested width', async () => {
    const { graph, figma, screen } = setup()
    graph.createNode('FRAME', screen.id, { name: 'Left', x: 0, y: 0, width: 200, height: 100 })
    const right = graph.createNode('FRAME', screen.id, {
      name: 'Right',
      x: 100,
      y: 0,
      width: 200,
      height: 100
    })

    const result = await run(figma, { id: screen.id, widths: [768] })

    expect(result.widths?.[0]?.warnings).toContainEqual(
      expect.objectContaining({ kind: 'sibling-overlap', node_id: right.id })
    )
  })

  test('flags text that no longer fits its fixed box', async () => {
    const { graph, figma, screen } = setup()
    const copy = graph.createNode('TEXT', screen.id, {
      name: 'Body',
      x: 0,
      y: 0,
      width: 100,
      height: 10,
      text: 'A sentence long enough to wrap many times over inside a hundred pixel box.',
      fontSize: 16,
      textAutoResize: 'NONE'
    })

    const result = await run(figma, { id: screen.id, widths: [768] })

    expect(result.widths?.[0]?.warnings).toContainEqual(
      expect.objectContaining({ kind: 'text-overflow', node_id: copy.id })
    )
  })

  test('counts intentional truncation separately from overflow', async () => {
    const { graph, figma, screen } = setup()
    const title = graph.createNode('TEXT', screen.id, {
      name: 'Title',
      x: 0,
      y: 0,
      width: 80,
      height: 20,
      text: 'A headline that runs past the box it was given',
      fontSize: 16,
      textAutoResize: 'TRUNCATE'
    })

    const result = await run(figma, { id: screen.id, widths: [768] })

    const warning = result.widths?.[0]?.warnings.find((entry) => entry.node_id === title.id)
    expect(warning).toMatchObject({ kind: 'text-truncated', severity: 'info' })
  })

  test('rejects an unknown node and a node that is not a frame', async () => {
    const { graph, figma, pageId } = setup()
    const text = graph.createNode('TEXT', pageId, { name: 'Label', text: 'Hi', width: 40, height: 20 })

    expect(await run(figma, { id: '999:999' })).toMatchObject({ error: expect.any(String) })
    expect(await run(figma, { id: text.id })).toMatchObject({ error: expect.any(String) })
  })

  test('reports when no renderer is available instead of returning partial images', async () => {
    const graph = new SceneGraph()
    const figma = new FigmaAPI(graph)
    const screen = graph.createNode('FRAME', graph.getPages()[0].id, {
      name: 'Screen',
      width: 400,
      height: 300
    })

    expect(await run(figma, { id: screen.id })).toMatchObject({ error: expect.any(String) })
  })
})
