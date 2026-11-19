import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

function setup() {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const card = editor.graph.createNode('RECTANGLE', pageId, {
    name: 'Card',
    x: 0,
    y: 0,
    width: 100,
    height: 50
  })
  return { editor, pageId, card }
}

describe('an async edit that waits', () => {
  test('leaves a user edit made during a marked wait out of its step', async () => {
    const { editor, card } = setup()
    const wait = Promise.withResolvers<undefined>()

    const edit = editor.recordEditAsync({ label: 'Agent: render' }, async () => {
      editor.graph.updateNode(card.id, { width: 120 })
      await editor.graph.waitOutsideEdit(wait.promise)
      editor.graph.updateNode(card.id, { x: 40 })
    })
    // The user renames while the agent waits on its font load.
    editor.recordEdit({ label: 'Rename' }, () =>
      editor.graph.updateNode(card.id, { name: 'Renamed', y: 8 })
    )
    wait.resolve(undefined)
    await edit

    expect(editor.undo.undo()).toBe('Agent: render')
    expect(editor.graph.getNode(card.id)).toMatchObject({
      x: 0,
      y: 8,
      width: 100,
      name: 'Renamed'
    })
    expect(editor.undo.undo()).toBe('Rename')
    expect(editor.graph.getNode(card.id)).toMatchObject({ y: 0, name: 'Card' })
  })

  test('leaves a user edit made during an unmarked await out of its step', async () => {
    const { editor, card } = setup()
    const wait = Promise.withResolvers<undefined>()

    const edit = editor.recordEditAsync({ label: 'Agent: arrange' }, async () => {
      editor.graph.updateNode(card.id, { width: 120 })
      await wait.promise
      editor.graph.updateNode(card.id, { x: 40 })
    })
    await Promise.resolve()
    editor.recordEdit({ label: 'Rename' }, () =>
      editor.graph.updateNode(card.id, { name: 'Renamed', y: 8 })
    )
    wait.resolve(undefined)
    await edit

    expect(editor.undo.undo()).toBe('Agent: arrange')
    expect(editor.graph.getNode(card.id)).toMatchObject({
      x: 0,
      y: 8,
      width: 100,
      name: 'Renamed'
    })
    expect(editor.undo.undo()).toBe('Rename')
    expect(editor.graph.getNode(card.id)).toMatchObject({ y: 0, name: 'Card' })
  })

  test('redo reapplies only the agent change and keeps the user step', async () => {
    const { editor, card } = setup()
    const wait = Promise.withResolvers<undefined>()

    const edit = editor.recordEditAsync({ label: 'Agent: arrange' }, async () => {
      editor.graph.updateNode(card.id, { x: 40 })
      await wait.promise
      editor.graph.updateNode(card.id, { width: 120 })
    })
    await Promise.resolve()
    editor.recordEdit({ label: 'Rename' }, () =>
      editor.graph.updateNode(card.id, { name: 'Renamed' })
    )
    wait.resolve(undefined)
    await edit

    expect(editor.undo.undo()).toBe('Agent: arrange')
    expect(editor.graph.getNode(card.id)).toMatchObject({ x: 0, width: 100, name: 'Renamed' })

    expect(editor.undo.redo()).toBe('Agent: arrange')
    expect(editor.graph.getNode(card.id)).toMatchObject({ x: 40, width: 120, name: 'Renamed' })

    expect(editor.undo.undo()).toBe('Agent: arrange')
    expect(editor.undo.undo()).toBe('Rename')
    expect(editor.graph.getNode(card.id)?.name).toBe('Card')
  })

  test('leaves a user edit on another page out of its step', async () => {
    const { editor } = setup()
    const otherPage = editor.graph.addPage('Other')
    const note = editor.graph.createNode('RECTANGLE', otherPage.id, {
      name: 'Note',
      x: 0,
      width: 20,
      height: 20
    })
    const wait = Promise.withResolvers<undefined>()

    const edit = editor.recordEditAsync({ label: 'Agent: tokens' }, async () => {
      await wait.promise
    })
    await Promise.resolve()
    editor.recordEdit({ label: 'Move note' }, () =>
      editor.graph.updateNode(note.id, { x: 30 })
    )
    wait.resolve(undefined)
    await edit

    expect(editor.undo.undo()).toBe('Move note')
    expect(editor.graph.getNode(note.id)?.x).toBe(0)
  })
})

test('records an agent edit on another page, as MCP does', async () => {
  const { editor } = setup()
  const otherPage = editor.graph.addPage('Other')
  const note = editor.graph.createNode('RECTANGLE', otherPage.id, {
    name: 'Note',
    x: 0,
    width: 20,
    height: 20
  })
  editor.recordEditAsync({ label: 'Agent: tokens', pageId: otherPage.id }, async () => {
    await Promise.resolve()
    editor.graph.updateNode(note.id, { x: 30 })
  })
  await Promise.resolve()
  await Promise.resolve()

  expect(editor.undo.undo()).toBe('Agent: tokens')
  expect(editor.graph.getNode(note.id)?.x).toBe(0)
})

test('leaves a user batch drag during a marked wait out of the agent step', async () => {
  const { editor, card } = setup()
  const wait = Promise.withResolvers<undefined>()
  const edit = editor.recordEditAsync({ label: 'Agent: render' }, async () => {
    editor.graph.updateNode(card.id, { width: 120 })
    await editor.graph.waitOutsideEdit(wait.promise)
  })
  const before = { name: card.name, y: card.y }
  editor.undo.runBatch('Drag', () => {
    editor.graph.updateNode(card.id, { name: 'Dragged', y: 6 })
    editor.undo.push({
      label: 'Drag',
      forward: () => editor.graph.updateNode(card.id, { name: 'Dragged', y: 6 }),
      inverse: () => editor.graph.updateNode(card.id, { ...before })
    })
  })
  wait.resolve(undefined)
  await edit

  expect(editor.undo.undo()).toBe('Agent: render')
  expect(editor.graph.getNode(card.id)).toMatchObject({
    width: 100,
    name: 'Dragged',
    y: 6
  })
  expect(editor.undo.undo()).toBe('Drag')
})

test('does not bring back a layer someone deleted during a marked wait', async () => {
  const { editor, pageId, card } = setup()
  const doomed = editor.graph.createNode('RECTANGLE', pageId, { name: 'Doomed', x: 0 })
  const wait = Promise.withResolvers<undefined>()
  const edit = editor.recordEditAsync({ label: 'Agent: render' }, async () => {
    editor.graph.updateNode(card.id, { width: 120 })
    await editor.graph.waitOutsideEdit(wait.promise)
    editor.graph.updateNode(card.id, { x: 40 })
  })
  editor.recordEdit({ label: 'Delete' }, () => editor.graph.deleteNode(doomed.id))
  wait.resolve(undefined)
  await edit

  expect(editor.undo.undo()).toBe('Agent: render')
  expect(editor.graph.getNode(doomed.id)).toBeUndefined()
  expect(editor.graph.getNode(card.id)).toMatchObject({ width: 100, x: 0 })
})
