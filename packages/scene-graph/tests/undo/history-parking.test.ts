import { expect, test } from 'bun:test'

import { UndoManager } from '@pairdraw/scene-graph/undo'

test('a taken history leaves the manager empty and comes back with its steps', () => {
  const undo = new UndoManager()
  const noop = () => undefined
  undo.push({ label: 'Rename', forward: noop, inverse: noop })
  undo.undo()

  const parked = undo.takeHistory()
  expect(undo.canUndo).toBe(false)
  expect(undo.canRedo).toBe(false)
  expect(undo.undoLabel).toBeNull()

  undo.adoptHistory(parked)
  expect(undo.undoLabel).toBeNull()
  expect(undo.canRedo).toBe(true)
  expect(undo.redo()).toBe('Rename')
  expect(undo.undoLabel).toBe('Rename')
})

test('adopting no history starts the manager empty', () => {
  const undo = new UndoManager()
  const noop = () => undefined
  undo.push({ label: 'Rename', forward: noop, inverse: noop })

  undo.adoptHistory(undefined)

  expect(undo.undoLabel).toBeNull()
  expect(undo.canUndo).toBe(false)
  expect(undo.undo()).toBeNull()
})
