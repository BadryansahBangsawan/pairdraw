import { describe, expect, mock, spyOn, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'
import { exportFramesToPDF, pdfFrameIds } from '@/app/shell/menu/actions/pdf'

import { asDouble } from '#tests/helpers/doubles'

function slides() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = (name: string, visible = true) =>
    graph.createNode('FRAME', page.id, { name, width: 100, height: 50, visible }).id
  const first = frame('First')
  const second = frame('Second')
  const hidden = frame('Hidden', false)
  const third = frame('Third')
  const nested = graph.createNode('RECTANGLE', second, { name: 'Inside second' }).id
  return { graph, pageId: page.id, first, second, hidden, third, nested }
}

describe('pdfFrameIds', () => {
  test('puts every visible top-level frame on a page, in layer order, when nothing is selected', () => {
    const { graph, pageId, first, second, third } = slides()
    expect(pdfFrameIds(graph, pageId, [])).toEqual([first, second, third])
  })

  test('leaves loose shapes, text, and groups out of the page’s frames', () => {
    const { graph, pageId, first, second, third } = slides()
    graph.createNode('RECTANGLE', pageId, { name: 'Loose shape' })
    graph.createNode('TEXT', pageId, { name: 'Loose text' })
    graph.createNode('GROUP', pageId, { name: 'Loose group' })
    expect(pdfFrameIds(graph, pageId, [])).toEqual([first, second, third])
  })

  test('takes frames from inside sections, and components and instances as frames', () => {
    const { graph, pageId, first, second, third } = slides()
    const section = graph.createNode('SECTION', pageId, { name: 'Section' }).id
    const inSection = graph.createNode('FRAME', section, { name: 'In section' }).id
    graph.createNode('RECTANGLE', section, { name: 'Shape in section' })
    const hiddenSection = graph.createNode('SECTION', pageId, { visible: false }).id
    graph.createNode('FRAME', hiddenSection, { name: 'In hidden section' })
    const component = graph.createNode('COMPONENT', pageId, { name: 'Component' }).id
    expect(pdfFrameIds(graph, pageId, [])).toEqual([first, second, third, inSection, component])
  })

  test('has no frames for a page of loose shapes', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    graph.createNode('RECTANGLE', pageId, { name: 'Loose shape' })
    expect(pdfFrameIds(graph, pageId, [])).toEqual([])
  })

  test('puts the selected layers in layer order, whatever order they were selected in', () => {
    const { graph, pageId, first, third, nested } = slides()
    expect(pdfFrameIds(graph, pageId, [third, nested, first])).toEqual([first, nested, third])
  })

  test('exports a hidden layer the person selected', () => {
    const { graph, pageId, hidden } = slides()
    expect(pdfFrameIds(graph, pageId, [hidden])).toEqual([hidden])
  })

  test('leaves out layers that are not on the page', () => {
    const { graph, pageId, first } = slides()
    const otherPage = graph.addPage('Other')
    const elsewhere = graph.createNode('FRAME', otherPage.id, { name: 'Elsewhere' }).id
    expect(pdfFrameIds(graph, pageId, [elsewhere, first, 'missing'])).toEqual([first])
  })
})

describe('exportFramesToPDF', () => {
  function storeFor(graph: SceneGraph, pageId: string, selected: string[]) {
    const exportTarget = mock(async () => undefined)
    const store = asDouble<EditorStore>({
      graph,
      state: { currentPageId: pageId, selectedIds: new Set(selected) },
      exportTarget
    })
    return { store, exportTarget }
  }

  test('exports the frames as one PDF', async () => {
    const { graph, pageId, first, second, third } = slides()
    const { store, exportTarget } = storeFor(graph, pageId, [])
    await exportFramesToPDF(store)
    expect(exportTarget).toHaveBeenCalledWith(
      { scope: 'selection', nodeIds: [first, second, third] },
      'pdf'
    )
  })

  test('exports nothing from a page without frames', async () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    graph.createNode('RECTANGLE', pageId, { name: 'Loose shape' })
    const { store, exportTarget } = storeFor(graph, pageId, [])
    await exportFramesToPDF(store)
    expect(exportTarget).not.toHaveBeenCalled()
  })

  test('reports a failed export instead of rejecting', async () => {
    const { graph, pageId } = slides()
    const { store, exportTarget } = storeFor(graph, pageId, [])
    exportTarget.mockImplementation(async () => {
      throw new Error('No visible nodes to export')
    })
    const errors = spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(exportFramesToPDF(store)).resolves.toBeUndefined()
      expect(errors).toHaveBeenCalled()
    } finally {
      errors.mockRestore()
    }
  })
})
