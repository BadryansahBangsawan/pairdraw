import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test'

import { promiseTimeout } from '@vueuse/core'

import { SceneGraph } from '@pairdraw/scene-graph'

import { startRun } from '@/app/ai/tools'
import * as images from '@/app/ai/tools/changes/images'
import {
  CHANGE_PREVIEW_PAUSE_MS,
  changePreviewsDrained,
  queueChangePreview
} from '@/app/ai/tools/changes/previews'
import { clearToolChanges, readToolChange, setToolChange } from '@/app/ai/tools/changes/store'
import type { ToolChange, ToolChangeImages } from '@/app/ai/tools/changes/types'
import { createEditorStore } from '@/app/editor/session/create'

type EditorStore = ReturnType<typeof createEditorStore>

let store: EditorStore
let open = true
let render: ReturnType<typeof spyOn<typeof images, 'renderToolChangeImages'>>
let rendering = 0
let mostAtOnce = 0

const IMAGES: ToolChangeImages = {
  before: null,
  after: null,
  highlight: null,
  width: 10,
  height: 10,
  changedRatio: 0.5
}

beforeEach(() => {
  store = createEditorStore()
  open = true
  rendering = 0
  mostAtOnce = 0
  render = spyOn(images, 'renderToolChangeImages').mockImplementation(async () => {
    mostAtOnce = Math.max(mostAtOnce, ++rendering)
    await promiseTimeout(1)
    rendering--
    return IMAGES
  })
})

afterEach(() => {
  render.mockRestore()
  clearToolChanges()
  if (open) store.dispose()
})

function recorded(toolCallId: string): ToolChange {
  const change: ToolChange = {
    toolCallId,
    pageId: store.state.currentPageId,
    nodeIds: [],
    jsx: { before: '', after: '<Frame />' }
  }
  setToolChange(change)
  return change
}

function queue(change: ToolChange) {
  const graph = new SceneGraph()
  queueChangePreview(store, change, {
    beforeGraph: graph,
    afterGraph: graph,
    pageId: change.pageId,
    bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    size: 'small'
  })
}

test('renders previews one at a time, only once no call of the reply is editing', async () => {
  const run = startRun(store, 10)
  run.beginTool()
  queue(recorded('first'))
  queue(recorded('second'))

  await promiseTimeout(CHANGE_PREVIEW_PAUSE_MS * 3)
  expect(render).not.toHaveBeenCalled()
  expect(readToolChange('first')?.images).toBeUndefined()

  run.endTool()
  await changePreviewsDrained(store)
  expect(render).toHaveBeenCalledTimes(2)
  expect(mostAtOnce).toBe(1)
  expect(readToolChange('first')?.images).toEqual(IMAGES)
  expect(readToolChange('second')?.images).toEqual(IMAGES)
})

test('drops the previews still waiting when the document closes', async () => {
  const run = startRun(store, 10)
  run.beginTool()
  queue(recorded('pending'))
  const drained = changePreviewsDrained(store)

  store.dispose()
  open = false
  run.endTool()
  await drained
  expect(render).not.toHaveBeenCalled()
  expect(readToolChange('pending')?.images).toBeUndefined()
})
