import { describe, expect, test } from 'bun:test'
import { noop } from 'es-toolkit/function'

import { createEditor, isEmptyDocumentChange, type DocumentChange } from '@open-pencil/core'
import { SceneGraph } from '@open-pencil/scene-graph'

type Editor = ReturnType<typeof createEditor>

function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const card = editor.graph.createNode('FRAME', pageId, { name: 'Card', width: 200, height: 120 })
  const badge = editor.graph.createNode('RECTANGLE', card.id, { name: 'Badge', width: 24 })
  const other = editor.graph.createNode('FRAME', pageId, { name: 'Other', x: 400 })
  const second = editor.graph.addPage('Second')
  const note = editor.graph.createNode('RECTANGLE', second.id, { name: 'Note', x: 10 })
  const collection = editor.graph.createCollection('Tokens')
  const brand = editor.graph.createVariable('Brand', 'FLOAT', collection.id, 4)
  return { editor, pageId, card, badge, other, second, note, collection, brand }
}

/** Every page, the document node, and the variables, as copies. */
function documentState(editor: Editor) {
  const { graph } = editor
  return {
    root: structuredClone(graph.getNode(graph.rootId)),
    pages: graph.getPages().map((page) => editor.snapshotPage(page.id)),
    variables: structuredClone(graph.variables),
    collections: structuredClone(graph.variableCollections)
  }
}

/** Creates, moves, deletes, and edits layers on two pages, and changes variables. */
function structuralEdit(editor: Editor, fixture: ReturnType<typeof setup>) {
  const { graph } = editor
  const { pageId, card, badge, other, second, note, collection, brand } = fixture
  const created = graph.createNode('FRAME', pageId, { name: 'Created' })
  graph.createNode('TEXT', created.id, { name: 'Inside', text: 'Hi' })
  graph.reparentNode(badge.id, other.id)
  graph.updateNode(card.id, { x: 80, name: 'Moved card' })
  graph.deleteNode(note.id)
  graph.createNode('ELLIPSE', second.id, { name: 'Added elsewhere' })
  graph.createVariable('Spacing', 'FLOAT', collection.id, 8)
  graph.removeVariable(brand.id)
}

