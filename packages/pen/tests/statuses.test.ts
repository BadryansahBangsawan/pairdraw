import { describe, expect, test } from 'bun:test'

import { parsePenDocument, parsePenFile, writePenDocument } from '@pairdraw/pen'
import {
  createDesignMemory,
  readDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'
import {
  STATUS_WORKFLOW_PRESETS,
  readStatusWorkflow,
  writeStatusWorkflow
} from '@pairdraw/scene-graph/statuses'

import { parseDocument } from './helpers/document'

const PAGE = [{ id: 'screen', type: 'frame' as const, width: 100, height: 100 }]

/** A graph with a review workflow, a status on the page's frame, and a memory beside them. */
function graphWithStatuses() {
  const graph = parseDocument(PAGE)
  writeStatusWorkflow(graph, STATUS_WORKFLOW_PRESETS.review)
  graph.updateNode('screen', { status: 'in-review' })
  return graph
}

describe('a .pen file keeps the status workflow', () => {
  test('the document’s workflow and a layer’s status survive save and reload', () => {
    const reopened = parsePenFile(writePenDocument(graphWithStatuses()))

    expect(readStatusWorkflow(reopened)).toEqual(STATUS_WORKFLOW_PRESETS.review)
    expect(reopened.getNode('screen')?.status).toBe('in-review')
  })

  test('the written file holds the workflow and the layer status as fields', () => {
    const document = parsePenDocument(writePenDocument(graphWithStatuses()))

    expect(document.statuses).toEqual(STATUS_WORKFLOW_PRESETS.review)
    expect(document.children[0]?.status).toBe('in-review')
  })

  test('a document that never chose statuses gains no field on save', () => {
    const document = parsePenDocument(writePenDocument(parseDocument(PAGE)))

    expect(document.statuses).toBeUndefined()
    expect(document.children[0]?.status).toBeUndefined()
  })

  test('an unreadable workflow leaves the document readable with the default statuses', () => {
    const graph = parseDocument(PAGE, { statuses: { states: 'nope' } as never })

    expect(readStatusWorkflow(graph)).toEqual(STATUS_WORKFLOW_PRESETS.handoff)
    expect(parsePenDocument(writePenDocument(graph)).statuses).toBeUndefined()
  })

  test('an unreadable layer status leaves the document readable without a status', () => {
    const graph = parseDocument([
      { id: 'screen', type: 'frame', width: 100, height: 100, status: 42 } as never
    ])

    expect(graph.getNode('screen')?.status).toBeNull()
  })

  test('a status sits beside the design memory and token links', () => {
    const graph = graphWithStatuses()
    writeDesignMemory(graph, createDesignMemory())
    const reopened = parsePenFile(writePenDocument(graph))
    const document = parsePenDocument(writePenDocument(graph))

    expect(readStatusWorkflow(reopened)).toEqual(STATUS_WORKFLOW_PRESETS.review)
    expect(readDesignMemory(reopened)).toEqual(createDesignMemory())
    expect(document.statuses).toEqual(STATUS_WORKFLOW_PRESETS.review)
    expect(document.designMemory).toEqual(createDesignMemory())
  })
})
