import { describe, expect, test } from 'bun:test'

import { effectScope, nextTick, ref } from 'vue'

import {
  EMPTY_DOCUMENT_SELECTION,
  pruneDocumentSelection,
  selectDocument,
  useDocumentSelection
} from '@/app/home/selection'

const ORDER = ['a', 'b', 'c', 'd', 'e']
const ids = (selection: { ids: ReadonlySet<string> }) => [...selection.ids].sort()

describe('picking documents on Home', () => {
  test('Cmd/Ctrl+click adds a document, and again drops it', () => {
    const one = selectDocument(EMPTY_DOCUMENT_SELECTION, ORDER, 'b', 'toggle')
    const two = selectDocument(one, ORDER, 'd', 'toggle')
    expect(ids(two)).toEqual(['b', 'd'])
    expect(ids(selectDocument(two, ORDER, 'b', 'toggle'))).toEqual(['d'])
  })

  test('Shift+click selects the range from the last toggled document, either way', () => {
    const anchored = selectDocument(EMPTY_DOCUMENT_SELECTION, ORDER, 'b', 'toggle')
    expect(ids(selectDocument(anchored, ORDER, 'd', 'range'))).toEqual(['b', 'c', 'd'])
    const backwards = selectDocument(
      selectDocument(EMPTY_DOCUMENT_SELECTION, ORDER, 'd', 'toggle'),
      ORDER,
      'a',
      'range'
    )
    expect(ids(backwards)).toEqual(['a', 'b', 'c', 'd'])
  })

  test('a second Shift+click replaces the range from the same anchor', () => {
    const anchored = selectDocument(EMPTY_DOCUMENT_SELECTION, ORDER, 'c', 'toggle')
    const wide = selectDocument(anchored, ORDER, 'e', 'range')
    expect(ids(selectDocument(wide, ORDER, 'd', 'range'))).toEqual(['c', 'd'])
  })

  test('Shift+click without an anchor selects just that document', () => {
    expect(ids(selectDocument(EMPTY_DOCUMENT_SELECTION, ORDER, 'c', 'range'))).toEqual(['c'])
  })

  test('documents that leave the list leave the selection', () => {
    const selection = selectDocument(
      selectDocument(EMPTY_DOCUMENT_SELECTION, ORDER, 'a', 'toggle'),
      ORDER,
      'c',
      'toggle'
    )
    const pruned = pruneDocumentSelection(selection, ['a', 'b'])
    expect(ids(pruned)).toEqual(['a'])
    expect(pruned.anchor).toBeNull()
    expect(pruneDocumentSelection(pruned, ['a', 'b'])).toBe(pruned)
  })
})

describe('a Home list selection', () => {
  test('follows the list: select all, order, and pruning when documents go', async () => {
    const listed = ref([...ORDER])
    const scope = effectScope()
    const selection = scope.run(() => useDocumentSelection(() => listed.value))
    if (!selection) throw new Error('selection was not created')

    selection.select('d', 'toggle')
    selection.select('b', 'toggle')
    expect(selection.ordered.value).toEqual(['b', 'd'])

    listed.value = ['a', 'b', 'c']
    await nextTick()
    expect(selection.ordered.value).toEqual(['b'])
    expect(selection.count.value).toBe(1)

    selection.selectAll()
    expect(selection.count.value).toBe(3)
    selection.clear()
    expect(selection.has('a')).toBe(false)
    scope.stop()
  })
})
