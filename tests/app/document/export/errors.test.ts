import { describe, expect, test } from 'bun:test'

import { BUILTIN_IO_FORMATS, IORegistry, type ExportRequest } from '@pairdraw/core/io'
import { SceneGraph } from '@pairdraw/scene-graph'

import { exportErrorDetail } from '@/app/document/export/errors'

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** The export failure messages, each replaced by its own key, so a translated detail is plain. */
function keyedMessages() {
  return { exportNothing: 'exportNothing', exportSinglePage: 'exportSinglePage' }
}

/** What Core throws when it exports `target` of `graph` as SVG. */
async function exportFailure(graph: SceneGraph, target: ExportRequest['target']): Promise<unknown> {
  try {
    await io.exportContent('svg', { graph, target })
  } catch (error) {
    return error
  }
  throw new Error('The export went through')
}

describe('export failure details', () => {
  test("say Core's export of nothing in the app's language", async () => {
    const graph = new SceneGraph()
    const error = await exportFailure(graph, { scope: 'selection', nodeIds: [] })
    expect(exportErrorDetail(error, keyedMessages())).toBe('exportNothing')
  })

  test("say Core's export across pages in the app's language", async () => {
    const graph = new SceneGraph()
    const first = graph.createNode('RECTANGLE', graph.getPages()[0].id, { width: 10, height: 10 })
    const other = graph.addPage('Page 2')
    const second = graph.createNode('RECTANGLE', other.id, { width: 10, height: 10 })
    const error = await exportFailure(graph, {
      scope: 'selection',
      nodeIds: [first.id, second.id]
    })
    expect(exportErrorDetail(error, keyedMessages())).toBe('exportSinglePage')
  })

  test('keep any other error in its own words', () => {
    expect(exportErrorDetail(new Error('Disk full'), keyedMessages())).toBe('Disk full')
    expect(exportErrorDetail('Disk full', keyedMessages())).toBe('Disk full')
  })
})
