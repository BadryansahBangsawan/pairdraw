import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { createAutomationCommandHandlers } from '@/app/automation/bridge/handlers'
import type { AutomationTarget } from '@/app/automation/bridge/target'
import { createEditorStore, type EditorStore } from '@/app/editor/session/create'

/**
 * Seam: a tool sets the selection, then a later tool reads it back through a new API.
 * Catches a selection that the tool reports but the editor, the canvas, and the next
 * read never take. Misses the pixels of the selection handles, which the e2e covers.
 */

const { handleTargetCommand } = createAutomationCommandHandlers(makeFigmaFromStore)
let stores: EditorStore[] = []

const selectedSchema = v.object({
  ok: v.literal(true),
  result: v.object({ selected: v.array(v.string()) })
})

const readSchema = v.object({
  ok: v.literal(true),
  result: v.object({
    selection: v.array(v.object({ id: v.string() }))
  })
})

beforeEach(() => {
  // The automation FigmaAPI reads the viewport size from the window.
  Object.assign(globalThis, { window: { innerWidth: 1024, innerHeight: 768 } })
})

afterEach(() => {
  for (const store of stores) store.dispose()
  stores = []
  Reflect.deleteProperty(globalThis, 'window')
})

function target(store: EditorStore): AutomationTarget {
  const pageId = store.state.currentPageId
  return {
    store,
    documentId: 'tab-1',
    documentName: 'Document',
    pageId,
    pageName: store.graph.getNode(pageId)?.name ?? ''
  }
}

function parse<T>(schema: v.GenericSchema<unknown, T>, value: unknown): T {
  const parsed = v.safeParse(schema, value)
  if (!parsed.success) throw new Error('Tool returned an unexpected result')
  return parsed.output
}

describe('select_nodes', () => {
  test('selects that layer for the editor, and the next read returns it', async () => {
    const store = createEditorStore()
    stores.push(store)
    const rect = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Card',
      width: 40,
      height: 20
    })

    const selected = parse(
      selectedSchema,
      await handleTargetCommand(target(store), 'tool', {
        name: 'select_nodes',
        args: { ids: [rect.id] }
      })
    )
    expect(selected.result.selected).toEqual([rect.id])
    expect([...store.state.selectedIds]).toEqual([rect.id])

    const read = parse(
      readSchema,
      await handleTargetCommand(target(store), 'tool', {
        name: 'get_selection',
        args: {}
      })
    )
    expect(read.result.selection.map((node) => node.id)).toEqual([rect.id])
  })

  test('reading the selection leaves the editor selection where it was', async () => {
    const store = createEditorStore()
    stores.push(store)
    const rect = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Card',
      width: 40,
      height: 20
    })
    store.select([rect.id])

    const read = parse(
      readSchema,
      await handleTargetCommand(target(store), 'tool', {
        name: 'get_selection',
        args: {}
      })
    )

    expect([...store.state.selectedIds]).toEqual([rect.id])
    expect(read.result.selection.map((node) => node.id)).toEqual([rect.id])
  })

  test('selecting on a page that is not shown leaves the editor selection', async () => {
    const store = createEditorStore()
    stores.push(store)
    const shown = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Shown',
      width: 10,
      height: 10
    })
    store.select([shown.id])
    const other = store.graph.addPage('Other')
    const hidden = store.graph.createNode('RECTANGLE', other.id, {
      name: 'Hidden',
      width: 10,
      height: 10
    })

    await handleTargetCommand({ ...target(store), pageId: other.id, pageName: 'Other' }, 'tool', {
      name: 'select_nodes',
      args: { ids: [hidden.id] }
    })

    expect([...store.state.selectedIds]).toEqual([shown.id])
  })
})
