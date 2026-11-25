import 'fake-indexeddb/auto'
import { afterEach, expect, test } from 'bun:test'

import { computed, ref } from 'vue'

import { useComments } from '@/app/comments/use'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session/create'
import { createKeyboardActions } from '@/app/shell/keyboard/actions'

import { asDouble } from '#tests/helpers/doubles'

const stores: ReturnType<typeof createEditorStore>[] = []

afterEach(() => {
  for (const store of stores.splice(0)) store.dispose()
})

/** The active document, in the Comment tool as a person has it while drawing. */
function commentTool(): ReturnType<typeof createEditorStore> {
  const store = createEditorStore()
  stores.push(store)
  setActiveEditorStore(store)
  store.setTool('COMMENT')
  return store
}

/** The editor's Escape, with only the pieces the action reaches for. */
function escape(store: ReturnType<typeof createEditorStore>) {
  return createKeyboardActions({
    store,
    chatColumnOpen: ref(false),
    isMobile: computed(() => false),
    runCommand: asDouble<() => void>(() => undefined),
    setOpacityTarget: asDouble<() => void>(() => undefined)
  }).escapeOrDeselect()
}

test('Escape while a stroke is being drawn takes back only the stroke and keeps the tool', () => {
  const store = commentTool()
  const comments = useComments()
  comments.stroke.value = {
    pointerId: 1,
    points: [
      { x: 10, y: 10 },
      { x: 40, y: 20 }
    ],
    start: { x: 10, y: 10 },
    startScreen: { x: 10, y: 10 }
  }

  escape(store)

  expect(comments.stroke.value).toBeNull()
  // Nothing reached the document: no draft, no thread, and its region never made.
  expect(comments.draft.value).toBeNull()
  expect(comments.threads.value).toEqual([])
  expect(store.state.activeTool).toBe('COMMENT')
})

test('Escape with no stroke to take back still leaves the Comment tool', () => {
  const store = commentTool()

  escape(store)

  expect(store.state.activeTool).toBe('SELECT')
})
