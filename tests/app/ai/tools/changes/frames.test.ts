import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, test } from 'bun:test'

import { toRaw } from 'vue'

import { turnRenders } from '@/app/ai/chat/preferences'
import { currentRun } from '@/app/ai/reply/run'
import { noteTurnFrame, takeTurnFrames } from '@/app/ai/tools/changes/frames'
import { createEditorStore } from '@/app/editor/session/create'
import { appPreferences } from '@/app/settings/preferences/store'

type EditorStore = ReturnType<typeof createEditorStore>

let store: EditorStore
let pageId: string
let previousPreferences: typeof appPreferences.value

beforeEach(() => {
  previousPreferences = structuredClone(toRaw(appPreferences.value))
  store = createEditorStore()
  pageId = store.state.currentPageId
})

afterEach(() => {
  appPreferences.value = previousPreferences
  store.dispose()
})

function frame(name: string, children = 0) {
  const node = store.graph.createNode('FRAME', pageId, { name, width: 900, height: 600 })
  for (let index = 0; index < children; index++) {
    store.graph.createNode('RECTANGLE', node.id, { name: `child-${index}`, width: 10, height: 10 })
  }
  return node
}

/** The turn's frames once it ends, from the run the test started. */
function take() {
  return takeTurnFrames(store, currentRun(store))
}

test('keeps the first three frames in touch order and counts the rest', () => {
  const frames = ['One', 'Two', 'Three', 'Four', 'Five'].map((name) => frame(name))
  for (const node of frames) noteTurnFrame(store, pageId, store.graph, store.graph, node.id)

  const capture = take()

  expect(capture.frames.map((entry) => entry.name)).toEqual(['One', 'Two', 'Three'])
  expect(capture.changed).toBe(5)
})

test('empties the capture once the turn takes its frames', () => {
  const node = frame('Hero')
  noteTurnFrame(store, pageId, store.graph, store.graph, node.id)

  expect(take().frames).toHaveLength(1)
  expect(take()).toEqual({ frames: [], changed: 0 })
})

test('skips a frame too large to render but still counts it', () => {
  const huge = frame('Huge', 1501)
  const small = frame('Small')
  noteTurnFrame(store, pageId, store.graph, store.graph, huge.id)
  noteTurnFrame(store, pageId, store.graph, store.graph, small.id)

  const capture = take()

  expect(capture.frames.map((entry) => entry.name)).toEqual(['Small'])
  expect(capture.changed).toBe(2)
})

test('names each frame as the turn left it', () => {
  const node = frame('Draft')
  noteTurnFrame(store, pageId, store.graph, store.graph, node.id)
  store.graph.updateNode(node.id, { name: 'Final' })

  expect(take().frames[0]?.name).toBe('Final')
})

test('captures nothing while the setting is off', () => {
  turnRenders.value = false
  const node = frame('Hero')
  noteTurnFrame(store, pageId, store.graph, store.graph, node.id)

  expect(take()).toEqual({ frames: [], changed: 0 })
})

test('leaves out a frame nested in another frame', () => {
  const parent = frame('Parent')
  const child = store.graph.createNode('FRAME', parent.id, { name: 'Nested', width: 300 })
  noteTurnFrame(store, pageId, store.graph, store.graph, child.id)

  expect(take()).toEqual({ frames: [], changed: 0 })
})