describe('rollbackOnThrow', () => {
  test('puts back a synchronous edit that throws part way and records no step', () => {
    const fixture = setup()
    const { editor } = fixture
    const before = documentState(editor)
    const recorded: DocumentChange[] = []

    expect(() =>
      editor.recordEdit(
        { label: 'Script', rollbackOnThrow: true, onRecorded: (change) => recorded.push(change) },
        () => {
          structuralEdit(editor, fixture)
          throw new Error('failed part way')
        }
      )
    ).toThrow('failed part way')

    expect(documentState(editor)).toEqual(before)
    expect(editor.undo.canUndo).toBe(false)
    expect(recorded).toHaveLength(1)
    expect(recorded.every(isEmptyDocumentChange)).toBe(true)
  })

  test('puts back an edit that awaits, on every page, and closes it', async () => {
    const fixture = setup()
    const { editor } = fixture
    const before = documentState(editor)

    const edit = editor.recordEditAsync(
      { label: 'Agent: eval', rollbackOnThrow: true },
      async () => {
        await Promise.resolve()
        structuralEdit(editor, fixture)
        await Promise.resolve()
        throw new Error('script failed')
      }
    )

    await expect(edit).rejects.toThrow('script failed')
    expect(editor.undo.isRecording).toBe(false)
    expect(editor.undo.canUndo).toBe(false)
    expect(documentState(editor)).toEqual(before)
  })

  test('keeps the history before the failed edit, so undo still reaches earlier steps', async () => {
    const fixture = setup()
    const { editor, card } = fixture
    editor.recordEdit({ label: 'Rename' }, () => editor.graph.updateNode(card.id, { name: 'A' }))

    await expect(
      editor.recordEditAsync({ label: 'Agent: render', rollbackOnThrow: true }, async () => {
        editor.graph.updateNode(card.id, { name: 'B' })
        throw new Error('render failed')
      })
    ).rejects.toThrow('render failed')

    expect(editor.graph.getNode(card.id)?.name).toBe('A')
    expect(editor.undo.undo()).toBe('Rename')
    expect(editor.graph.getNode(card.id)?.name).toBe('Card')
  })

  test('settles what follows the history once the document is back', async () => {
    const { editor, card } = setup()
    let changes = 0
    editor.onEditorEvent('history:changed', () => changes++)

    await expect(
      editor.recordEditAsync({ label: 'Agent: eval', rollbackOnThrow: true }, async () => {
        editor.graph.updateNode(card.id, { x: 40 })
        throw new Error('failed')
      })
    ).rejects.toThrow('failed')

    expect(changes).toBe(1)
  })

  test('records a step as usual when the edit succeeds', async () => {
    const fixture = setup()
    const { editor } = fixture
    const before = documentState(editor)

    await editor.recordEditAsync({ label: 'Agent: eval', rollbackOnThrow: true }, async () => {
      await Promise.resolve()
      structuralEdit(editor, fixture)
    })

    expect(documentState(editor)).not.toEqual(before)
    expect(editor.undo.undo()).toBe('Agent: eval')
    expect(documentState(editor)).toEqual(before)
  })

  test('leaves no step and changes nothing when an edit that changed nothing throws', () => {
    const { editor } = setup()
    const before = documentState(editor)

    expect(() =>
      editor.recordEdit({ label: 'Read', rollbackOnThrow: true }, () => {
        throw new Error('nothing done')
      })
    ).toThrow('nothing done')

    expect(documentState(editor)).toEqual(before)
    expect(editor.undo.canUndo).toBe(false)
  })

  test('on a large page, writes back only the layers the failed edit touched', async () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const ids: string[] = []
    for (let row = 0; row < 40; row++) {
      const frame = editor.graph.createNode('FRAME', pageId, { name: `Row ${row}`, y: row * 60 })
      ids.push(frame.id)
      for (let column = 0; column < 49; column++) {
        const cell = editor.graph.createNode('RECTANGLE', frame.id, { x: column * 20, width: 16 })
        ids.push(cell.id)
      }
    }
    expect(editor.graph.getChildren(pageId)).toHaveLength(40)
    expect(ids.length).toBe(2000)
    const before = documentState(editor)
    const written = new Set<string>()
    const record = (id: string) => written.add(id)
    const stops: (() => void)[] = []

    await expect(
      editor.recordEditAsync({ label: 'Agent: eval', rollbackOnThrow: true }, async () => {
        const [first, second, third] = ids
        if (!first || !second || !third) throw new Error('missing fixture')
        editor.graph.updateNode(second, { x: 999 })
        editor.graph.deleteNode(third)
        editor.graph.createNode('RECTANGLE', first, { name: 'Extra' })
        await Promise.resolve()
        // Only the rollback writes from here on.
        stops.push(
          editor.onEditorEvent('node:created', (node) => record(node.id)),
          editor.onEditorEvent('node:updated', (id) => record(id)),
          editor.onEditorEvent('node:deleted', (id) => record(id)),
          editor.onEditorEvent('node:reordered', (id) => record(id)),
          editor.onEditorEvent('node:reparented', (id) => record(id))
        )
        throw new Error('failed on a large page')
      })
    ).rejects.toThrow('failed on a large page')
    for (const stop of stops) stop()

    expect(documentState(editor)).toEqual(before)
    // The created layer, the moved one, the deleted one, and their parent: not the 2,000 layers.
    expect(written.size).toBeGreaterThan(0)
    expect(written.size).toBeLessThanOrEqual(8)
  })

  test('keeps a step recorded meanwhile, and records the failed edit instead of rolling back', async () => {
    const { editor, pageId, card } = setup()
    let resume = noop
    const paused = new Promise<void>((resolve) => {
      resume = resolve
    })

    const edit = editor.recordEditAsync(
      { label: 'Agent: eval', rollbackOnThrow: true },
      async () => {
        editor.graph.updateNode(card.id, { x: 40 })
        await paused
        throw new Error('script failed')
      }
    )
    // The person draws and renames while the call waits on fonts or layout.
    const rect = editor.recordEdit({ label: 'User rect' }, () =>
      editor.graph.createNode('RECTANGLE', pageId, { name: 'User rect' })
    )
    editor.recordEdit({ label: 'User rename' }, () =>
      editor.graph.updateNode(card.id, { name: 'Renamed' })
    )
    resume()
    await expect(edit).rejects.toThrow('script failed')

    // The person's work stays, and undo walks back through the failed edit and theirs.
    expect(editor.graph.getNode(rect.id)?.name).toBe('User rect')
    expect(editor.graph.getNode(card.id)?.name).toBe('Renamed')
    expect(editor.graph.getNode(card.id)?.x).toBe(40)
    expect(editor.undo.undo()).toBe('Agent: eval')
    expect(editor.undo.undo()).toBe('User rename')
    expect(editor.graph.getNode(card.id)?.name).toBe('Card')
    expect(editor.undo.undo()).toBe('User rect')
    expect(editor.graph.getNode(rect.id)).toBeUndefined()
    expect(editor.graph.getNode(card.id)?.x).toBe(0)
  })

  test('records the failed edit when another edit that awaits shares its run', async () => {
    const { editor, card, other } = setup()
    let resume = noop
    const paused = new Promise<void>((resolve) => {
      resume = resolve
    })

    const failing = editor.recordEditAsync(
      { label: 'Agent: eval', rollbackOnThrow: true },
      async () => {
        editor.graph.updateNode(card.id, { x: 40 })
        await paused
        throw new Error('script failed')
      }
    )
    const running = editor.recordEditAsync({ label: 'Agent: render' }, async () => {
      editor.graph.updateNode(other.id, { name: 'Other agent' })
      await paused
    })
    resume()
    await expect(failing).rejects.toThrow('script failed')
    await running

    expect(editor.graph.getNode(other.id)?.name).toBe('Other agent')
    expect(editor.graph.getNode(card.id)?.x).toBe(40)
    expect(editor.undo.isRecording).toBe(false)
  })

  test('records the failed edit when the caller saw writes outside the history', async () => {
    const { editor, card } = setup()
    const recorded: DocumentChange[] = []

    await expect(
      editor.recordEditAsync(
        {
          label: 'Agent: eval',
          rollbackOnThrow: true,
          canRollBack: () => false,
          onRecorded: (change) => recorded.push(change)
        },
        async () => {
          editor.graph.updateNode(card.id, { x: 40 })
          throw new Error('script failed')
        }
      )
    ).rejects.toThrow('script failed')

    expect(editor.graph.getNode(card.id)?.x).toBe(40)
    expect(editor.undo.undo()).toBe('Agent: eval')
    expect(editor.graph.getNode(card.id)?.x).toBe(0)
    expect(recorded.some(isEmptyDocumentChange)).toBe(false)
  })

  test('keeps the selection the failed edit left alone, and drops layers it created', async () => {
    const { editor, pageId, card, other } = setup()
    editor.select([card.id, other.id])
    let created = ''

    await expect(
      editor.recordEditAsync({ label: 'Agent: eval', rollbackOnThrow: true }, async () => {
        const extra = editor.graph.createNode('RECTANGLE', pageId, { name: 'Extra' })
        created = extra.id
        editor.select([card.id, other.id, extra.id])
        editor.graph.updateNode(card.id, { x: 40 })
        throw new Error('script failed')
      })
    ).rejects.toThrow('script failed')

    expect(editor.graph.getNode(created)).toBeUndefined()
    expect([...editor.state.selectedIds]).toEqual([card.id, other.id])
  })

  test('puts back the graph it ran in when the document was replaced meanwhile', async () => {
    const fixture = setup()
    const { editor, card, pageId } = fixture
    const original = editor.graph
    const before = documentState(editor)
    editor.recordEdit({ label: 'Rename' }, () => editor.graph.updateNode(card.id, { name: 'A' }))
    const renamed = documentState(editor)
    let changes = 0
    editor.onEditorEvent('history:changed', () => changes++)
    const recorded: DocumentChange[] = []
    const replacement = new SceneGraph()
    const replacementPage = replacement.getPages()[0]
    if (!replacementPage) throw new Error('missing page')
    replacement.createNode('FRAME', replacementPage.id, { name: 'Opened' })
    const opened = structuredClone(replacement.getChildren(replacementPage.id))

    await expect(
      editor.recordEditAsync(
        {
          label: 'Agent: eval',
          rollbackOnThrow: true,
          onRecorded: (change) => recorded.push(change)
        },
        async () => {
          structuralEdit(editor, fixture)
          await Promise.resolve()
          editor.replaceGraph(replacement)
          throw new Error('script failed')
        }
      )
    ).rejects.toThrow('script failed')

    expect(editor.graph).toBe(replacement)
    expect(replacement.getChildren(replacementPage.id)).toEqual(opened)
    // The rollback fires nothing for the document on screen and records no step.
    expect(changes).toBe(0)
    expect(editor.undo.undoLabel).toBe('Rename')
    expect(recorded.every(isEmptyDocumentChange)).toBe(true)
    editor.replaceGraph(original)
    expect(documentState(editor)).toEqual(renamed)
    expect(renamed).not.toEqual(before)
    expect(editor.graph.getNode(pageId)).toBeDefined()
  })

  test('records the edit as one step when the rollback itself fails', async () => {
    const { editor, card } = setup()
    const recorded: DocumentChange[] = []
    const restore = editor.graph.restoreNodeProperties.bind(editor.graph)
    let failures = 0

    await expect(
      editor.recordEditAsync(
        {
          label: 'Agent: eval',
          rollbackOnThrow: true,
          onRecorded: (change) => recorded.push(change)
        },
        async () => {
          editor.graph.updateNode(card.id, { x: 40, name: 'Moved' })
          // The rollback is the first to restore a layer's properties, and it fails once.
          editor.graph.restoreNodeProperties = (...args) => {
            if (failures++ === 0) throw new Error('restore failed')
            return restore(...args)
          }
          throw new Error('script failed')
        }
      )
    ).rejects.toThrow('script failed')

    expect(failures).toBe(1)
    expect(recorded).toHaveLength(1)
    expect(recorded.some(isEmptyDocumentChange)).toBe(false)
    expect(editor.undo.undoLabel).toBe('Agent: eval')
    expect(editor.undo.undo()).toBe('Agent: eval')
    expect(editor.graph.getNode(card.id)?.x).toBe(0)
    expect(editor.graph.getNode(card.id)?.name).toBe('Card')
  })
})
